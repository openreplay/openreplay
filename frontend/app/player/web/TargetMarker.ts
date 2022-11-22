import type Screen from './Screen/Screen'
import type { Point } from './Screen/types'
import type { Store } from '../common/types'


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
	static INITIAL_STATE: State = {
		markedTargets: null,
		activeTargetIndex: 0
	}

	constructor(
		private readonly screen: Screen,
		private readonly store: Store<State>,
	) {}

	updateMarketTargets() {
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
    const scrinRect = this.screen.overlay.getBoundingClientRect() //this.screen.getBoundingClientRect() (now private)
    const parentRect = parentEl.getBoundingClientRect()

    return {
      top: top*s + scrinRect.top - parentRect.top,
      left: left*s + scrinRect.left - parentRect.left,
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

}