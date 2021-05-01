import styles from './cursor.css';

export default class Cursor {
  constructor(overlay, screen) {
    this.screen = screen;
    this._cursor = document.createElement('div');
    this._cursor.className = styles.cursor;

    this._click = document.createElement('div');
    this._click.className = styles.click;

    overlay.appendChild(this._click);
    overlay.appendChild(this._cursor);
  }

  toggle(flag) {
    if (flag) {
      this._cursor.style.display = 'block';
    } else {
      this._cursor.style.display = 'none';
    }
  }

  move({ x, y }) {
    this._x = x;
    this._y = y;
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

  _getInternalCoordinates() {
    return { x: this._x, y: this._y };
  }

  getTarget() {
    return this.screen.getElementFromInternalPoint(this._getInternalCoordinates());
  }

  getTargets() {
    return this.screen.getElementsFromInternalPoint(this._getInternalCoordinates());
  }

} 