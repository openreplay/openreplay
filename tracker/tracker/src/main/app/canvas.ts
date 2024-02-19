import App from '../app/index.js'
import { hasTag } from './guards.js'
import Message, { CanvasNode } from './messages.gen.js'

interface CanvasSnapshot {
  images: { data: string; id: number }[]
  createdAt: number
  paused: boolean
  dummy: HTMLCanvasElement
}

interface Options {
  fps: number
  quality: 'low' | 'medium' | 'high'
  isDebug?: boolean
  fixedScaling?: boolean
}

class CanvasRecorder {
  private snapshots: Record<number, CanvasSnapshot> = {}
  private readonly intervals: NodeJS.Timeout[] = []
  private readonly interval: number

  constructor(
    private readonly app: App,
    private readonly options: Options,
  ) {
    this.interval = 1000 / options.fps
  }

  startTracking() {
    setTimeout(() => {
      this.app.nodes.scanTree(this.captureCanvas)
      this.app.nodes.attachNodeCallback((node: Node): void => {
        this.captureCanvas(node)
      })
    }, 500)
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
    if (isIgnored || !hasTag(node, 'canvas') || this.snapshots[id]) {
      return
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (entry.target) {
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
        }
      })
    })

    observer.observe(node)
  }

  recordCanvas = (node: Node, id: number) => {
    const ts = this.app.timestamp()
    this.snapshots[id] = {
      images: [],
      createdAt: ts,
      paused: false,
      dummy: document.createElement('canvas'),
    }
    const canvasMsg = CanvasNode(id.toString(), ts)
    this.app.send(canvasMsg as Message)
    const int = setInterval(() => {
      const cid = this.app.nodes.getID(node)
      const canvas = cid ? this.app.nodes.getNode(cid) : undefined
      if (!canvas || !hasTag(canvas, 'canvas') || canvas !== node) {
        this.app.debug.log('Canvas element not in sync')
        clearInterval(int)
      } else {
        if (!this.snapshots[id].paused) {
          const snapshot = captureSnapshot(
            canvas,
            this.options.quality,
            this.snapshots[id].dummy,
            this.options.fixedScaling,
          )
          this.snapshots[id].images.push({ id: this.app.timestamp(), data: snapshot })
          if (this.snapshots[id].images.length > 9) {
            this.sendSnaps(this.snapshots[id].images, id, this.snapshots[id].createdAt)
            this.snapshots[id].images = []
          }
        }
      }
    }, this.interval)
    this.intervals.push(int)
  }

  sendSnaps(images: { data: string; id: number }[], canvasId: number, createdAt: number) {
    if (Object.keys(this.snapshots).length === 0) {
      return
    }
    const formData = new FormData()
    images.forEach((snapshot) => {
      const blob = dataUrlToBlob(snapshot.data)
      if (!blob) return
      formData.append('snapshot', blob[0], `${createdAt}_${canvasId}_${snapshot.id}.jpeg`)
      if (this.options.isDebug) {
        saveImageData(snapshot.data, `${createdAt}_${canvasId}_${snapshot.id}.jpeg`)
      }
    })

    fetch(this.app.options.ingestPoint + '/v1/web/images', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.app.session.getSessionToken() ?? ''}`,
      },
      body: formData,
    })
      .then(() => {
        return true
      })
      .catch((e) => {
        this.app.debug.error('error saving canvas', e)
      })
  }

  clear() {
    this.intervals.forEach((int) => clearInterval(int))
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
) {
  const imageFormat = 'image/jpeg' // or /png'
  if (fixedScaling) {
    const canvasScaleRatio = window.devicePixelRatio || 1
    dummy.width = canvas.width / canvasScaleRatio
    dummy.height = canvas.height / canvasScaleRatio
    const ctx = dummy.getContext('2d')
    if (!ctx) {
      return ''
    }
    ctx.drawImage(canvas, 0, 0, dummy.width, dummy.height)
    return dummy.toDataURL(imageFormat, qualityInt[quality])
  } else {
    return canvas.toDataURL(imageFormat, qualityInt[quality])
  }
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

function saveImageData(imageDataUrl: string, name: string) {
  const link = document.createElement('a')
  link.href = imageDataUrl
  link.download = name
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default CanvasRecorder
