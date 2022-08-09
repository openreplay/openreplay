type XY = [number, number]


export default class Mouse {
  private readonly mouse: HTMLDivElement
  private position: [number,number] = [0,0,]
  constructor() {
    this.mouse = document.createElement('div')
    Object.assign(this.mouse.style, {
      width: '20px',
      height: '20px',
      opacity: '.4',
      borderRadius: '50%',
      position: 'absolute',
      zIndex: '999998',
      background: 'radial-gradient(red, transparent)',
    })
  }

  mount() {
    document.body.appendChild(this.mouse)
    window.addEventListener('scroll', this.handleWScroll)
    window.addEventListener('resize', this.resetLastScrEl)
  }

  move(pos: XY) {
    if (this.position[0] !== pos[0] || this.position[1] !== pos[1]) {
      this.resetLastScrEl()
    }

    this.position = pos
    Object.assign(this.mouse.style, {
      left: `${pos[0] || 0}px`,
      top: `${pos[1] || 0}px`,
    })

  }

  getPosition(): XY {
    return this.position
  }

  click(pos: XY) {
    const el = document.elementFromPoint(pos[0], pos[1])
    if (el instanceof HTMLElement) {
      el.click()
      el.focus()
      return el
    }
    return null
  }

  private readonly pScrEl = document.scrollingElement || document.documentElement // Is it always correct
  private lastScrEl: Element | 'window' | null = null
  private readonly resetLastScrEl = () => { this.lastScrEl = null }
  private readonly handleWScroll = e => {
    if (e.target !== this.lastScrEl &&
      this.lastScrEl !== 'window') {
      this.resetLastScrEl()
    }
  }
  scroll(delta: XY) {
    // what would be the browser-like logic?
    const [mouseX, mouseY,] = this.position
    const [dX, dY,] = delta

    let el = this.lastScrEl

    // Scroll the same one 
    if (el instanceof Element) {
      el.scrollLeft += dX
      el.scrollTop += dY
      return  // TODO: if not scrolled
    }
    if (el === 'window') {
      window.scroll(this.pScrEl.scrollLeft + dX, this.pScrEl.scrollTop + dY)
      return
    }

    el = document.elementFromPoint(
      mouseX-this.pScrEl.scrollLeft, 
      mouseY-this.pScrEl.scrollTop,
    )
    while (el) {
      // el.scrollTopMax > 0 // available in firefox
      if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) { 
        const styles = getComputedStyle(el)
        if (styles.overflow.indexOf('scroll') >= 0 || styles.overflow.indexOf('auto') >= 0) { // returns true for body in habr.com but it's not scrollable
          const esl = el.scrollLeft
          const est = el.scrollTop
          el.scrollLeft += dX
          el.scrollTop += dY
          if (esl !== el.scrollLeft || est !== el.scrollTop) { // doesn't work if the scroll-behavior is "smooth"
            this.lastScrEl = el
            return
          }
        }
      }
      el = el.parentElement
    }

    // If not scrolled
    window.scroll(this.pScrEl.scrollLeft + dX, this.pScrEl.scrollTop + dY)
    this.lastScrEl = 'window'
  }

  remove() {
    if (this.mouse.parentElement) {
      document.body.removeChild(this.mouse)
    }
    window.removeEventListener('scroll', this.handleWScroll)
    window.removeEventListener('resize', this.resetLastScrEl)
  }
}
