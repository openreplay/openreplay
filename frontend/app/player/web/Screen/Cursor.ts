import type { Point } from './types';
import styles from './cursor.module.css';


export default class Cursor {
  private readonly cursor: HTMLDivElement;
  private tagElement: HTMLDivElement;
  constructor(overlay: HTMLDivElement, isMobile: boolean) {
    this.cursor = document.createElement('div');
    this.cursor.className = styles.cursor;
    if (isMobile) this.cursor.style.backgroundImage = 'unset'
    overlay.appendChild(this.cursor);
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
    this.cursor.style.left = x + 'px';
    this.cursor.style.top = y + 'px';
  }

  click() {
    this.cursor.classList.add(styles.clicked)
    setTimeout(() => {
      this.cursor.classList.remove(styles.clicked)
    }, 600)
  }

  // TODO (to keep on a different playig speed):
  // transition
  // setTransitionSpeed()

}
