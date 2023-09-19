import type { Point } from './types';
import styles from './cursor.module.css';


export default class Cursor {
  private readonly isMobile: boolean;
  private readonly cursor: HTMLDivElement;
  private tagElement: HTMLDivElement;
  private coords = { x: 0, y: 0 };
  private isMoving = false;
  private onClick: () => void;

  constructor(overlay: HTMLDivElement, isMobile: boolean) {
    this.cursor = document.createElement('div');
    this.cursor.className = styles.cursor;
    if (isMobile) this.cursor.style.backgroundImage = 'unset'
    overlay.appendChild(this.cursor);
    this.isMobile = isMobile;
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
      this.tagElement = document.createElement('div')
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
      })
      this.cursor.appendChild(this.tagElement)
    }

    if (!tag) {
      this.tagElement.style.display = 'none'
    } else {
      this.tagElement.style.display = 'block'
      const nameStr = tag.length > 10 ? tag.slice(0, 9) + '...' : tag
      this.tagElement.innerHTML = `<span>${nameStr}</span>`
    }
  }

  move({ x, y }: Point) {
    this.isMoving = true;
    this.cursor.style.left = x + 'px';
    this.cursor.style.top = y + 'px';
    this.coords = { x, y };
    setTimeout(() => this.isMoving = false, 60)
  }

  setDefaultStyle() {
    this.cursor.style.width = 18 + 'px'
    this.cursor.style.height = 30 + 'px'
    this.cursor.style.transition = 'top .125s linear, left .125s linear'
  }

  shake() {
    this.cursor.classList.add(styles.shaking)
    setTimeout(() => {
      this.cursor.classList.remove(styles.shaking)
    }, 500)
  }

  click() {
    const styleList = styles.clicked
    this.cursor.classList.add(styleList)
    this.onClick?.()
    setTimeout(() => {
      this.cursor.classList.remove(styleList)
    }, 600)
  }

  clickTimeout?: NodeJS.Timeout
  mobileClick() {
    const styleList = styles.mobileTouch
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout)
      this.cursor.classList.remove(styleList)
      this.clickTimeout = undefined
    }
    this.cursor.classList.add(styleList)
    this.onClick?.()
    this.clickTimeout = setTimeout(() => {
      this.cursor.classList.remove(styleList)
      this.clickTimeout = undefined
    }, 600)
  }

  setOnClickHook(callback: () => void) {
    this.onClick = callback
  }

}
