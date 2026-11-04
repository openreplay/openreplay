// Shared by the main thread (fallback capture path) and the canvas worker.

export interface CanvasFrame {
  data: Blob
  /** capture timestamp */
  id: number
}

export interface FramesBatch {
  images: CanvasFrame[]
  canvasId: number
  createdAt: number
}

export interface UploadTarget {
  url: string
  token: string
  framesSupport: boolean
}

export const FRAMES_PER_BATCH = 10
/** Files are named .webp even when the browser encoded JPEG/PNG; the player sniffs the real format. */
export const CANVAS_FILE_EXT = 'webp'

export type ToCanvasWorker =
  | {
      type: 'frame'
      canvasId: number
      createdAt: number
      ts: number
      bitmap: ImageBitmap
      width: number
      height: number
      mime: string
      quality: number
      /** JPEG only: painted under the frame, it has no alpha channel */
      background: string | null
      target: UploadTarget
      debug: boolean
    }
  /** all canvases unless `canvasId` */
  | { type: 'flush'; target: UploadTarget; debug: boolean; canvasId?: number }
  | { type: 'drop'; canvasId: number }

export type FromCanvasWorker =
  | { type: 'fail'; reason: string }
  /** sent for every 'frame', `stop` when the canvas can never be encoded (tainted) */
  | { type: 'done'; canvasId: number; stop?: boolean }
  | { type: 'unauthorized' }
  | { type: 'error'; message: string }
  | { type: 'debugFrames'; name: string; buffer: ArrayBuffer }

/** [uint64 LE timestamp][uint32 LE size][data] per frame */
export async function packFrames(images: CanvasFrame[]): Promise<ArrayBuffer | null> {
  const frames: { ts: number; bytes: Uint8Array }[] = []
  let totalSize = 0
  for (const image of images) {
    if (!image.data) continue
    const bytes = new Uint8Array(await image.data.arrayBuffer())
    frames.push({ ts: image.id, bytes })
    totalSize += 8 + 4 + bytes.byteLength
  }
  if (totalSize === 0) return null

  const packed = new ArrayBuffer(totalSize)
  const view = new DataView(packed)
  const out = new Uint8Array(packed)
  let offset = 0
  for (const { ts, bytes } of frames) {
    view.setUint32(offset, ts % 0x100000000, true)
    view.setUint32(offset + 4, Math.floor(ts / 0x100000000), true)
    view.setUint32(offset + 8, bytes.byteLength, true)
    out.set(bytes, offset + 12)
    offset += 12 + bytes.byteLength
  }
  return packed
}

export function framesFileName(batch: FramesBatch) {
  return `${batch.createdAt}_${batch.canvasId}.${CANVAS_FILE_EXT}.frames`
}

function buildForm(batch: FramesBatch, packed: ArrayBuffer | null, framesSupport: boolean) {
  const formData = new FormData()
  if (framesSupport) {
    if (!packed) return null
    formData.append('type', 'frames')
    formData.append('frames', new Blob([packed]), framesFileName(batch))
    return formData
  }
  let count = 0
  batch.images.forEach((image) => {
    if (!image.data) return
    count++
    const name = `${batch.createdAt}_${batch.canvasId}_${image.id}.${CANVAS_FILE_EXT}`
    formData.append('snapshot', image.data, name)
  })
  return count ? formData : null
}

interface UploaderHooks {
  unauthorized: () => void
  error: (message: string) => void
  /** debug mode (__save_canvas_locally): receives every packed batch */
  debugFrames?: (name: string, buffer: ArrayBuffer) => void
}

export class FramesUploader {
  private active = 0
  private readonly pending: { batch: FramesBatch; target: UploadTarget; debug: boolean }[] = []
  private readonly maxConcurrent = 2
  private readonly maxQueue = 50

  constructor(private readonly hooks: UploaderHooks) {}

  push(batch: FramesBatch, target: UploadTarget, debug = false) {
    if (this.pending.length >= this.maxQueue) {
      this.hooks.error('Upload queue full, dropping canvas batch')
      return
    }
    this.pending.push({ batch, target, debug })
    this.pump()
  }

  private pump() {
    while (this.active < this.maxConcurrent && this.pending.length > 0) {
      const job = this.pending.shift()!
      this.active++
      void this.upload(job.batch, job.target, job.debug).finally(() => {
        this.active--
        this.pump()
      })
    }
  }

  private async upload(batch: FramesBatch, target: UploadTarget, debug: boolean) {
    try {
      const packed =
        target.framesSupport || debug ? await packFrames(batch.images) : null
      if (debug && packed && this.hooks.debugFrames) {
        this.hooks.debugFrames(framesFileName(batch), packed.slice(0))
      }
      const body = buildForm(batch, packed, target.framesSupport)
      if (!body) return
      const r = await fetch(target.url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${target.token}` },
        body,
      })
      if (r.status === 401) {
        this.hooks.unauthorized()
      }
    } catch (e) {
      this.hooks.error(`error saving canvas: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}
