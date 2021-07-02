//import { select } from 'optimal-select'; 

export default  class Inspector {
  //private callbacks;
  captureCallbacks = [];
  bubblingCallbacks = [];
  constructor(screen, marker) {
    this.screen = screen;
    this.marker = marker;
  }

  _onMouseMove = (e) => {    
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

  _onOverlayLeave = () => {
    return this.marker.unmark();
  }

  _onMarkClick = () => {
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

  toggle(flag, clickCallback) {
    this.clickCallback = clickCallback;
    if (flag) {
      this.screen.overlay.addEventListener('mousemove', this._onMouseMove);
      this.screen.overlay.addEventListener('mouseleave', this._onOverlayLeave);
      this.screen.overlay.addEventListener('click', this._onMarkClick);
    } else {
      this.screen.overlay.removeEventListener('mousemove', this._onMouseMove);
      this.screen.overlay.removeEventListener('mouseleave', this._onOverlayLeave);
      this.screen.overlay.removeEventListener('click', this._onMarkClick);
    }
  }
}