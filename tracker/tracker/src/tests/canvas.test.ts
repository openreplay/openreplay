// @ts-nocheck
import { describe, expect, test, jest, beforeEach, afterEach, beforeAll } from '@jest/globals'
import CanvasRecorder, { watchCanvasContexts } from '../main/app/canvas'
import { Type } from '../main/app/messages.gen.js'
import App from '../main/app/index.js'

describe('CanvasRecorder', () => {
  let appMock: jest.Mocked<App>
  let canvasRecorder: CanvasRecorder
  let nodeMock: HTMLCanvasElement
  let webpProbe: jest.SpiedFunction<HTMLCanvasElement['toDataURL']>
  const originalIO = window.IntersectionObserver
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    // @ts-ignore
    appMock = {}
    appMock.nodes = {
      scanTree: jest.fn(),
      attachNodeCallback: jest.fn(),
      getID: jest.fn().mockReturnValue(1),
      getNode: jest.fn(),
    }
    appMock.sanitizer = {
      isObscured: jest.fn().mockReturnValue(false),
      isHidden: jest.fn().mockReturnValue(false),
    }
    appMock.attachResanitizeCallback = jest.fn()
    appMock.timestamp = jest.fn().mockReturnValue(1000)
    appMock.send = jest.fn()
    appMock.debug = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    }
    appMock.session = {
      getSessionToken: jest.fn().mockReturnValue('token'),
    }
    appMock.options = {
      ingestPoint: 'http://example.com',
    }

    webpProbe = jest
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/webp;base64,')
    canvasRecorder = new CanvasRecorder(appMock, { fps: 10, quality: 'medium' })
    nodeMock = document.createElement('canvas')
    nodeMock.toBlob = jest.fn((cb: (b: Blob | null) => void) => cb(new Blob(['img'])))
    globalThis.fetch = jest.fn(() => Promise.resolve({ status: 200 }))
  })

  afterEach(() => {
    canvasRecorder.clear()
    nodeMock.remove()
    window.IntersectionObserver = originalIO
    globalThis.fetch = originalFetch
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  describe('startTracking', () => {
    test('scans tree and attaches callbacks only after the delay', () => {
      jest.useFakeTimers()
      canvasRecorder.startTracking()
      jest.advanceTimersByTime(100)
      expect(appMock.nodes.scanTree).not.toHaveBeenCalled()
      jest.advanceTimersByTime(25)
      expect(appMock.nodes.scanTree).toHaveBeenCalledWith(canvasRecorder.captureCanvas)
      expect(appMock.nodes.attachNodeCallback).toHaveBeenCalledWith(canvasRecorder.captureCanvas)
      expect(appMock.attachResanitizeCallback).toHaveBeenCalledWith(canvasRecorder.resanitizeCanvas)
    })
  })

  describe('captureCanvas', () => {
    let observeMock: jest.Mock
    beforeEach(() => {
      observeMock = jest.fn()
      window.IntersectionObserver = jest.fn().mockImplementation(() => ({
        observe: observeMock,
        disconnect: jest.fn(),
      }))
    })

    test('captures canvas and starts observing it', () => {
      canvasRecorder.captureCanvas(nodeMock)
      expect(observeMock).toHaveBeenCalledWith(nodeMock)
    })

    test('does not capture canvas if it is obscured', () => {
      appMock.sanitizer.isObscured.mockReturnValue(true)
      canvasRecorder.captureCanvas(nodeMock)
      expect(observeMock).not.toHaveBeenCalled()
    })

    test('ignores non-canvas nodes', () => {
      canvasRecorder.captureCanvas(document.createElement('div'))
      expect(observeMock).not.toHaveBeenCalled()
    })
  })

  describe('recordCanvas', () => {
    test('sends CanvasNode synchronously and uploads a batch of 10 snapshots via fetch', () => {
      jest.useFakeTimers()
      document.body.appendChild(nodeMock)
      canvasRecorder.recordCanvas(nodeMock, 1)

      expect(appMock.send).toHaveBeenCalledTimes(1)
      expect(appMock.send).toHaveBeenCalledWith([Type.CanvasNode, '1', 1000])

      jest.advanceTimersByTime(100 * 9)
      expect(nodeMock.toBlob).toHaveBeenCalledTimes(9)
      expect(globalThis.fetch).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)
      expect(nodeMock.toBlob).toHaveBeenCalledTimes(10)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0]
      expect(url).toBe('http://example.com/v1/web/images')
      expect(init.method).toBe('POST')
      expect(init.headers.Authorization).toBe('Bearer token')
      const files = (init.body as FormData).getAll('snapshot') as File[]
      expect(files).toHaveLength(10)
      expect(files[0].name).toBe('1000_1_1000.webp')
      expect(appMock.send).toHaveBeenCalledTimes(1)
    })

    test('sends pending frames when the canvas is removed', () => {
      jest.useFakeTimers()
      document.body.appendChild(nodeMock)
      canvasRecorder.recordCanvas(nodeMock, 1)
      jest.advanceTimersByTime(300)
      nodeMock.remove()
      jest.advanceTimersByTime(100)
      expect(canvasRecorder['snapshots'][1]).toBeUndefined()
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      const body = (globalThis.fetch as jest.Mock).mock.calls[0][1].body as FormData
      expect(body.getAll('snapshot')).toHaveLength(3)
    })

    test('stops capturing once the canvas leaves the document', () => {
      jest.useFakeTimers()
      canvasRecorder.recordCanvas(nodeMock, 1)
      jest.advanceTimersByTime(300)
      expect(nodeMock.toBlob).not.toHaveBeenCalled()
      expect(canvasRecorder['snapshots'][1]).toBeUndefined()
      expect(canvasRecorder['timer']).toBeNull()
    })
  })

  describe('clear', () => {
    test('clears the recording interval, flushes pending images and drops snapshots', () => {
      jest.useFakeTimers()
      const clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval')
      document.body.appendChild(nodeMock)
      canvasRecorder.recordCanvas(nodeMock, 1)
      const interval = canvasRecorder['timer']
      jest.advanceTimersByTime(300)
      expect(nodeMock.toBlob).toHaveBeenCalledTimes(3)

      canvasRecorder.clear()

      expect(clearIntervalSpy).toHaveBeenCalledWith(interval)
      expect(canvasRecorder['snapshots']).toEqual({})
      expect(canvasRecorder['timer']).toBeNull()
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      const body = (globalThis.fetch as jest.Mock).mock.calls[0][1].body as FormData
      expect(body.getAll('snapshot')).toHaveLength(3)

      jest.advanceTimersByTime(1000)
      expect(nodeMock.toBlob).toHaveBeenCalledTimes(3)
    })
  })
  describe('main-thread capture', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      document.body.appendChild(nodeMock)
    })

    test('fixedScaling captures the full canvas when the helper canvas has no 2d context', () => {
      canvasRecorder = new CanvasRecorder(appMock, { fps: 10, quality: 'medium', fixedScaling: true })
      jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
      canvasRecorder.recordCanvas(nodeMock, 1)
      jest.advanceTimersByTime(300)
      expect(nodeMock.toBlob).toHaveBeenCalledTimes(3)
    })

    test('fixedScaling draws a CSS-pixel copy and encodes that', () => {
      const dpr = window.devicePixelRatio
      window.devicePixelRatio = 2
      const drawImage = jest.fn()
      jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as any)
      const dummyToBlob = jest
        .spyOn(HTMLCanvasElement.prototype, 'toBlob')
        .mockImplementation((cb: BlobCallback) => cb(new Blob(['img'])))
      canvasRecorder = new CanvasRecorder(appMock, { fps: 10, quality: 'medium', fixedScaling: true })
      canvasRecorder.recordCanvas(nodeMock, 1)
      jest.advanceTimersByTime(100)
      window.devicePixelRatio = dpr
      expect(drawImage).toHaveBeenCalledWith(nodeMock, 0, 0, 150, 75)
      expect(nodeMock.toBlob).not.toHaveBeenCalled()
      expect(dummyToBlob).toHaveBeenCalledTimes(1)
    })

    test('without a webp encoder, encodes jpeg over the color behind the canvas', () => {
      webpProbe.mockReturnValue('data:image/png;base64,')
      document.body.style.backgroundColor = 'rgb(10, 20, 30)'
      const ctx = { fillRect: jest.fn(), drawImage: jest.fn(), fillStyle: '' }
      const fills: string[] = []
      ctx.fillRect.mockImplementation(() => fills.push(ctx.fillStyle))
      jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as any)
      const dummyToBlob = jest
        .spyOn(HTMLCanvasElement.prototype, 'toBlob')
        .mockImplementation((cb: BlobCallback) => cb(new Blob(['img'])))
      canvasRecorder = new CanvasRecorder(appMock, { fps: 10, quality: 'medium' })
      canvasRecorder.recordCanvas(nodeMock, 1)
      jest.advanceTimersByTime(100)
      document.body.style.backgroundColor = ''
      expect(fills).toEqual(['#fff', 'rgb(10, 20, 30)'])
      expect(ctx.drawImage).toHaveBeenCalledWith(nodeMock, 0, 0, 300, 150)
      expect(nodeMock.toBlob).not.toHaveBeenCalled()
      expect(dummyToBlob.mock.calls[0].slice(1)).toEqual(['image/jpeg', 0.55])
    })

    test('stops a tainted canvas instead of throwing on every tick', () => {
      nodeMock.toBlob = jest.fn(() => {
        throw new DOMException('tainted', 'SecurityError')
      })
      canvasRecorder.recordCanvas(nodeMock, 1)
      jest.advanceTimersByTime(300)
      expect(nodeMock.toBlob).toHaveBeenCalledTimes(1)
      expect(canvasRecorder['snapshots'][1]).toBeUndefined()
      expect(canvasRecorder['timer']).toBeNull()
    })

    test('skips an empty canvas until it gets a size', () => {
      nodeMock.width = 0
      canvasRecorder.recordCanvas(nodeMock, 1)
      jest.advanceTimersByTime(300)
      expect(nodeMock.toBlob).not.toHaveBeenCalled()
      nodeMock.width = 300
      jest.advanceTimersByTime(100)
      expect(nodeMock.toBlob).toHaveBeenCalledTimes(1)
    })

    test('does not capture while the document is hidden', () => {
      const hidden = jest.spyOn(document, 'hidden', 'get').mockReturnValue(true)
      canvasRecorder.recordCanvas(nodeMock, 1)
      jest.advanceTimersByTime(300)
      expect(nodeMock.toBlob).not.toHaveBeenCalled()
      hidden.mockReturnValue(false)
      jest.advanceTimersByTime(100)
      expect(nodeMock.toBlob).toHaveBeenCalledTimes(1)
    })

    test('backs off while captures block the main thread and recovers when they are cheap', () => {
      let now = 0
      let cost = 40
      jest.spyOn(performance, 'now').mockImplementation(() => now)
      nodeMock.toBlob = jest.fn((cb: BlobCallback) => {
        now += cost
        cb(new Blob(['img']))
      })
      canvasRecorder.recordCanvas(nodeMock, 1)
      // stride 1 -> 2 -> 4 -> 8: ticks 1, 2, 4, 8
      jest.advanceTimersByTime(1500)
      expect(nodeMock.toBlob).toHaveBeenCalledTimes(4)
      expect(canvasRecorder['snapshots'][1].stride).toBe(8)

      cost = 0
      // stride 8 -> 4 -> 2 -> 1: ticks 16, 20, 22
      jest.advanceTimersByTime(700)
      expect(nodeMock.toBlob).toHaveBeenCalledTimes(7)
      jest.advanceTimersByTime(300)
      expect(nodeMock.toBlob).toHaveBeenCalledTimes(10)
    })

    test('clear disconnects observers of canvases that never became visible', () => {
      const disconnect = jest.fn()
      window.IntersectionObserver = jest.fn().mockImplementation(() => ({
        observe: jest.fn(),
        disconnect,
      }))
      canvasRecorder.captureCanvas(nodeMock)
      canvasRecorder.clear()
      expect(disconnect).toHaveBeenCalledTimes(1)
      expect(canvasRecorder['observers'].size).toBe(0)
    })

    test('packs frames when the backend supports them', async () => {
      // jsdom's Blob has no arrayBuffer()
      nodeMock.toBlob = jest.fn((cb: BlobCallback) => {
        const blob = new Blob(['img'])
        blob.arrayBuffer = () => Promise.resolve(Uint8Array.from([105, 109, 103]).buffer)
        cb(blob)
      })
      canvasRecorder = new CanvasRecorder(appMock, { fps: 10, quality: 'medium', framesSupport: true })
      canvasRecorder.recordCanvas(nodeMock, 1)
      jest.advanceTimersByTime(1000)
      for (let i = 0; i < 20; i++) await Promise.resolve()
      expect(appMock.debug.error).not.toHaveBeenCalled()
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      const body = (globalThis.fetch as jest.Mock).mock.calls[0][1].body as FormData
      expect(body.get('type')).toBe('frames')
      const file = body.get('frames') as File
      expect(file.name).toBe('1000_1.webp.frames')
      // 10 × ([u64 ts][u32 size]['img'])
      expect(file.size).toBe(10 * (12 + 3))
    })
  })

  describe('worker capture', () => {
    let Recorder: typeof CanvasRecorder
    let workers: any[]
    let bitmap: { close: jest.Mock }
    const saved: Record<string, any> = {}
    const globalsToMock = ['CANVAS_WORKER_BODY', 'Worker', 'OffscreenCanvas', 'createImageBitmap']

    beforeEach(() => {
      jest.useFakeTimers()
      document.body.appendChild(nodeMock)
      globalsToMock.forEach((k) => (saved[k] = (globalThis as any)[k]))
      saved.createObjectURL = URL.createObjectURL
      workers = []
      bitmap = { close: jest.fn() }
      Object.assign(globalThis, {
        CANVAS_WORKER_BODY: 'worker body',
        Worker: class {
          postMessage = jest.fn()
          terminate = jest.fn()
          onmessage: ((e: any) => void) | null = null
          onerror: ((e: any) => void) | null = null
          constructor() {
            workers.push(this)
          }
        },
        OffscreenCanvas: class {
          convertToBlob() {}
        },
        createImageBitmap: jest.fn(() => Promise.resolve(bitmap)),
      })
      URL.createObjectURL = jest.fn(() => 'blob:worker')
      jest.isolateModules(() => {
        Recorder = require('../main/app/canvas').default
      })
      canvasRecorder.clear()
      canvasRecorder = new Recorder(appMock, { fps: 10, quality: 'low' })
    })

    afterEach(() => {
      globalsToMock.forEach((k) => ((globalThis as any)[k] = saved[k]))
      URL.createObjectURL = saved.createObjectURL
    })

    const frameMessages = () =>
      workers[0].postMessage.mock.calls.filter(([m]: any[]) => m.type === 'frame')
    const reply = (data: any) => workers[0].onmessage({ data })

    test('transfers bitmaps to the worker instead of encoding on the main thread', async () => {
      canvasRecorder.recordCanvas(nodeMock, 1)
      await jest.advanceTimersByTimeAsync(100)
      expect(nodeMock.toBlob).not.toHaveBeenCalled()
      expect(workers).toHaveLength(1)
      expect(frameMessages()).toHaveLength(1)
      const [msg, transfer] = frameMessages()[0]
      expect(msg).toMatchObject({
        type: 'frame',
        canvasId: 1,
        createdAt: 1000,
        ts: 1000,
        width: 300,
        height: 150,
        mime: 'image/webp',
        quality: 0.35,
        background: null,
        target: { url: 'http://example.com/v1/web/images', token: 'token', framesSupport: false },
      })
      expect(transfer).toEqual([bitmap])

      // still encoding: no new capture
      await jest.advanceTimersByTimeAsync(200)
      expect(frameMessages()).toHaveLength(1)

      reply({ type: 'done', canvasId: 1 })
      await jest.advanceTimersByTimeAsync(100)
      expect(frameMessages()).toHaveLength(2)
    })

    test('without a webp encoder, asks for jpeg over the color behind the canvas', async () => {
      webpProbe.mockReturnValue('data:image/png;base64,')
      const wrapper = document.createElement('div')
      wrapper.style.backgroundColor = 'rgb(1, 2, 3)'
      wrapper.appendChild(nodeMock)
      document.body.appendChild(wrapper)
      canvasRecorder = new Recorder(appMock, { fps: 10, quality: 'low' })
      canvasRecorder.recordCanvas(nodeMock, 1)
      await jest.advanceTimersByTimeAsync(100)
      wrapper.remove()
      expect(frameMessages()[0][0]).toMatchObject({ mime: 'image/jpeg', background: 'rgb(1, 2, 3)' })
    })

    test('fixedScaling asks the worker for the CSS-pixel size', async () => {
      const dpr = window.devicePixelRatio
      window.devicePixelRatio = 2
      canvasRecorder = new Recorder(appMock, { fps: 10, quality: 'low', fixedScaling: true })
      canvasRecorder.recordCanvas(nodeMock, 1)
      await jest.advanceTimersByTimeAsync(100)
      window.devicePixelRatio = dpr
      expect(frameMessages()[0][0]).toMatchObject({ width: 150, height: 75 })
    })

    test('falls back to toBlob when the worker cannot encode', async () => {
      canvasRecorder.recordCanvas(nodeMock, 1)
      await jest.advanceTimersByTimeAsync(100)
      reply({ type: 'fail', reason: 'no 2d context on OffscreenCanvas' })
      expect(workers[0].terminate).toHaveBeenCalled()
      await jest.advanceTimersByTimeAsync(100)
      expect(nodeMock.toBlob).toHaveBeenCalledTimes(1)
      expect(workers).toHaveLength(1)
    })

    test('stops capturing a canvas the worker reports as tainted', async () => {
      canvasRecorder.recordCanvas(nodeMock, 1)
      await jest.advanceTimersByTimeAsync(100)
      reply({ type: 'done', canvasId: 1, stop: true })
      expect(canvasRecorder['snapshots'][1]).toBeUndefined()
      expect(workers[0].postMessage).toHaveBeenCalledWith({ type: 'drop', canvasId: 1 })
    })

    test('restarts the tracker when the upload token expired', async () => {
      appMock.stop = jest.fn()
      appMock.start = jest.fn(() => Promise.resolve())
      canvasRecorder.recordCanvas(nodeMock, 1)
      await jest.advanceTimersByTimeAsync(100)
      reply({ type: 'unauthorized' })
      expect(appMock.stop).toHaveBeenCalledWith(false)
      jest.advanceTimersByTime(250)
      expect(appMock.start).toHaveBeenCalled()
    })

    test('a removed canvas flushes its worker frames before dropping them', async () => {
      canvasRecorder.recordCanvas(nodeMock, 1)
      await jest.advanceTimersByTimeAsync(100)
      nodeMock.remove()
      await jest.advanceTimersByTimeAsync(100)
      const calls = workers[0].postMessage.mock.calls.map(([m]: any[]) => m)
      expect(calls.map((m: any) => m.type)).toEqual(['frame', 'flush', 'drop'])
      expect(calls[1]).toMatchObject({ canvasId: 1, target: { token: 'token' } })
    })

    test('clear flushes frames buffered in the worker', async () => {
      canvasRecorder.recordCanvas(nodeMock, 1)
      await jest.advanceTimersByTimeAsync(100)
      canvasRecorder.clear()
      const types = workers[0].postMessage.mock.calls.map(([m]: any[]) => m.type)
      expect(types).toEqual(['frame', 'flush', 'drop'])
    })
  })

  describe('WebGL', () => {
    class FakeGL {
      constructor(private preserve: boolean) {}
      getContextAttributes() {
        return { preserveDrawingBuffer: this.preserve }
      }
      drawArrays() {}
      drawElements() {}
      clear() {}
    }
    const nativeDraw = FakeGL.prototype.drawArrays

    // jsdom has no WebGL: contexts come from the fake, through the tracker's getContext hook
    beforeAll(() => {
      HTMLCanvasElement.prototype.getContext = function (_type: string, attrs?: any) {
        return new FakeGL(!!attrs?.preserveDrawingBuffer)
      } as any
      watchCanvasContexts(window)
    })

    function glCanvas(preserveDrawingBuffer: boolean) {
      const canvas = document.createElement('canvas')
      canvas.toBlob = jest.fn((cb: (b: Blob | null) => void) => cb(new Blob(['img'])))
      document.body.appendChild(canvas)
      const gl = canvas.getContext('webgl', { preserveDrawingBuffer }) as unknown as FakeGL
      return { canvas, gl }
    }

    test('a preserved drawing buffer is captured on the timer and draw calls stay native', () => {
      jest.useFakeTimers()
      const { canvas, gl } = glCanvas(true)
      canvasRecorder.recordCanvas(canvas, 1)
      jest.advanceTimersByTime(300)
      expect(canvas.toBlob).toHaveBeenCalledTimes(3)
      expect(gl.drawArrays).toBe(nativeDraw)
      canvas.remove()
    })

    test('otherwise the next draw after a frame is due captures, and only that one is wrapped', async () => {
      jest.useFakeTimers({ doNotFake: ['queueMicrotask'] })
      const { canvas, gl } = glCanvas(false)
      canvasRecorder.recordCanvas(canvas, 1)
      gl.drawArrays()
      await Promise.resolve()
      expect(canvas.toBlob).not.toHaveBeenCalled()
      expect(gl.drawArrays).toBe(nativeDraw)

      jest.advanceTimersByTime(100)
      // due, but an idle canvas has nothing new to send
      expect(canvas.toBlob).not.toHaveBeenCalled()
      gl.clear()
      gl.drawArrays()
      await Promise.resolve()
      expect(canvas.toBlob).toHaveBeenCalledTimes(1)
      expect(gl.drawArrays).toBe(nativeDraw)

      gl.drawArrays()
      await Promise.resolve()
      expect(canvas.toBlob).toHaveBeenCalledTimes(1)

      canvasRecorder.clear()
      expect(Object.prototype.hasOwnProperty.call(gl, 'drawArrays')).toBe(false)
      canvas.remove()
    })

    test("stopping puts back the page's own draw methods instead of deleting them", () => {
      jest.useFakeTimers({ doNotFake: ['queueMicrotask'] })
      const { canvas, gl } = glCanvas(false)
      // e.g. Pixi/Babylon attach an ANGLE_instanced_arrays polyfill to the WebGL1 context
      const instanced = function () {}
      ;(gl as any).drawArraysInstanced = instanced
      canvasRecorder.recordCanvas(canvas, 1)
      jest.advanceTimersByTime(100)
      expect((gl as any).drawArraysInstanced).not.toBe(instanced)

      canvasRecorder.clear()
      expect((gl as any).drawArraysInstanced).toBe(instanced)
      expect(Object.prototype.hasOwnProperty.call(gl, 'drawArrays')).toBe(false)
      canvas.remove()
    })
  })
})
