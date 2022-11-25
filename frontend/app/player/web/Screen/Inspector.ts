import type Screen from './Screen'
import type Marker from './Marker'

//import { select } from 'optimal-select';

export default class Inspector {
  // private captureCallbacks = [];
  // private bubblingCallbacks = [];
  constructor(private screen: Screen, private marker: Marker) {}

  private onMouseMove = (e: MouseEvent) => {
    // const { overlay } = this.screen;
    // if (!overlay.contains(e.target)) {
    //   return;
    // }

    e.stopPropagation();

    const target = this.screen.getElementFromPoint(e);
    if (target === this.marker.target) {
      return;
    }

    this.marker.mark(target);
  }

  private onOverlayLeave = () => {
    return this.marker.unmark();
  }

  private onMarkClick = () => {
    let target = this.marker.target;
    if (!target) {
      return
    }
    this.clickCallback && this.clickCallback({ target });
    // const targets = [ target ];
    // while (target.parentElement !== null) {
    //   target = target.parentElement;
    //   targets.push(target);
    // }
    // for (let i = targets.length - 1; i >= 0; i--) {
    //   for (let j = 0; j < this.captureCallbacks.length; j++) {
    //     this.captureCallbacks[j]({ target: targets[i] });
    //   }
    // }

    // onTargetClick(select(markedTarget, { root: this.screen.document }));
  }

  // addClickListener(callback, useCapture = false) {
  //   if (useCapture) {
  //     this.captureCallbacks.push(callback);
  //   } else {
  //     //this.bubblingCallbacks.push(callback);
  //   }
  // }

  private clickCallback: (e: { target: Element }) => void | null = null
  enable(clickCallback?: Inspector['clickCallback']) {
    this.screen.overlay.addEventListener('mousemove', this.onMouseMove)
    this.screen.overlay.addEventListener('mouseleave', this.onOverlayLeave)
    this.screen.overlay.addEventListener('click', this.onMarkClick)
  }
  clean() {
    this.screen.overlay.removeEventListener('mousemove', this.onMouseMove)
    this.screen.overlay.removeEventListener('mouseleave', this.onOverlayLeave)
    this.screen.overlay.removeEventListener('click', this.onMarkClick)
  }
}
