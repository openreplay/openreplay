import styles from './cursor.module.css';
import type { Point } from './types';

const CLICK_MS = 600;
const TIMER_CLICK_MS = 510;
const SHAKE_MS = 500;

// The individual `translate` property composes with the `transform` used by the
// shake/touch animations, and moving it doesn't trigger layout like top/left does.
const supportsTranslate =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('translate', '1px 1px');

export default class Cursor {
  private readonly isMobile: boolean;
  private readonly cursor: HTMLDivElement;
  private tagElement: HTMLDivElement;
  private coords = { x: 0, y: 0 };
  private onClick: () => void;
  private highlightCursor = false;
  private clickTimeout?: ReturnType<typeof setTimeout>;
  private clickClass: string | null = null;
  private shakeTimeout?: ReturnType<typeof setTimeout>;

  constructor(overlay: HTMLDivElement, isMobile: boolean) {
    this.cursor = document.createElement('div');
    this.cursor.className = styles.cursor;
    if (isMobile) this.cursor.style.backgroundImage = 'unset';
    overlay.appendChild(this.cursor);
    this.isMobile = isMobile;
    this.highlightCursor =
      new URLSearchParams(window.location.search).get('timer') === 'true';
  }

  toggle(flag: boolean) {
    if (flag) {
      this.cursor.style.display = 'block';
    } else {
      this.cursor.style.display = 'none';
    }
  }

  showTag(tag?: string) {
    if (!this.tagElement) {
      this.tagElement = document.createElement('div');
      Object.assign(this.tagElement.style, {
        position: 'absolute',
        padding: '4px 6px',
        borderRadius: '8px',
        backgroundColor: '#3EAAAF',
        color: 'white',
        bottom: '-25px',
        left: '80%',
        fontSize: '12px',
        whiteSpace: 'nowrap',
      });
      this.cursor.appendChild(this.tagElement);
    }

    if (!tag) {
      this.tagElement.style.display = 'none';
    } else {
      this.tagElement.style.display = 'block';
      const nameStr = tag.length > 10 ? `${tag.slice(0, 9)}...` : tag;
      const textTag = document.createTextNode(nameStr);
      this.tagElement.replaceChildren(textTag);
    }
  }

  move({ x, y }: Point) {
    if (supportsTranslate) {
      this.cursor.style.setProperty('translate', `${x}px ${y}px`);
    } else {
      this.cursor.style.left = `${x}px`;
      this.cursor.style.top = `${y}px`;
    }
    this.coords = { x, y };
  }

  setDefaultStyle() {
    this.cursor.style.width = `${18}px`;
    this.cursor.style.height = `${30}px`;
    this.cursor.style.transition = 'top .125s linear, left .125s linear';
  }

  shake() {
    if (this.shakeTimeout) {
      clearTimeout(this.shakeTimeout);
    }
    this.restartClass(styles.shaking);
    this.shakeTimeout = setTimeout(() => {
      this.cursor.classList.remove(styles.shaking);
      this.shakeTimeout = undefined;
    }, SHAKE_MS);
  }

  /** Re-adding a class that is still present would not restart its animation. */
  private restartClass(className: string) {
    if (this.cursor.classList.contains(className)) {
      this.cursor.classList.remove(className);
      void this.cursor.offsetWidth;
    }
    this.cursor.classList.add(className);
  }

  private flashClickClass(className: string, duration: number) {
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = undefined;
    }
    if (this.clickClass && this.clickClass !== className) {
      this.cursor.classList.remove(this.clickClass);
    }
    this.clickClass = className;
    this.restartClass(className);
    this.clickTimeout = setTimeout(() => {
      this.cursor.classList.remove(className);
      this.clickClass = null;
      this.clickTimeout = undefined;
    }, duration);
  }

  click(showTimerRing = true) {
    if (this.highlightCursor) {
      this.onClick?.();
      // In highlight mode the clicked element gets red brackets; the cursor ring
      // is only a fallback for when no element could be resolved.
      if (!showTimerRing) return;
      this.flashClickClass(styles.timerClicked, TIMER_CLICK_MS);
      return;
    }
    this.flashClickClass(styles.clicked, CLICK_MS);
    this.onClick?.();
  }

  mobileClick() {
    this.flashClickClass(styles.mobileTouch, CLICK_MS);
    this.onClick?.();
  }

  setOnClickHook(callback: () => void) {
    this.onClick = callback;
  }

  /** timer/screenshot mode (URL `timer=true`) — click gets a static red marker */
  get highlightMode(): boolean {
    return this.highlightCursor;
  }

  /** current cursor coords (viewport space) — matches the last mouse move */
  get position(): Point {
    return this.coords;
  }

}
