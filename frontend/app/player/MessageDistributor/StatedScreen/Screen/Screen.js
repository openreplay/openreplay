import Marker from './Marker';
import Cursor from './Cursor';
import Inspector from './Inspector'; 
import styles from './screen.css';
import { getState } from '../../../store';

export const INITIAL_STATE = {
  width: 0,
  height: 0,
}

export default class Screen {
  constructor() {
    const iframe = document.createElement('iframe');
    iframe.className = styles.iframe;
    this.iframe = iframe;

    const overlay = document.createElement('div');
    overlay.className = styles.overlay;
    this.overlay = overlay;

    const screen = document.createElement('div');
    screen.className = styles.screen;
    screen.appendChild(iframe);
    screen.appendChild(overlay);
    this._screen = screen;

    this.marker = new Marker(overlay, this);
    this.cursor = new Cursor(overlay, this);
    this.inspector = new Inspector(this);
  }

  attach(parentElement) {
    parentElement.appendChild(this._screen);

    this._parentElement = parentElement;
    // parentElement.onresize = this.scale;
    window.addEventListener('resize', this.scale);  
    this.scale();
  }

  get window() {
    return this.iframe.contentWindow;
  }

  get document() {
    return this.iframe.contentDocument;
  }

  _getInternalCoordinates({ x, y }) {
    const { x: overlayX, y: overlayY, width } = this.overlay.getBoundingClientRect();
    const screenWidth = this.overlay.offsetWidth;

    const scale = screenWidth / width;
    const screenX = (x - overlayX) * scale;
    const screenY = (y - overlayY) * scale;
    return { x: screenX, y: screenY };
  }

  getElementFromInternalPoint(coords) {
    const { x, y } = this._getInternalCoordinates(coords);
    return this.document.elementFromPoint(x, y);
  }

  getElementsFromInternalPoint({ x, y }) {
    // IE, Edge
    if (typeof this.document.msElementsFromRect === 'function') {
      return Array.prototype.slice.call(this.document.msElementsFromRect(x,y)) || [];
    }

    if (typeof this.document.elementsFromPoint === 'function') {
      return this.document.elementsFromPoint(x, y) || [];     
    }
    const node = this.document.elementFromPoint(x, y);
    return node ? [ node ] : [];
  }

  getElementFromPoint(coords){
    return this.getElementFromInternalPoint(this._getInternalCoordinates(coords));
  }

  getElementsFromPoint(coords){
    return this.getElementsFromInternalPoint(this._getInternalCoordinates(coords));
  }

  display(flag = true) {
    this._screen.style.display = flag ? '' : 'none';
  }

  displayFrame(flag = true) {
    this.iframe.style.display = flag ? '' : 'none';
  }

  scale = () => {
    if (!this._parentElement) return;
    let s = 1;
    const { height, width } = getState();
    const { offsetWidth, offsetHeight } = this._parentElement;

    s = Math.min(offsetWidth / width, offsetHeight / height);
    if (s > 1) {
      s = 1;
    } else {
      s = Math.round(s * 1e3) / 1e3;
    }

    this._screen.style.transform =  `scale(${ s }) translate(-50%, -50%)`;
    this._screen.style.width = width + 'px';
    this._screen.style.height =  height + 'px';
  }

  clean() {
    window.removeEventListener('resize', this.scale);
  }
}