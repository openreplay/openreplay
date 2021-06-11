import type { Point } from './types';
import styles from './cursor.css';


export default class Cursor {
  private readonly _cursor: HTMLDivElement;
  private position: Point = { x: 0, y: 0 }
  constructor(overlay: HTMLDivElement) {
    this._cursor = document.createElement('div');
    this._cursor.className = styles.cursor;
    overlay.appendChild(this._cursor);

    //this._click = document.createElement('div');
    //this._click.className = styles.click;
    //overlay.appendChild(this._click);
  }

  toggle(flag: boolean) {
    if (flag) {
      this._cursor.style.display = 'block';
    } else {
      this._cursor.style.display = 'none';
    }
  }

  move({ x, y }: Point) {
    this.position.x = x;
    this.position.y = y;
    this._cursor.style.left = x + 'px';
    this._cursor.style.top = y + 'px';
  }

  // click() {
  //   this._cursor.style.left = this._x + 'px';
  //   this._cursor.style.top = this._y + 'px';
  //   this._click.style.display = 'block';
  //   setTimeout(() => {
  //     this._click.style.display = "none";
  //   }, 2000);
  // }

  getPosition(): Point {
    return { x: this.position.x, y: this.position.y };
  }

} 