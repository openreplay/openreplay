import {
  FRAMES_PER_BATCH,
  FramesUploader,
  type CanvasFrame,
  type FromCanvasWorker,
  type ToCanvasWorker,
  type UploadTarget,
} from '../common/canvas.js'

declare const self: {
  postMessage(message: FromCanvasWorker, transfer: Transferable[]): void
  onmessage: ((ev: MessageEvent<ToCanvasWorker>) => void) | null
}

interface CanvasState {
  canvas: OffscreenCanvas
  ctx: OffscreenCanvasRenderingContext2D
  createdAt: number
  images: CanvasFrame[]
}

const send = (msg: FromCanvasWorker, transfer: Transferable[] = []) => self.postMessage(msg, transfer)

const canvases = new Map<number, CanvasState>()
const uploader = new FramesUploader({
  unauthorized: () => send({ type: 'unauthorized' }),
  error: (message) => send({ type: 'error', message }),
  debugFrames: (name, buffer) => send({ type: 'debugFrames', name, buffer }, [buffer]),
})

const supported = !!new OffscreenCanvas(1, 1).getContext('2d')
if (!supported) {
  send({ type: 'fail', reason: 'no 2d context on OffscreenCanvas' })
}

function getState(canvasId: number, createdAt: number) {
  let state = canvases.get(canvasId)
  if (!state) {
    const canvas = new OffscreenCanvas(1, 1)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no 2d context on OffscreenCanvas')
    state = { canvas, ctx, createdAt, images: [] }
    canvases.set(canvasId, state)
  }
  return state
}

function flush(canvasId: number, state: CanvasState, target: UploadTarget, debug: boolean) {
  if (state.images.length === 0) return
  uploader.push({ images: state.images, canvasId, createdAt: state.createdAt }, target, debug)
  state.images = []
}

async function encodeFrame(msg: Extract<ToCanvasWorker, { type: 'frame' }>) {
  const { bitmap, width, height, canvasId, background } = msg
  const state = getState(canvasId, msg.createdAt)
  const { canvas, ctx } = state
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  } else {
    ctx.clearRect(0, 0, width, height)
  }
  if (background) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await canvas.convertToBlob({ type: msg.mime, quality: msg.quality })
  // dropped while encoding
  if (canvases.get(canvasId) !== state) return

  state.images.push({ id: msg.ts, data: blob })
  if (state.images.length >= FRAMES_PER_BATCH) {
    flush(canvasId, state, msg.target, msg.debug)
  }
}

self.onmessage = async ({ data }: MessageEvent<ToCanvasWorker>) => {
  if (!supported) {
    if (data.type === 'frame') data.bitmap.close()
    return
  }

  switch (data.type) {
    case 'frame':
      try {
        await encodeFrame(data)
        send({ type: 'done', canvasId: data.canvasId })
      } catch (e) {
        data.bitmap.close()
        // a tainted (cross-origin) canvas will never encode
        const stop = e instanceof DOMException && e.name === 'SecurityError'
        send({ type: 'done', canvasId: data.canvasId, stop })
      }
      break
    case 'flush':
      canvases.forEach((state, canvasId) => {
        if (data.canvasId === undefined || data.canvasId === canvasId) {
          flush(canvasId, state, data.target, data.debug)
        }
      })
      break
    case 'drop': {
      const state = canvases.get(data.canvasId)
      if (state) {
        state.canvas.width = 0
        state.canvas.height = 0
        canvases.delete(data.canvasId)
      }
      break
    }
  }
}
