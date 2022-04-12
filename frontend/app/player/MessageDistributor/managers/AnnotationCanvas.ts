export default class AnnotationCanvas {
  readonly canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null = null
  private painting: boolean = false
  constructor() {
    this.canvas = document.createElement('canvas')
    Object.assign(this.canvas.style, {
      position: "fixed",
      cursor: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAYAAAByUDbMAAAAAXNSR0IArs4c6QAAAWNJREFUOE+l1D1Lw1AUBuD35Catg5NzaCMRMilINnGok7sguLg4OlRcBTd/hqBVB0ed7KDgIPgXhJoaG10Kgk4a83EkhcYYktimd703z31zzuESSqwGIDs1bRvAIiRcWrZ9ETFUwhJ6XTsDsPH7Le1bz08H42JkGMa09+W2CVhKBmHC7jhYlOgUTPdUEa3Q86+SIDN/j4olf43BtJMFjoJl1AgMUJMUcRInZHT+w7KgYakGoDxVafmue0hBsJeLmaapvPffziFhraDjDMKWZdvHRaNRlCi2mUNHYl55dBwrDysFZWGloTQ2EZTEJoZiTFXVmaos34Ixn9e5qNgCaHR6vW7emcFozNVmN1ERbfb9myww3bVCTK9rPsDrpCh37HnXAC3Ek5lqf9ErM0im1zUG8BmGtCqq4mEIjppoeEESA5g/JIkaLMuv7AVHEgfNohqlU/7Fol3mPodiufvS7Yz7cP4ARjbPWyYPZSMAAAAASUVORK5CYII=') 0 20, crosshair",
      left: 0,
      top: 0,
      //zIndex: 2147483647 - 2,
    })
  }

  isPainting() {
    return this.painting
  }

  private resizeCanvas = () => {
    if (!this.canvas.parentElement) { return }
    this.canvas.width = this.canvas.parentElement.offsetWidth
    this.canvas.height = this.canvas.parentElement.offsetHeight
  }

  private lastPosition: [number, number] = [0,0]
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
    this.ctx.lineCap = "round"
    this.ctx.lineJoin = "round"
    this.ctx.strokeStyle = "red"
    this.ctx.stroke()
    this.lastPosition = p
  }

  clrTmID: ReturnType<typeof setTimeout> | null = null
  private fadeOut() {
    let timeoutID: ReturnType<typeof setTimeout>
    const fadeStep = () => {
      if (!this.ctx || this.painting ) { return }
      this.ctx.globalCompositeOperation = 'destination-out'
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.1)"
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      this.ctx.globalCompositeOperation = 'source-over'
      timeoutID = setTimeout(fadeStep,100)
    }
    this.clrTmID = setTimeout(() => {
      clearTimeout(timeoutID)
      this.ctx &&
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }, 3700)
    fadeStep()
  }

  mount(parent: HTMLElement) {
    parent.appendChild(this.canvas)
    this.ctx = this.canvas.getContext("2d")
    window.addEventListener("resize", this.resizeCanvas)
    this.resizeCanvas()
  }

  remove() {
    if (this.canvas.parentNode){
      this.canvas.parentNode.removeChild(this.canvas)
    }
    window.removeEventListener("resize", this.resizeCanvas)
  }
}