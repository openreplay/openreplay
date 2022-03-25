import styles from './screen.css';
import { getState } from '../../../store';

import type { Point } from './types';


export interface State {
  width: number;
  height: number;
}

export const INITIAL_STATE: State = {
  width: 0,
  height: 0,
}


export default abstract class BaseScreen {
  public    readonly overlay: HTMLDivElement;
  private   readonly iframe: HTMLIFrameElement;
  protected   readonly screen: HTMLDivElement;
  protected parentElement: HTMLElement | null = null;
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
    this.screen = screen;
  }

  attach(parentElement: HTMLElement) {
    if (this.parentElement) {
      throw new Error("BaseScreen: Trying to attach an attached screen.");
    }

    parentElement.appendChild(this.screen);

    this.parentElement = parentElement;
    // parentElement.onresize = this.scale;
    window.addEventListener('resize', this.scale);  
    this.scale();

    /* == For the Inspecting Document content  == */
    this.overlay.addEventListener('contextmenu', () => {
      this.overlay.style.display = 'none'
      const doc = this.document
      if (!doc) { return }
      const returnOverlay = () => {
        this.overlay.style.display = 'block'
        doc.removeEventListener('mousemove', returnOverlay)
        doc.removeEventListener('mouseclick', returnOverlay) // TODO: prevent default in case of input selection
      }
      doc.addEventListener('mousemove', returnOverlay)
      doc.addEventListener('mouseclick', returnOverlay)
    })
  }

  get window(): WindowProxy | null {
    return this.iframe.contentWindow;
  }

  get document(): Document | null {
    return this.iframe.contentDocument;
  }

  private boundingRect: DOMRect | null  = null;
  private getBoundingClientRect(): DOMRect {
     if (this.boundingRect === null) {
      return this.boundingRect = this.overlay.getBoundingClientRect() // expensive operation?
    }
    return this.boundingRect
  }

  getInternalViewportCoordinates({ x, y }: Point): Point {
    const { x: overlayX, y: overlayY, width } = this.getBoundingClientRect();

    const screenWidth = this.overlay.offsetWidth;

    const scale = screenWidth / width;
    const screenX = (x - overlayX) * scale;
    const screenY = (y - overlayY) * scale;

    return { x: Math.round(screenX), y: Math.round(screenY) };
  }

  getCurrentScroll(): Point {
    const docEl = this.document?.documentElement
    const x = docEl ? docEl.scrollLeft : 0
    const y = docEl ? docEl.scrollTop : 0
    return { x, y }
  }

  getInternalCoordinates(p: Point): Point {
    const { x, y } = this.getInternalViewportCoordinates(p);

    const sc = this.getCurrentScroll()

    return { x: x+sc.x, y: y+sc.y };
  }

  getElementFromInternalPoint({ x, y }: Point): Element | null {
    // elementFromPoint && elementFromPoints require viewpoint-related coordinates, 
    //                                                 not document-related
    return this.document?.elementFromPoint(x, y) || null;
  }

  getElementsFromInternalPoint({ x, y }: Point): Element[] {
    // @ts-ignore (IE, Edge)
    if (typeof this.document?.msElementsFromRect === 'function') {
      // @ts-ignore
      return Array.prototype.slice.call(this.document?.msElementsFromRect(x,y)) || [];
    }

    if (typeof this.document?.elementsFromPoint === 'function') {
      return this.document?.elementsFromPoint(x, y) || [];     
    }
    const el = this.document?.elementFromPoint(x, y);
    return el ? [ el ] : [];
  }

  getElementFromPoint(point: Point): Element | null {
    return this.getElementFromInternalPoint(this.getInternalViewportCoordinates(point));
  }

  getElementsFromPoint(point: Point): Element[] {
    return this.getElementsFromInternalPoint(this.getInternalViewportCoordinates(point));
  }

  getElementBySelector(selector: string): Element | null {
    if (!selector) return null;
    try {
      return this.document?.querySelector(selector) || null;
    } catch (e) {
      console.error("Can not select element. ", e)
      return null
    }
  }

  display(flag: boolean = true) {
    this.screen.style.display = flag ? '' : 'none';
  }

  displayFrame(flag: boolean = true) {
    this.iframe.style.display = flag ? '' : 'none';
  }

  private s: number = 1;
  getScale() {
    return this.s;
  }

  _scale() {
    if (!this.parentElement) return;
    const { height, width } = getState();
    const { offsetWidth, offsetHeight } = this.parentElement;

    this.s = Math.min(offsetWidth / width, offsetHeight / height);
    if (this.s > 1) {
      this.s = 1;
    } else {
      this.s = Math.round(this.s * 1e3) / 1e3;
    }
    this.screen.style.transform =  `scale(${ this.s }) translate(-50%, -50%)`;
    this.screen.style.width = width + 'px';
    this.screen.style.height =  height + 'px';
    this.iframe.style.width = width + 'px';
    this.iframe.style.height = height + 'px';

    this.boundingRect = this.overlay.getBoundingClientRect();
  }

  scale = () => { // TODO: solve classes inheritance issues in typescript
    this._scale();
  }


  clean() {
    window.removeEventListener('resize', this.scale);
  }
}