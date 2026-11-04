import App from '../app/index.js'
import { hasTag } from './guards.js'
import Message, { CanvasNode } from './messages.gen.js'
import {
  FRAMES_PER_BATCH,
  FramesUploader,
  type CanvasFrame,
  type FromCanvasWorker,
  type ToCanvasWorker,
  type UploadTarget,
} from '../../common/canvas.js'

/**
 * this value is injected during build time via rollup
 * */
// @ts-ignore
const canvasWorkerBody: string | undefined = global.CANVAS_WORKER_BODY

type GLContext = WebGLRenderingContext | WebGL2RenderingContext

/**
 * A WebGL drawing buffer (preserveDrawingBuffer: false, the default) is cleared once the
 * frame is presented, so a snapshot taken from a timer reads a transparent canvas. The
 * buffer is only valid in the task that drew it: we remember WebGL contexts as they are
 * created and, when a frame is due, capture right after the page's next draw call.
 * Contexts with a preserved buffer keep the timer capture.
 */
const WEBGL_TYPES = ['webgl', 'webgl2', 'experimental-webgl']
const DRAW_CALLS = [
  'drawArrays',
  'drawElements',
  'drawArraysInstanced',
  'drawElementsInstanced',
  'drawRangeElements',
  'clear',
]
const glContexts = new WeakMap<HTMLCanvasElement, GLContext>()
const hookedProtos = new WeakSet<object>()

/** Must run before the page creates its contexts; contexts created earlier keep the timer capture. */
export function watchCanvasContexts(context: typeof globalThis = window) {
  const proto = context.HTMLCanvasElement?.prototype
  if (!proto || hookedProtos.has(proto)) return
  hookedProtos.add(proto)
  const nativeGetContext = proto.getContext
  proto.getContext = function (this: HTMLCanvasElement, type: string) {
    // eslint-disable-next-line prefer-rest-params
    const ctx = nativeGetContext.apply(this, arguments as any)
    if (ctx && WEBGL_TYPES.includes(type)) {
      glContexts.set(this, ctx as GLContext)
    }
    return ctx
  } as typeof proto.getContext
}

interface DrawHook {
  /** wraps the draw calls until the next one, which captures */
  arm(): void
  /** puts back what the context had: the page's own methods (e.g. instancing polyfills) or the prototype's */
  unhook(): void
}

function hookDraws(gl: GLContext, capture: () => void): DrawHook {
  const natives: Array<[string, Function]> = []
  const pageOwn = new Set<string>()
  for (const name of DRAW_CALLS) {
    const native = (gl as any)[name]
    if (typeof native === 'function') natives.push([name, native])
    if (Object.prototype.hasOwnProperty.call(gl, name)) pageOwn.add(name)
  }
  let armed = false
  // own properties on this context only; reassigned rather than deleted between frames,
  // so draw calls run unwrapped and the object keeps its shape
  const set = (fns: Array<[string, Function]>) => {
    for (const [name, fn] of fns) (gl as any)[name] = fn
  }
  const wrappers = natives.map(([name, native]): [string, Function] => [
    name,
    function (this: unknown) {
      if (armed) {
        armed = false
        set(natives)
        // runs once the page's current render code returns, before the frame is presented
        queueMicrotask(capture)
      }
      // eslint-disable-next-line prefer-rest-params
      return native.apply(this, arguments)
    },
  ])
  return {
    arm() {
      if (armed) return
      armed = true
      set(wrappers)
    },
    unhook() {
      armed = false
      for (const [name, native] of natives) {
        if (pageOwn.has(name)) (gl as any)[name] = native
        else delete (gl as any)[name]
      }
    },
  }
}

interface CanvasSnapshot {
  node: HTMLCanvasElement
  images: CanvasFrame[]
  createdAt: number
  paused: boolean
  isCapturing: boolean
  /** captured on every `stride`-th tick; grows while captures block the main thread */
  stride: number
  ticks: number
  captures: number
  /** JPEG only: color behind the canvas, painted under its transparent pixels */
  background: string | null
  /** main-thread fixedScaling only */
  dummy: HTMLCanvasElement | null
}

interface Options {
  fps: number
  quality: 'low' | 'medium' | 'high'
  isDebug?: boolean
  fixedScaling?: boolean
  useAnimationFrame?: boolean
  framesSupport?: boolean
  /** @deprecated webp is the default format for pipeline optimization */
  fileExt?: 'webp' | 'png' | 'jpeg' | 'avif'
}

const qualityInt = {
  low: 0.35,
  medium: 0.55,
  high: 0.8,
}

/** one frame at 60Hz */
const CAPTURE_BUDGET_MS = 16
const MAX_STRIDE = 8

// WebKit has no WebP encoder and silently falls back to PNG (lossless, huge, ignores quality)
function supportsWebpEncoding() {
  try {
    const probe = document.createElement('canvas')
    probe.width = probe.height = 1
    return probe.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    return false
  }
}

const isTransparent = (color: string) =>
  !color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)' || /\/\s*0\)$/.test(color)

function backdropColor(node: Element) {
  for (let el: Element | null = node; el; el = el.parentElement) {
    const color = (el.ownerDocument.defaultView ?? window).getComputedStyle(el).backgroundColor
    if (!isTransparent(color)) {
      return color
    }
  }
  return '#fff'
}

function canUseWorker() {
  return (
    !!canvasWorkerBody &&
    typeof Worker === 'function' &&
    typeof createImageBitmap === 'function' &&
    typeof OffscreenCanvas === 'function' &&
    'convertToBlob' in OffscreenCanvas.prototype
  )
}

/**
 * Encoding happens in a dedicated worker (createImageBitmap -> OffscreenCanvas.convertToBlob):
 * WebKit encodes canvas.toBlob synchronously on the main thread. Browsers without
 * OffscreenCanvas fall back to toBlob, throttled by `stride` when captures get expensive.
 */
class CanvasRecorder {
  private snapshots: Record<number, CanvasSnapshot> = {}
  private readonly observers: Map<number, IntersectionObserver> = new Map()
  private readonly drawHooks: Map<number, DrawHook> = new Map()
  private readonly interval: number
  private readonly quality: number
  private readonly mime: 'image/webp' | 'image/jpeg'
  private timer: ReturnType<typeof setInterval> | null = null
  private worker: Worker | null = null
  private workerDisabled = !canUseWorker()
  private readonly uploader: FramesUploader

  constructor(
    private readonly app: App,
    private readonly options: Options,
  ) {
    this.interval = 1000 / options.fps
    this.quality = qualityInt[options.quality] ?? qualityInt.medium
    this.mime = supportsWebpEncoding() ? 'image/webp' : 'image/jpeg'
    this.uploader = new FramesUploader({
      unauthorized: this.initRestart,
      error: (message) => this.app.debug.error(message),
      debugFrames: this.saveLocally,
    })
  }

  startTracking() {
    setTimeout(() => {
      this.app.nodes.scanTree(this.captureCanvas)
      this.app.nodes.attachNodeCallback(this.captureCanvas)
      this.app.attachResanitizeCallback(this.resanitizeCanvas)
    }, 125)
  }

  /**
   * Reacts to a runtime sanitization change on a canvas: stop capturing if it
   * just became masked, start if it just became visible. (Already-sent frames
   * can't be retracted — escalation only stops future capture.)
   */
  resanitizeCanvas = (node: Node, id: number) => {
    if (!hasTag(node, 'canvas')) {
      return
    }
    const isIgnored = this.app.sanitizer.isObscured(id) || this.app.sanitizer.isHidden(id)
    if (isIgnored) {
      if (this.snapshots[id] || this.observers.has(id)) {
        this.cleanupCanvas(id)
      }
    } else if (!this.snapshots[id] && !this.observers.has(id)) {
      this.captureCanvas(node)
    }
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
      node: node as HTMLCanvasElement,
      images: [],
      createdAt: ts,
      paused: false,
      isCapturing: false,
      stride: 1,
      ticks: 0,
      captures: 0,
      background: null,
      dummy: null,
    }
    const canvasMsg = CanvasNode(id.toString(), ts)
    this.app.send(canvasMsg as Message)

    const gl = glContexts.get(node as HTMLCanvasElement)
    if (gl && !gl.getContextAttributes()?.preserveDrawingBuffer) {
      this.drawHooks.set(id, hookDraws(gl, () => this.capture(id)))
    }

    if (!this.timer) {
      this.timer = setInterval(this.tick, this.interval)
    }
  }

  private tick = () => {
    if (document.hidden) {
      return
    }
    const due: number[] = []
    Object.keys(this.snapshots).forEach((key) => {
      const id = Number(key)
      const snapshot = this.snapshots[id]
      const canvas = snapshot.node
      // isConnected covers shadow roots and iframes; a removed iframe leaves its document without a window
      if (!canvas.isConnected || !canvas.ownerDocument.defaultView) {
        this.app.debug.log('Canvas element not in sync', canvas)
        this.flushSnapshot(id, snapshot)
        this.worker?.postMessage({
          type: 'flush',
          canvasId: id,
          target: this.uploadTarget(),
          debug: !!this.options.isDebug,
        } satisfies ToCanvasWorker)
        this.cleanupCanvas(id)
        return
      }
      if (snapshot.paused || snapshot.isCapturing) {
        return
      }
      snapshot.ticks++
      if (snapshot.ticks % snapshot.stride !== 0) {
        return
      }
      const drawHook = this.drawHooks.get(id)
      if (drawHook) {
        // captured on the next draw; an idle WebGL canvas sends nothing new
        drawHook.arm()
      } else {
        due.push(id)
      }
    })
    if (due.length === 0) {
      return
    }
    if (this.options.useAnimationFrame) {
      requestAnimationFrame(() => due.forEach(this.capture))
    } else {
      due.forEach(this.capture)
    }
  }

  private capture = (id: number) => {
    const snapshot = this.snapshots[id]
    if (!snapshot || snapshot.isCapturing) {
      return
    }
    const canvas = snapshot.node
    // createImageBitmap rejects and drawImage throws on an empty canvas
    if (!canvas.width || !canvas.height) {
      return
    }
    snapshot.isCapturing = true
    const ts = this.app.timestamp()
    const start = performance.now()
    if (this.mime === 'image/jpeg' && snapshot.captures++ % FRAMES_PER_BATCH === 0) {
      snapshot.background = backdropColor(canvas)
    }
    try {
      const worker = this.getWorker()
      if (worker) {
        this.captureToWorker(worker, id, snapshot, ts)
      } else {
        this.captureOnMainThread(id, snapshot, ts)
      }
    } catch (e) {
      // toBlob throws on a tainted (cross-origin) canvas, it will never succeed
      this.app.debug.error('Canvas capture failed, stopping', e)
      this.cleanupCanvas(id)
      return
    }
    const cost = performance.now() - start
    if (cost > CAPTURE_BUDGET_MS) {
      snapshot.stride = Math.min(snapshot.stride * 2, MAX_STRIDE)
    } else if (snapshot.stride > 1 && cost < CAPTURE_BUDGET_MS / 2) {
      snapshot.stride = snapshot.stride / 2
    }
  }

  private targetSize(canvas: HTMLCanvasElement) {
    if (!this.options.fixedScaling) {
      return { width: canvas.width, height: canvas.height }
    }
    const ratio = window.devicePixelRatio || 1
    return {
      width: Math.max(1, Math.floor(canvas.width / ratio)),
      height: Math.max(1, Math.floor(canvas.height / ratio)),
    }
  }

  private captureToWorker(worker: Worker, id: number, snapshot: CanvasSnapshot, ts: number) {
    const { width, height } = this.targetSize(snapshot.node)
    createImageBitmap(snapshot.node).then(
      (bitmap) => {
        if (this.snapshots[id] !== snapshot || this.worker !== worker) {
          bitmap.close()
          snapshot.isCapturing = false
          return
        }
        const msg: ToCanvasWorker = {
          type: 'frame',
          canvasId: id,
          createdAt: snapshot.createdAt,
          ts,
          bitmap,
          width,
          height,
          mime: this.mime,
          quality: this.quality,
          background: snapshot.background,
          target: this.uploadTarget(),
          debug: !!this.options.isDebug,
        }
        worker.postMessage(msg, [bitmap])
      },
      (e) => {
        this.app.debug.log('Canvas bitmap failed', e)
        snapshot.isCapturing = false
      },
    )
  }

  private captureOnMainThread(id: number, snapshot: CanvasSnapshot, ts: number) {
    let source = snapshot.node
    if (this.options.fixedScaling || snapshot.background) {
      const { width, height } = this.targetSize(source)
      const dummy = snapshot.dummy ?? (snapshot.dummy = document.createElement('canvas'))
      dummy.width = width
      dummy.height = height
      const ctx = dummy.getContext('2d')
      if (ctx) {
        if (snapshot.background) {
          ctx.fillStyle = '#fff'
          ctx.fillRect(0, 0, width, height)
          ctx.fillStyle = snapshot.background
          ctx.fillRect(0, 0, width, height)
        }
        ctx.drawImage(source, 0, 0, width, height)
        source = dummy
      }
    }
    source.toBlob(
      (blob) => {
        if (this.snapshots[id] !== snapshot) {
          return
        }
        snapshot.isCapturing = false
        if (!blob) {
          return
        }
        snapshot.images.push({ id: ts, data: blob })
        if (snapshot.images.length >= FRAMES_PER_BATCH) {
          this.flushSnapshot(id, snapshot)
        }
      },
      this.mime,
      this.quality,
    )
  }

  private getWorker(): Worker | null {
    if (this.workerDisabled) {
      return null
    }
    if (!this.worker) {
      try {
        this.worker = new Worker(
          URL.createObjectURL(new Blob([canvasWorkerBody!], { type: 'text/javascript' })),
        )
        this.worker.onmessage = this.onWorkerMessage
        this.worker.onerror = (e) => {
          this.app.debug.error('Canvas worker error, encoding on main thread', e)
          this.disableWorker()
        }
      } catch (e) {
        this.app.debug.error('Canvas worker unavailable, encoding on main thread', e)
        this.disableWorker()
      }
    }
    return this.worker
  }

  private onWorkerMessage = ({ data }: MessageEvent<FromCanvasWorker>) => {
    switch (data.type) {
      case 'done': {
        const snapshot = this.snapshots[data.canvasId]
        if (!snapshot) return
        snapshot.isCapturing = false
        if (data.stop) {
          this.app.debug.log('Canvas is tainted, stopping capture', data.canvasId)
          this.cleanupCanvas(data.canvasId)
        }
        break
      }
      case 'unauthorized':
        this.initRestart()
        break
      case 'error':
        this.app.debug.error(data.message)
        break
      case 'debugFrames':
        this.saveLocally(data.name, data.buffer)
        break
      case 'fail':
        this.app.debug.warn('Canvas worker unavailable, encoding on main thread:', data.reason)
        this.disableWorker()
        break
    }
  }

  private disableWorker() {
    this.workerDisabled = true
    this.worker?.terminate()
    this.worker = null
    Object.values(this.snapshots).forEach((snapshot) => {
      snapshot.isCapturing = false
    })
  }

  private uploadTarget(): UploadTarget {
    return {
      url: this.app.options.ingestPoint + '/v1/web/images',
      token: this.app.session.getSessionToken() ?? '',
      framesSupport: !!this.options.framesSupport,
    }
  }

  private flushSnapshot(id: number, snapshot: CanvasSnapshot) {
    if (snapshot.images.length === 0) {
      return
    }
    this.uploader.push(
      { images: snapshot.images, canvasId: id, createdAt: snapshot.createdAt },
      this.uploadTarget(),
      !!this.options.isDebug,
    )
    snapshot.images = []
  }

  private initRestart = () => {
    this.app.debug.log('Restarting tracker; token expired')
    this.app.stop(false)
    setTimeout(() => {
      void this.app.start({}, true)
    }, 250)
  }

  private saveLocally = (name: string, buffer: ArrayBuffer) => {
    const url = URL.createObjectURL(new Blob([buffer]))
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  private cleanupCanvas(id: number) {
    const observer = this.observers.get(id)
    if (observer) {
      observer.disconnect()
      this.observers.delete(id)
    }

    const drawHook = this.drawHooks.get(id)
    if (drawHook) {
      drawHook.unhook()
      this.drawHooks.delete(id)
    }

    const dummy = this.snapshots[id]?.dummy
    if (dummy) {
      dummy.width = 0
      dummy.height = 0
    }
    delete this.snapshots[id]
    this.worker?.postMessage({ type: 'drop', canvasId: id } satisfies ToCanvasWorker)

    if (this.timer && Object.keys(this.snapshots).length === 0) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  clear() {
    Object.keys(this.snapshots).forEach((key) => {
      const id = Number(key)
      this.flushSnapshot(id, this.snapshots[id])
    })
    this.worker?.postMessage({
      type: 'flush',
      target: this.uploadTarget(),
      debug: !!this.options.isDebug,
    } satisfies ToCanvasWorker)

    Object.keys(this.snapshots).forEach((key) => {
      this.cleanupCanvas(Number(key))
    })
    // observers of canvases that never became visible would start recording after stop
    this.observers.forEach((observer) => observer.disconnect())
    this.observers.clear()
    this.snapshots = {}
    // pending uploads keep going in the background
  }
}

export default CanvasRecorder
