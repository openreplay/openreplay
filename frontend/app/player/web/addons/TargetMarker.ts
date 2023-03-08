import type Screen from '../Screen/Screen'
import type { Point } from '../Screen/types'
import type { Store } from '../../common/types'
import { clickmapStyles } from './clickmapStyles'

const zIndexMap = {
  400: 3,
  200: 4,
  100: 5,
  50: 6
}
const widths = Object.keys(zIndexMap)
  .map(s => parseInt(s, 10))
  .sort((a,b) => b - a) as [400, 200, 100, 50]

function getOffset(el: Element, innerWindow: Window) {
	const rect = el.getBoundingClientRect();
	return {
		fixedLeft: rect.left + innerWindow.scrollX,
		fixedTop: rect.top + innerWindow.scrollY,
		rect,
	};
}

interface BoundingRect {
	top: number,
	left: number,
	width: number,
	height: number,
}

export interface MarkedTarget {
	boundingRect: BoundingRect,
	el: Element,
	selector: string,
	count: number,
	index: number,
	active?: boolean,
	percent: number
}

export interface State {
	markedTargets: MarkedTarget[] | null,
	activeTargetIndex: number,
}


export default class TargetMarker {
  private clickMapOverlay: HTMLDivElement | null = null
  private clickContainers: HTMLDivElement[] = []
  private smallClicks: HTMLDivElement[] = []
	static INITIAL_STATE: State = {
		markedTargets: null,
		activeTargetIndex: 0
	}

	constructor(
		private readonly screen: Screen,
		private readonly store: Store<State>,
	) {}

	updateMarkedTargets() {
    const { markedTargets } = this.store.get()
    if (markedTargets) {
      this.store.update({
        markedTargets: markedTargets.map((mt: any) => ({
          ...mt,
          boundingRect: this.calculateRelativeBoundingRect(mt.el),
        })),
      });
    }
  }

  private calculateRelativeBoundingRect(el: Element): BoundingRect {
  	const parentEl = this.screen.getParentElement()
    if (!parentEl) return {top:0, left:0, width:0,height:0} //TODO: can be initialized(?) on mounted screen only
    const { top, left, width, height } = el.getBoundingClientRect()
    const s = this.screen.getScale()
    const screenRect = this.screen.overlay.getBoundingClientRect() //this.screen.getBoundingClientRect() (now private)
    const parentRect = parentEl.getBoundingClientRect()

    return {
      top: top*s + screenRect.top - parentRect.top,
      left: left*s + screenRect.left - parentRect.left,
      width: width*s,
      height: height*s,
    }
  }

  setActiveTarget(index: number) {
    const window = this.screen.window
    const markedTargets: MarkedTarget[] | null = this.store.get().markedTargets
    const target = markedTargets && markedTargets[index]
    if (target && window) {
      const { fixedTop, rect } = getOffset(target.el, window)
      const scrollToY = fixedTop - window.innerHeight / 1.5
      if (rect.top < 0 || rect.top > window.innerHeight) {
        // behavior hack TODO: fix it somehow when they will decide to remove it from browser api
        // @ts-ignore
        window.scrollTo({ top: scrollToY, behavior: 'instant' })
        setTimeout(() => {
          if (!markedTargets) { return }
          this.store.update({
            markedTargets: markedTargets.map(t => t === target ? {
                ...target,
                boundingRect:  this.calculateRelativeBoundingRect(target.el),
              } : t)
          })
        }, 0)
      }

    }
    this.store.update({ activeTargetIndex: index });
  }

  private actualScroll: Point | null = null
  markTargets(selections: { selector: string, count: number }[] | null) {
    if (selections) {
      const totalCount = selections.reduce((a, b) => {
        return a + b.count
      }, 0);
      const markedTargets: MarkedTarget[] = [];
      let index = 0;
      selections.forEach((s) => {
        const el = this.screen.getElementBySelector(s.selector);
        if (!el) return;

        markedTargets.push({
          ...s,
          el,
          index: index++,
          percent: Math.round((s.count * 100) / totalCount),
          boundingRect:  this.calculateRelativeBoundingRect(el),
          count: s.count,
        })
      });
      this.actualScroll = this.screen.getCurrentScroll()
      this.store.update({ markedTargets });
    } else {
      if (this.actualScroll) {
        this.screen.window?.scrollTo(this.actualScroll.x, this.actualScroll.y)
        this.actualScroll = null
      }
      this.store.update({ markedTargets: null });
    }
  }


  injectTargets(
    selections: { selector: string, count: number, clickRage?: boolean }[] | null,
    onMarkerClick?: (selector: string, innerText: string) => void,
  ) {
    if (selections) {
      const totalCount = selections.reduce((a, b) => {
        return a + b.count
      }, 0);

      this.clickMapOverlay?.remove()
      const overlay = document.createElement("div")
      const iframeSize = this.screen.iframeStylesRef
      const scaleRatio = this.screen.getScale()
      Object.assign(overlay.style, clickmapStyles.overlayStyle({ height: iframeSize.height, width: iframeSize.width, scale: scaleRatio }))

      this.clickMapOverlay = overlay
      selections.forEach((s, i) => {
        const el = this.screen.getElementBySelector(s.selector);
        if (!el) return;

        const bubbleContainer = document.createElement("div")
        const {top, left, width, height} = el.getBoundingClientRect()
        const totalClicks = document.createElement("div")
        totalClicks.innerHTML = `${s.count} ${s.count !== 1 ? 'Clicks' : 'Click'}`
        Object.assign(totalClicks.style, clickmapStyles.totalClicks)

        const percent = document.createElement("div")
        percent.style.fontSize = "14px"
        percent.innerHTML = `${Math.round((s.count * 100) / totalCount)}% of the clicks recorded in this page`

        bubbleContainer.appendChild(totalClicks)
        bubbleContainer.appendChild(percent)
        const containerId = `clickmap-bubble-${i}`
        bubbleContainer.id = containerId
        this.clickContainers.push(bubbleContainer)
        const frameWidth = iframeSize.width.replace('px', '')

        // @ts-ignore
        Object.assign(bubbleContainer.style, clickmapStyles.bubbleContainer({ top, left: Math.max(100, frameWidth - left > 250 ? left : frameWidth - 220), height }))

        const border = document.createElement("div")

        let key = 0

        if (width > 50) {
          let diff = widths[key] - width
          while (diff > 0) {
            key++
            diff = widths[key] - width
          }
        } else {
          key = 3
        }
        const borderZindex = zIndexMap[widths[key]]

        Object.assign(border.style, clickmapStyles.highlight({ width, height, top, left, zIndex: borderZindex }))

        const smallClicksBubble = document.createElement("div")
        smallClicksBubble.innerHTML = `${s.count}`
        const smallClicksId =  containerId + '-small'
        smallClicksBubble.id = smallClicksId
        this.smallClicks.push(smallClicksBubble)

        border.onclick = (e) => {
          e.stopPropagation()
          const innerText = el.innerText.length > 25 ? `${el.innerText.slice(0, 20)}...` : el.innerText
          onMarkerClick?.(s.selector, innerText)
          this.clickContainers.forEach(container => {
            if (container.id === containerId) {
              container.style.visibility = "visible"
            } else {
              container.style.visibility = "hidden"
            }
          })
          this.smallClicks.forEach(container => {
            if (container.id !== smallClicksId) {
              container.style.visibility = "visible"
            } else {
              container.style.visibility = "hidden"
            }
          })
        }

        overlay.onclick = (e) => {
          e.stopPropagation()
          onMarkerClick?.('', '')
          this.clickContainers.forEach(container => {
            container.style.visibility = "hidden"
          })
          this.smallClicks.forEach(container => {
            container.style.visibility = "visible"
          })
        }

        Object.assign(smallClicksBubble.style, clickmapStyles.clicks({ top, height, isRage: s.clickRage, left }))

        border.appendChild(smallClicksBubble)
        overlay.appendChild(bubbleContainer)
        overlay.appendChild(border)
      });

      this.screen.getParentElement()?.appendChild(overlay)
    } else {
      this.store.update({ markedTargets: null });
      this.clickMapOverlay?.remove()
      this.clickMapOverlay = null
      this.smallClicks = []
      this.clickContainers = []
    }
  }

}
