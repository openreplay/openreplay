import type Screen from './Screen';
import styles from './marker.module.css';
import { finder } from '@medv/finder';

const metaCharsMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

function escapeHtml(str: string) {
  return String(str).replace(/[&<>"'`=\/]/g, function (s) {
    // @ts-ignore
    return metaCharsMap[s];
  });
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeString(string: string) {
  return escapeHtml(escapeRegExp(string));
}

export default class Marker {
  private _target: Element | null = null;
  private selector: string | null = null;
  private readonly tooltip: HTMLDivElement;
  private readonly tooltipSelector: HTMLDivElement;
  private readonly tooltipHint: HTMLDivElement;
  private marker: HTMLDivElement;

  constructor(private readonly overlay: HTMLElement, private readonly screen: Screen) {
    this.tooltip = document.createElement('div');
    this.tooltip.className = styles.tooltip;
    this.tooltipSelector = document.createElement('div');
    this.tooltipHint = document.createElement('div');
    this.tooltipHint.innerText = '(click to tag element)'
    this.tooltipHint.className = styles.tooltipHint;
    this.tooltip.append(this.tooltipSelector, this.tooltipHint);

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

    marker.appendChild(this.tooltip);

    overlay.appendChild(marker);
    this.marker = marker;
  }

  get target() {
    return this._target;
  }

  mark(element: Element | null) {
    if (this._target === element) {
      return;
    }
    this._target = element;
    this.selector = null;
    this.redraw();
  }

  unmark() {
    this.mark(null);
  }

  private autodefineTarget() {
    if (this.selector && this.screen.document) {
      try {
        const fitTargets = this.screen.document.querySelectorAll(this.selector);
        if (fitTargets.length === 0) {
          this._target = null;
        } else {
          this._target = fitTargets[0];
          // const cursorTarget = this.screen.getCursorTarget();
          // fitTargets.forEach((target) => {
          //   if (target.contains(cursorTarget)) {
          //     this._target = target;
          //   }
          // });
        }
      } catch (e) {
        console.info(e);
      }
    } else {
      this._target = null;
    }
  }

  markBySelector(selector: string) {
    this.selector = selector;
    this.lastSelector = selector;
    this.autodefineTarget();
    this.redraw();
  }

  lastSelector = '';
  private getTagString(el: Element) {
    if (!this.screen.document) return '';
    const selector = finder(el, {
      root: this.screen.document.body,
      seedMinLength: 3,
      optimizedMinLength: 2,
      threshold: 1000,
      maxNumberOfTries: 10_000,
    });
    this.lastSelector = selector;
    return selector
  }

  redraw() {
    if (this.selector) {
      this.autodefineTarget();
    }
    if (!this._target) {
      this.marker.style.display = 'none';
      return;
    }
    const rect = this._target.getBoundingClientRect();
    this.marker.style.display = 'block';
    this.marker.style.left = rect.left + 'px';
    this.marker.style.top = rect.top + 'px';
    this.marker.style.width = rect.width + 'px';
    this.marker.style.height = rect.height + 'px';

    const replayScale = this.screen.getScale()
    if (replayScale < 1) {
      const upscale = (1 / replayScale).toFixed(3);
      const yShift = ((1 - replayScale)/2) * 100;
      this.tooltip.style.transform = `scale(${upscale}) translateY(-${yShift + 0.5}%)`
    }
    this.tooltipSelector.textContent = this.getTagString(this._target);
  }


  clean() {
    this.marker.remove();
  }
}
