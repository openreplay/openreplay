import type { Point } from './types';
import styles from './cursor.module.css';


export default class Cursor {
  private readonly cursor: HTMLDivElement;
  private nameElement: HTMLDivElement;
  private readonly position: Point = { x: -1, y: -1 }
  constructor(overlay: HTMLDivElement) {
    this.cursor = document.createElement('div');
    this.cursor.className = styles.cursor;
    overlay.appendChild(this.cursor);
  }

  toggle(flag: boolean) {
    if (flag) {
      this.cursor.style.display = 'block';
    } else {
      this.cursor.style.display = 'none';
    }
  }

  toggleUserName(name?: string) {
    if (!this.nameElement) {
      this.nameElement = document.createElement('div')
      Object.assign(this.nameElement.style, {
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
      this.cursor.appendChild(this.nameElement)
    }

    if (!name) {
      this.nameElement.style.display = 'none'
    } else {
      this.nameElement.style.display = 'block'
      const nameStr = name ? name.length > 10 ? name.slice(0, 9) + '...' : name : 'User'
      this.nameElement.innerHTML = `<span>${nameStr}</span>`
    }
  }

  move({ x, y }: Point) {
    this.position.x = x;
    this.position.y = y;
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

  getPosition(): Point {
    return { x: this.position.x, y: this.position.y };
  }

}
