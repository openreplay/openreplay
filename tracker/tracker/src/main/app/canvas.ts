import App from '../app/index.js'
import { hasTag } from './guards.js'
import Message, { CanvasNode } from './messages.gen.js'

interface CanvasSnapshot {
  images: { data: Blob; id: number }[]
  createdAt: number
  paused: boolean
  dummy: HTMLCanvasElement
  isCapturing: boolean
  isStopped: boolean
}

interface Options {
  fps: number
  quality: 'low' | 'medium' | 'high'
  isDebug?: boolean
  fixedScaling?: boolean
  useAnimationFrame?: boolean
  fileExt?: 'webp' | 'png' | 'jpeg' | 'avif'
}

interface QueuedBatch {
  images: { data: Blob; id: number }[]
  canvasId: number
  createdAt: number
}

class CanvasRecorder {
  private snapshots: Record<number, CanvasSnapshot> = {}
  private readonly intervals: Map<number, ReturnType<typeof setInterval>> = new Map()
  private readonly observers: Map<number, IntersectionObserver> = new Map()
  private readonly interval: number
  private readonly fileExt: 'webp' | 'png' | 'jpeg' | 'avif'
  private uploadQueue = 0
  private readonly MAX_CONCURRENT_UPLOADS = 2
  private readonly MAX_QUEUE_SIZE = 50 // ~500 images max (50 batches × 10 images)
  private readonly pendingBatches: QueuedBatch[] = []
  private isProcessingQueue = false

  constructor(
    private readonly app: App,
    private readonly options: Options,
  ) {
    this.fileExt = options.fileExt ?? 'webp'
    this.interval = 1000 / options.fps
  }

  startTracking() {
    setTimeout(() => {
      this.app.nodes.scanTree(this.captureCanvas)
      this.app.nodes.attachNodeCallback(this.captureCanvas)
    }, 250)
  }

  restartTracking = () => {
    this.clear()
    this.app.nodes.scanTree(this.captureCanvas)
  }

  captureCanvas = (node: Node) => {
    const id = this.app.nodes.getID(node)
    if (!id || !hasTag(node, 'canvas')) {
      return
    }

    const isIgnored = this.app.sanitizer.isObscured(id) || this.app.sanitizer.isHidden(id)
    if (isIgnored || this.snapshots[id]) {
      return
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (this.snapshots[id] && this.snapshots[id].createdAt) {
            this.snapshots[id].paused = false
          } else {
            this.recordCanvas(entry.target, id)
          }
          /**
           * We can switch this to start observing when element is in the view
           * but otherwise right now we're just pausing when it's not
           * just to save some bandwidth and space on backend
           * */
          // observer.unobserve(entry.target)
        } else {
          if (this.snapshots[id]) {
            this.snapshots[id].paused = true
          }
        }
      })
    })

    this.observers.set(id, observer)
    observer.observe(node)
  }

  recordCanvas = (node: Node, id: number) => {
    const ts = this.app.timestamp()
    this.snapshots[id] = {
      images: [],
      createdAt: ts,
      paused: false,
      dummy: document.createElement('canvas'),
      isCapturing: false,
      isStopped: false,
    }
    const canvasMsg = CanvasNode(id.toString(), ts)
    this.app.send(canvasMsg as Message)

    const cachedCanvas = node as HTMLCanvasElement

    const captureFn = (canvas: HTMLCanvasElement) => {
      if (!this.snapshots[id] || this.snapshots[id].isCapturing || this.snapshots[id].isStopped) {
        return
      }

      this.snapshots[id].isCapturing = true
      captureSnapshot(
        canvas,
        this.options.quality,
        this.snapshots[id].dummy,
        this.options.fixedScaling,
        this.fileExt,
        (blob) => {
          if (this.snapshots[id]) {
            this.snapshots[id].isCapturing = false
          }

          if (!blob || !this.snapshots[id] || this.snapshots[id].isStopped) {
            return
          }

          this.snapshots[id].images.push({ id: this.app.timestamp(), data: blob })
          if (this.snapshots[id].images.length > 9) {
            this.sendSnaps(this.snapshots[id].images, id, this.snapshots[id].createdAt)
            this.snapshots[id].images = []
          }
        },
      )
    }

    const int = setInterval(() => {
      const snapshot = this.snapshots[id]
      if (!snapshot || snapshot.isStopped) {
        this.app.debug.log('Canvas is not present in {snapshots}')
        this.cleanupCanvas(id)
        return
      }

      if (!document.contains(cachedCanvas)) {
        this.app.debug.log('Canvas element not in sync', cachedCanvas, node)
        this.cleanupCanvas(id)
        return
      }

      if (!snapshot.paused) {
        if (this.options.useAnimationFrame) {
          requestAnimationFrame(() => {
            captureFn(cachedCanvas)
          })
        } else {
          captureFn(cachedCanvas)
        }
      }
    }, this.interval)

    this.intervals.set(id, int)
  }

  sendSnaps(images: { data: Blob; id: number }[], canvasId: number, createdAt: number) {
    if (Object.keys(this.snapshots).length === 0) {
      return
    }

    if (this.pendingBatches.length >= this.MAX_QUEUE_SIZE) {
      this.app.debug.warn('Upload queue full, dropping canvas batch')
      return
    }

    this.pendingBatches.push({ images, canvasId, createdAt })

    if (!this.isProcessingQueue) {
      this.processUploadQueue()
    }
  }

  private async processUploadQueue() {
    this.isProcessingQueue = true

    while (this.pendingBatches.length > 0) {
      if (this.uploadQueue >= this.MAX_CONCURRENT_UPLOADS) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        continue
      }

      const batch = this.pendingBatches.shift()
      if (!batch) break

      this.uploadBatch(batch.images, batch.canvasId, batch.createdAt)
    }

    this.isProcessingQueue = false
  }

  private uploadBatch(images: { data: Blob; id: number }[], canvasId: number, createdAt: number) {
    const formData = new FormData()
    images.forEach((snapshot) => {
      const blob = snapshot.data
      if (!blob) return
      formData.append('snapshot', blob, `${createdAt}_${canvasId}_${snapshot.id}.${this.fileExt}`)
      if (this.options.isDebug) {
        saveImageData(blob, `${createdAt}_${canvasId}_${snapshot.id}.${this.fileExt}`)
      }
    })

    const initRestart = () => {
      this.app.debug.log('Restarting tracker; token expired')
      this.app.stop(false)
      setTimeout(() => {
        void this.app.start({}, true)
      }, 250)
    }

    this.uploadQueue++
    fetch(this.app.options.ingestPoint + '/v1/web/images', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.app.session.getSessionToken() ?? ''}`,
      },
      body: formData,
    })
      .then((r) => {
        if (r.status === 401) {
          return initRestart()
        }
        return true
      })
      .catch((e) => {
        this.app.debug.error('error saving canvas', e)
      })
      .finally(() => {
        this.uploadQueue--
      })
  }

  private cleanupCanvas(id: number) {
    if (this.snapshots[id]) {
      this.snapshots[id].isStopped = true
    }

    const interval = this.intervals.get(id)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(id)
    }

    const observer = this.observers.get(id)
    if (observer) {
      observer.disconnect()
      this.observers.delete(id)
    }

    if (this.snapshots[id]?.dummy) {
      const dummy = this.snapshots[id].dummy
      dummy.width = 0
      dummy.height = 0
    }

    delete this.snapshots[id]
  }

  clear() {
    // Flush remaining images before cleanup
    Object.keys(this.snapshots).forEach((idStr) => {
      const id = parseInt(idStr, 10)
      const snapshot = this.snapshots[id]

      if (snapshot && snapshot.images.length > 0) {
        this.sendSnaps(snapshot.images, id, snapshot.createdAt)
        snapshot.images = []
      }
    })

    Object.keys(this.snapshots).forEach((idStr) => {
      const id = parseInt(idStr, 10)
      this.cleanupCanvas(id)
    })

    // don't clear pendingBatches or stop queue processing
    // to allow flushed images to finish uploading in the background

    this.intervals.clear()
    this.observers.clear()
    this.snapshots = {}
  }
}

const qualityInt = {
  low: 0.35,
  medium: 0.55,
  high: 0.8,
}

function captureSnapshot(
  canvas: HTMLCanvasElement,
  quality: 'low' | 'medium' | 'high' = 'medium',
  dummy: HTMLCanvasElement,
  fixedScaling = false,
  fileExt: 'webp' | 'png' | 'jpeg' | 'avif',
  onBlob: (blob: Blob | null) => void,
) {
  const imageFormat = `image/${fileExt}`
  if (fixedScaling) {
    const canvasScaleRatio = window.devicePixelRatio || 1
    dummy.width = canvas.width / canvasScaleRatio
    dummy.height = canvas.height / canvasScaleRatio
    const ctx = dummy.getContext('2d')
    if (!ctx) {
      return ''
    }
    ctx.clearRect(0, 0, dummy.width, dummy.height)
    ctx.drawImage(canvas, 0, 0, dummy.width, dummy.height)
    dummy.toBlob(onBlob, imageFormat, qualityInt[quality])
  } else {
    canvas.toBlob(onBlob, imageFormat, qualityInt[quality])
  }
}

function saveImageData(imageDataBlob: Blob, name: string) {
  const imageDataUrl = URL.createObjectURL(imageDataBlob)
  const link = document.createElement('a')
  link.href = imageDataUrl
  link.download = name
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function dataUrlToBlob(dataUrl: string): [Blob, Uint8Array] | null {
  const [header, base64] = dataUrl.split(',')
  if (!header || !base64) return null
  const encParts = header.match(/:(.*?);/)
  if (!encParts) return null
  const mime = encParts[1]
  const blobStr = atob(base64)
  let n = blobStr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = blobStr.charCodeAt(n)
  }

  return [new Blob([u8arr], { type: mime }), u8arr]
}

export default CanvasRecorder
