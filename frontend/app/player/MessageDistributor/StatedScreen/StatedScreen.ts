import Screen, { INITIAL_STATE as SUPER_INITIAL_STATE, State as SuperState }  from './Screen/Screen';
import { update, getState } from '../../store';


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
  active?: boolean
}

export interface State extends SuperState {
  messagesLoading: boolean,
  cssLoading: boolean,
  disconnected: boolean,
  userPageLoading: boolean, 
  markedTargets: MarkedTarget[] | null,
  activeTargetIndex: number
}

export const INITIAL_STATE: State = {
  ...SUPER_INITIAL_STATE,
  messagesLoading: false,
  cssLoading: false,
  disconnected: false,
  userPageLoading: false,
  markedTargets: [],
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
        markedTargets: markedTargets.map(mt => ({ 
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

  setActiveTarget(index) {    
    update({ activeTargetIndex: index });
  }

  setMarkedTargets(selections: { selector: string, count: number }[] | null) {
    if (selections) {
      const targets: MarkedTarget[] = [];
      selections.forEach((s, index) => {        
        const el = this.getElementBySelector(s.selector);
        if (!el) return;
        targets.push({
          ...s,
          el,
          index,
          boundingRect:  this.calculateRelativeBoundingRect(el),
        })
      });
      update({ markedTargets: targets });
    } else {
      update({ markedTargets: null });
    }
  }
}