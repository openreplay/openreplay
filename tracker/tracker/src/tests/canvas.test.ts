// @ts-nocheck
import { describe, expect, test, jest, beforeEach, afterEach, beforeAll } from '@jest/globals'
import CanvasRecorder, { watchCanvasContexts } from '../main/app/canvas'
import { Type } from '../main/app/messages.gen.js'
import App from '../main/app/index.js'

describe('CanvasRecorder', () => {
  let appMock: jest.Mocked<App>
  let canvasRecorder: CanvasRecorder
  let nodeMock: HTMLCanvasElement
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

    test('stops capturing once the canvas leaves the document', () => {
      jest.useFakeTimers()
      canvasRecorder.recordCanvas(nodeMock, 1)
      jest.advanceTimersByTime(300)
      expect(nodeMock.toBlob).not.toHaveBeenCalled()
      expect(canvasRecorder['snapshots'][1]).toBeUndefined()
      expect(canvasRecorder['intervals'].size).toBe(0)
    })
  })

  describe('clear', () => {
    test('clears the recording interval, flushes pending images and drops snapshots', () => {
      jest.useFakeTimers()
      const clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval')
      document.body.appendChild(nodeMock)
      canvasRecorder.recordCanvas(nodeMock, 1)
      const interval = canvasRecorder['intervals'].get(1)
      jest.advanceTimersByTime(300)
      expect(nodeMock.toBlob).toHaveBeenCalledTimes(3)

      canvasRecorder.clear()

      expect(clearIntervalSpy).toHaveBeenCalledWith(interval)
      expect(canvasRecorder['snapshots']).toEqual({})
      expect(canvasRecorder['intervals'].size).toBe(0)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      const body = (globalThis.fetch as jest.Mock).mock.calls[0][1].body as FormData
      expect(body.getAll('snapshot')).toHaveLength(3)

      jest.advanceTimersByTime(1000)
      expect(nodeMock.toBlob).toHaveBeenCalledTimes(3)
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
