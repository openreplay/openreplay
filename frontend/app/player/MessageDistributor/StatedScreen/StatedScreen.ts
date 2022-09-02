import Screen, { INITIAL_STATE as SUPER_INITIAL_STATE, State as SuperState }  from './Screen/Screen';
import { update, getState } from '../../store';

import type { Point } from './Screen/types';

function getOffset(el: Element, innerWindow: Window) {
  const rect = el.getBoundingClientRect();
  return {
    fixedLeft: rect.left + innerWindow.scrollX,
    fixedTop: rect.top + innerWindow.scrollY,
    rect,
  };
}

//export interface targetPosition

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

export interface State extends SuperState {
  messagesLoading: boolean,
  cssLoading: boolean,
  disconnected: boolean,
  userPageLoading: boolean, 
  markedTargets: MarkedTarget[] | null,
  activeTargetIndex: number,
}

export const INITIAL_STATE: State = {
  ...SUPER_INITIAL_STATE,
  messagesLoading: false,
  cssLoading: false,
  disconnected: false,
  userPageLoading: false,
  markedTargets: null,
  activeTargetIndex: 0
};

export default class StatedScreen extends Screen {
  constructor() { super(); }

  setMessagesLoading(messagesLoading: boolean) {
    this.display(!messagesLoading);
    update({ messagesLoading });
  }

  setCSSLoading(cssLoading: boolean) {
    this.displayFrame(!cssLoading);
    update({ cssLoading });
  }

  setDisconnected(disconnected: boolean) {
    if (!getState().live) return; //?
    this.display(!disconnected);
    update({ disconnected });
  }

  setUserPageLoading(userPageLoading: boolean) {
    this.display(!userPageLoading);
    update({ userPageLoading });
  }

  setSize({ height, width }: { height: number, width: number }) {
    update({ width, height });
    this.scale();

    const { markedTargets } = getState();
    if (markedTargets) {
      update({
        markedTargets: markedTargets.map((mt: any) => ({ 
          ...mt, 
          boundingRect: this.calculateRelativeBoundingRect(mt.el),
        })),
      });
    }
  }

  private calculateRelativeBoundingRect(el: Element): BoundingRect {
    if (!this.parentElement) return {top:0, left:0, width:0,height:0} //TODO
    const { top, left, width, height } = el.getBoundingClientRect();
    const s = this.getScale();
    const scrinRect = this.screen.getBoundingClientRect();
    const parentRect = this.parentElement.getBoundingClientRect();

    return {
      top: top*s + scrinRect.top - parentRect.top,
      left: left*s + scrinRect.left - parentRect.left,
      width: width*s,
      height: height*s,
    }
  }

  setActiveTarget(index: number) {
    const window = this.window
    const markedTargets: MarkedTarget[] | null = getState().markedTargets
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
          update({
            markedTargets: markedTargets.map(t => t === target ? {
                ...target,
                boundingRect:  this.calculateRelativeBoundingRect(target.el),
              } : t)
          })
        }, 0)
      }
     
    }
    update({ activeTargetIndex: index });
  }

  private actualScroll: Point | null = null
  setMarkedTargets(selections: { selector: string, count: number }[] | null) {
    if (selections) {
      const totalCount = selections.reduce((a, b) => {
        return a + b.count
      }, 0);
      const markedTargets: MarkedTarget[] = [];
      let index = 0;
      selections.forEach((s) => {
        const el = this.getElementBySelector(s.selector);
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

      this.actualScroll = this.getCurrentScroll() 
      update({ markedTargets });
    } else {
      if (this.actualScroll) {
        this.window?.scrollTo(this.actualScroll.x, this.actualScroll.y)
        this.actualScroll = null
      }
      update({ markedTargets: null });
    }
  }
}
