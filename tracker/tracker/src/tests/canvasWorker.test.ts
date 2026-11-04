/**
 * @jest-environment node
 */
// @ts-nocheck
import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals'

const target = { url: 'http://example.com/v1/web/images', token: 'token', framesSupport: true }

function frame(canvasId = 1, ts = 1000, extra = {}) {
  return {
    type: 'frame',
    canvasId,
    createdAt: 500,
    ts,
    bitmap: { close: jest.fn() },
    width: 4,
    height: 2,
    mime: 'image/webp',
    quality: 0.35,
    background: null,
    target,
    debug: false,
    ...extra,
  }
}

describe('canvas worker', () => {
  let posted: any[]
  let encoded: { type: string; quality: number }[]
  let convertError: Error | null
  let has2d: boolean
  let fetchMock: jest.Mock
  let dispatch: (data: any) => Promise<void>
  const originalFetch = globalThis.fetch

  const load = () => {
    jest.isolateModules(() => {
      require('../canvasworker/index')
    })
    dispatch = (data) => (globalThis as any).self.onmessage({ data })
  }

  beforeEach(() => {
    posted = []
    encoded = []
    convertError = null
    has2d = true
    ;(globalThis as any).self = {
      postMessage: jest.fn((msg) => posted.push(msg)),
      onmessage: null,
    }
    ;(globalThis as any).OffscreenCanvas = class {
      width: number
      height: number
      fills: string[] = []
      ctx = {
        drawImage: jest.fn(),
        clearRect: jest.fn(),
        fillStyle: '',
        fillRect: jest.fn(() => this.fills.push(this.ctx.fillStyle)),
      }
      constructor(w: number, h: number) {
        this.width = w
        this.height = h
      }
      getContext() {
        return has2d ? this.ctx : null
      }
      convertToBlob({ type, quality }) {
        if (convertError) return Promise.reject(convertError)
        encoded.push({ type, quality, fills: this.fills.slice() })
        return Promise.resolve(new Blob(['img'], { type }))
      }
    }
    fetchMock = jest.fn(() => Promise.resolve({ status: 200 }))
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    delete (globalThis as any).self
    delete (globalThis as any).OffscreenCanvas
  })

  test('encodes the requested type and quality', async () => {
    load()
    const msg = frame()
    await dispatch(msg)
    expect(encoded.at(-1)).toEqual({ type: 'image/webp', quality: 0.35, fills: [] })
    expect(msg.bitmap.close).toHaveBeenCalled()
    expect(posted).toEqual([{ type: 'done', canvasId: 1 }])
  })

  test('paints the background under jpeg frames', async () => {
    load()
    await dispatch(frame(1, 1000, { mime: 'image/jpeg', background: 'rgb(1, 2, 3)' }))
    expect(encoded.at(-1)).toEqual({
      type: 'image/jpeg',
      quality: 0.35,
      fills: ['#fff', 'rgb(1, 2, 3)'],
    })
  })

  test('uploads packed frames every 10 captures', async () => {
    load()
    for (let i = 0; i < 10; i++) {
      await dispatch(frame(1, 1000 + i))
    }
    await new Promise((r) => setTimeout(r, 0))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(target.url)
    expect(init.headers.Authorization).toBe('Bearer token')
    expect(init.body.get('type')).toBe('frames')
    const file = init.body.get('frames') as File
    expect(file.name).toBe('500_1.webp.frames')
    const view = new DataView(await file.arrayBuffer())
    expect(view.getUint32(0, true)).toBe(1000)
    expect(view.getUint32(8, true)).toBe(3)
    expect(view.getUint32(15, true)).toBe(1001)
    expect(file.size).toBe(10 * 15)
  })

  test('flush uploads partial batches, drop discards them', async () => {
    load()
    await dispatch(frame(1))
    await dispatch(frame(2))
    await dispatch({ type: 'drop', canvasId: 2 })
    await dispatch({ type: 'flush', target, debug: false })
    await new Promise((r) => setTimeout(r, 0))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1].body.get('frames').name).toBe('500_1.webp.frames')
  })

  test('reports a tainted canvas so the main thread stops capturing it', async () => {
    load()
    convertError = new DOMException('tainted', 'SecurityError')
    const msg = frame()
    await dispatch(msg)
    expect(posted).toEqual([{ type: 'done', canvasId: 1, stop: true }])
  })

  test('reports failure when OffscreenCanvas has no 2d context', async () => {
    has2d = false
    load()
    const msg = frame()
    await dispatch(msg)
    expect(posted).toEqual([{ type: 'fail', reason: 'no 2d context on OffscreenCanvas' }])
    expect(msg.bitmap.close).toHaveBeenCalled()
  })

  test('reports expired tokens', async () => {
    fetchMock.mockImplementation(() => Promise.resolve({ status: 401 }))
    load()
    await dispatch(frame())
    await dispatch({ type: 'flush', target, debug: false })
    await new Promise((r) => setTimeout(r, 0))
    expect(posted).toContainEqual({ type: 'unauthorized' })
  })
})

describe('FramesUploader', () => {
  const originalFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('runs at most two uploads at once', async () => {
    const { FramesUploader } = require('../common/canvas')
    const resolvers: (() => void)[] = []
    globalThis.fetch = jest.fn(
      () => new Promise((r) => resolvers.push(() => r({ status: 200 }))),
    )
    const uploader = new FramesUploader({ unauthorized: jest.fn(), error: jest.fn() })
    const batch = (canvasId: number) => ({
      images: [{ id: 1, data: new Blob(['img']) }],
      canvasId,
      createdAt: 1,
    })
    const legacy = { url: 'u', token: 't', framesSupport: false }
    uploader.push(batch(1), legacy)
    uploader.push(batch(2), legacy)
    uploader.push(batch(3), legacy)
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    resolvers[0]()
    await new Promise((r) => setTimeout(r, 0))
    expect(globalThis.fetch).toHaveBeenCalledTimes(3)
    const names = (globalThis.fetch as jest.Mock).mock.calls.map(
      ([, init]) => (init.body.get('snapshot') as File).name,
    )
    expect(names).toEqual(['1_1_1.webp', '1_2_1.webp', '1_3_1.webp'])
  })
})
