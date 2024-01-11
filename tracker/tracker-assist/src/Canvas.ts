
export default class CanvasRecorder {
  stream: MediaStream | null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly canvasId: number,
    private readonly fps: number,
    private readonly onStream: (stream: MediaStream) => void,
    private readonly logError: (...args: any[]) => void,
  ) {
    const stream = this.canvas.captureStream(this.fps)
    this.emitStream(stream)
  }

  restart() {
    // this.stop()
    const stream = this.canvas.captureStream(this.fps)
    this.stream = stream
    this.emitStream(stream)
  }

  toggleLocal(stream: MediaStream) {
    const possibleVideoEl = document.getElementById('canvas-or-testing')
    if (possibleVideoEl) {
      document.body.removeChild(possibleVideoEl)
    }
    const video = document.createElement('video')
    video.width = 520
    video.height = 400
    video.id = 'canvas-or-testing'
    video.setAttribute('autoplay', 'true')
    video.setAttribute('muted', 'true')
    video.setAttribute('playsinline', 'true')
    video.crossOrigin = 'anonymous'
    document.body.appendChild(video)

    video.srcObject = stream

    void video.play()
    video.addEventListener('error', (e) => {
      this.logError('Video error:', e)
    })
  }

  emitStream(stream?: MediaStream) {
    if (stream) {
      return this.onStream(stream)
    }
    if (this.stream) {
      this.onStream(this.stream)
    } else {
      this.logError('no stream for canvas', this.canvasId)
    }
  }

  stop() {
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
  }
}
