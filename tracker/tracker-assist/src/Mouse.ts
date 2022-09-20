type XY = [number, number]


export default class Mouse {
  private readonly mouse: HTMLDivElement
  private position: [number,number] = [0,0,]
  constructor(private readonly agentName?: string) {
    this.mouse = document.createElement('div')
    const agentBubble = document.createElement('div')
    const svg ='<svg version="1.1" width="20" height="20" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" xml:space="" viewBox="8.2 4.9 11.6 18.2"><polygon fill="#FFFFFF" points="8.2,20.9 8.2,4.9 19.8,16.5 13,16.5 12.6,16.6 "></polygon><polygon fill="#FFFFFF" points="17.3,21.6 13.7,23.1 9,12 12.7,10.5 "></polygon><rect x="12.5" y="13.6" transform="matrix(0.9221 -0.3871 0.3871 0.9221 -5.7605 6.5909)" width="2" height="8"></rect><polygon points="9.2,7.3 9.2,18.5 12.2,15.6 12.6,15.5 17.4,15.5 "></polygon></svg>'

    this.mouse.innerHTML = svg
    this.mouse.setAttribute('data-openreplay-hidden', '')
    Object.assign(agentBubble.style, {
      position: 'absolute',
      padding: '4px 5px',
      borderRadius: '4px',
      backgroundColor: '#394EFF',
      color: 'white',
      bottom: '-20px',
      left: '65%',
      fontSize: '12px',
      whiteSpace: 'nowrap',
    })

    const agentNameStr = this.agentName ? this.agentName.length > 10 ? this.agentName.slice(0, 9) + '...' : this.agentName : 'Agent'
    agentBubble.innerHTML = `<span>${agentNameStr}</span>`

    this.mouse.appendChild(agentBubble)

    Object.assign(this.mouse.style, {
      position: 'absolute',
      zIndex: '999998',
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
      // we're moving it off by few pixels
      // so the doc.elementFromPoint works
      left: `${(pos[0] || 0) + 3}px`,
      top: `${(pos[1] || 0) + 3}px`,
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
