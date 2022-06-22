import type { Point } from './types';
import styles from './cursor.module.css';


export default class Cursor {
  private readonly cursor: HTMLDivElement;
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