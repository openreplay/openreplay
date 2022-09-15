export default class AnnotationCanvas {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null = null
  private painting = false
  constructor() {
    this.canvas = document.createElement('canvas')
    Object.assign(this.canvas.style, {
      position: 'fixed',
      left: 0,
      top: 0,
      pointerEvents: 'none',
      zIndex: 2147483647 - 2,
    })
  }

  private readonly resizeCanvas = () => {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  private lastPosition: [number, number] = [0,0,]
  start = (p: [number, number]) => {
    this.painting = true
    this.clrTmID && clearTimeout(this.clrTmID)
    this.lastPosition = p
  }

  stop = () => {
    if (!this.painting) { return }
    this.painting = false
    this.fadeOut()
  }

  move = (p: [number, number])  =>{
    if (!this.ctx || !this.painting) { return }
    this.ctx.globalAlpha = 1.0
    this.ctx.beginPath()
    this.ctx.moveTo(this.lastPosition[0], this.lastPosition[1])
    this.ctx.lineTo(p[0], p[1])
    this.ctx.lineWidth = 8
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
    this.ctx.strokeStyle = 'red'
    this.ctx.stroke()
    this.lastPosition = p
  }

  clrTmID: ReturnType<typeof setTimeout> | null = null
  private fadeOut() {
    let timeoutID: ReturnType<typeof setTimeout>
    const fadeStep = () => {
      if (!this.ctx || this.painting ) { return }
      this.ctx.globalCompositeOperation = 'destination-out'
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      this.ctx.globalCompositeOperation = 'source-over'
      timeoutID = setTimeout(fadeStep,100)
    }
    this.clrTmID = setTimeout(() => {
      clearTimeout(timeoutID)
      this.ctx &&
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }, 4000)
    fadeStep()
  }


  mount() {
    document.body.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')
    window.addEventListener('resize', this.resizeCanvas)
    this.resizeCanvas()
  }

  remove() {
    if (this.canvas.parentNode){
      this.canvas.parentNode.removeChild(this.canvas)
    }
    window.removeEventListener('resize', this.resizeCanvas)
  }
}
