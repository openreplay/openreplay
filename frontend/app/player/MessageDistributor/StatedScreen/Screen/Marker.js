import styles from './marker.css';

export default class Marker {
  _target = null;
  _selector = null;

  constructor(overlay, screen) {
    this.screen = screen;
    
    const marker = document.createElement('div');
    marker.className = styles.marker;
    const markerL = document.createElement('div');
    const markerR = document.createElement('div');
    const markerT = document.createElement('div');
    const markerB = document.createElement('div');
    markerL.className = styles.markerL;
    markerR.className = styles.markerR;
    markerT.className = styles.markerT;
    markerB.className = styles.markerB;
    marker.appendChild(markerL);
    marker.appendChild(markerR);
    marker.appendChild(markerT);
    marker.appendChild(markerB);

    overlay.appendChild(marker);
    this._marker = marker;
  }

  get target() {
    return this._target;
  }

  mark(element) {
    if (this._target === element) {
      return;
    }
    this._target = element;
    this._selector = null;
    this.redraw();
  }

  unmark() {
    this.mark(null);
  }

  _autodefineTarget() { // TODO: put to Screen
    if (this._selector) {
      try {
        const fitTargets = this.screen.document.querySelectorAll(this._selector);
        if (fitTargets.length === 0) {
          this._target = null;
        } else {
          this._target = fitTargets[ 0 ];
          const cursorTarget = this.screen.getCursorTarget();
          fitTargets.forEach((target) => {
            if (target.contains(cursorTarget)) {
              this._target = target;
            }
          });
        }
      } catch(e) {
        console.info(e);
      }
    } else {
      this._target = null;
    }
  }

  markBySelector(selector) {
    this._selector = selector;
    this._autodefineTarget();
    this.redraw();
  }

  redraw() {
    if (this._selector) {
      this._autodefineTarget();
    }
    if (!this._target) {
      this._marker.style.display = 'none';
      return;
    }
    const rect = this._target.getBoundingClientRect();
    this._marker.style.display = 'block';
    this._marker.style.left = rect.left + 'px';
    this._marker.style.top = rect.top + 'px';
    this._marker.style.width = rect.width + 'px';
    this._marker.style.height = rect.height + 'px';
  }

} 