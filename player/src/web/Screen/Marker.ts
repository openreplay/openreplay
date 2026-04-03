import { finder } from '@medv/finder';
import type Screen from './Screen';
import styles from './marker.module.css';

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
  return String(str).replace(
    /[&<>"'`=\/]/g,
    (s) =>
      // @ts-ignore
      metaCharsMap[s],
  );
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

  private readonly selectorCache = new WeakMap<Element, string>();

  constructor(
    private readonly overlay: HTMLElement,
    private readonly screen: Screen,
  ) {
    this.tooltip = document.createElement('div');
    this.tooltip.className = styles.tooltip;
    this.tooltipSelector = document.createElement('div');
    this.tooltipHint = document.createElement('div');
    this.tooltipHint.innerText = '(click to tag element)';
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

  private getSimpleDescription(el: Element): string {
    const tag = el.tagName.toLowerCase();
    if (el.id) return `${tag}#${el.id}`;
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\s+/).join('.');
      if (classes) return `${tag}.${classes}`;
    }
    return tag;
  }

  private computeFinderSelector(el: Element): string {
    const cached = this.selectorCache.get(el);
    if (cached) {
      this.lastSelector = cached;
      return cached;
    }
    if (!this.screen.document) return '';
    try {
      const selector = finder(el, {
        root: this.screen.document.body,
        seedMinLength: 3,
        optimizedMinLength: 2,
        threshold: 1000,
        maxNumberOfTries: 10_000,
      });
      this.selectorCache.set(el, selector);
      this.lastSelector = selector;
      return selector;
    } catch (e) {
      console.warn('finder failed, using fallback selector', e);
      const fallback = this.getSimpleDescription(el);
      this.lastSelector = fallback;
      return fallback;
    }
  }

  computeSelector(): string {
    if (this._target) {
      return this.computeFinderSelector(this._target);
    }
    return this.lastSelector;
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
    this.marker.style.left = `${rect.left}px`;
    this.marker.style.top = `${rect.top}px`;
    this.marker.style.width = `${rect.width}px`;
    this.marker.style.height = `${rect.height}px`;

    const replayScale = this.screen.getScale();
    if (replayScale < 1) {
      const upscale = (1 / replayScale).toFixed(3);
      const yShift = ((1 - replayScale) / 2) * 100;
      this.tooltip.style.transform = `scale(${upscale}) translateY(-${yShift + 0.5}%)`;
    }
    this.tooltipSelector.textContent = this.selector
      ? this.selector
      : this.getSimpleDescription(this._target);
  }

  clean() {
    this.marker.remove();
  }
}
