import styles from './screen.module.css';
import Cursor from './Cursor';

import type { Point, Dimensions } from './types';

export type State = Dimensions;

export const INITIAL_STATE: State = {
  width: 0,
  height: 0,
};

export enum ScaleMode {
  Embed,
  //AdjustParentWidth
  AdjustParentHeight,
}

function getElementsFromInternalPoint(doc: Document, { x, y }: Point): Element[] {
  // @ts-ignore (IE, Edge)
  if (typeof doc.msElementsFromRect === 'function') {
    // @ts-ignore
    return Array.prototype.slice.call(doc.msElementsFromRect(x, y)) || [];
  }

  if (typeof doc.elementsFromPoint === 'function') {
    return doc.elementsFromPoint(x, y);
  }
  const el = doc.elementFromPoint(x, y);
  return el ? [el] : [];
}

function getElementsFromInternalPointDeep(doc: Document, point: Point): Element[] {
  const elements = getElementsFromInternalPoint(doc, point);
  // is it performant though??
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (isIframe(el)) {
      const iDoc = el.contentDocument;
      if (iDoc) {
        const iPoint: Point = {
          x: point.x - el.clientLeft,
          y: point.y - el.clientTop,
        };
        elements.push(...getElementsFromInternalPointDeep(iDoc, iPoint));
      }
    }
  }
  return elements;
}

function isIframe(el: Element): el is HTMLIFrameElement {
  return el.tagName === 'IFRAME';
}

export default class Screen {
  readonly overlay: HTMLDivElement;
  readonly cursor: Cursor;
  private selectionTargets: { start?: HTMLDivElement; end?: HTMLDivElement } = {
    start: undefined,
    end: undefined,
  };

  private readonly iframe: HTMLIFrameElement;
  private readonly screen: HTMLDivElement;
  private parentElement: HTMLElement | null = null;
  private onUpdateHook: (w: number, h: number) => void;

  constructor(isMobile: boolean, private scaleMode: ScaleMode = ScaleMode.Embed) {
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

    this.cursor = new Cursor(this.overlay, isMobile); // TODO: move outside
  }

  addMobileStyles() {
    this.iframe.className = styles.mobileIframe;
    this.screen.className = styles.mobileScreen;
  }

  addFullscreenBoundary() {
    this.screen.className = styles.mobileScreenFullview;
  }

  clean() {
    this.iframe?.remove?.();
    this.overlay?.remove?.();
    this.screen?.remove?.();
  }

  attach(parentElement: HTMLElement) {
    if (this.parentElement) {
      this.parentElement = null;
      console.warn('BaseScreen: reattaching the screen.');
    }

    parentElement.appendChild(this.screen);
    this.parentElement = parentElement;
  }

  addToBody(el: HTMLElement) {
    if (this.document) {
      this.document.body.style.margin = '0';
      this.document.body.appendChild(el);
    }
  }

  getParentElement(): HTMLElement | null {
    return this.parentElement;
  }

  setBorderStyle(style: { outline: string }) {
    return Object.assign(this.screen.style, style);
  }

  get window(): WindowProxy | null {
    return this.iframe.contentWindow;
  }

  get document(): Document | null {
    return this.iframe.contentDocument;
  }

  get iframeStylesRef(): CSSStyleDeclaration {
    return this.iframe.style;
  }

  public boundingRect: DOMRect | null = null;

  private getBoundingClientRect(): DOMRect {
    if (this.boundingRect === null) {
      // TODO: use this.screen instead in order to separate overlay functionality
      return (this.boundingRect = this.screen.getBoundingClientRect()); // expensive operation?
    }
    return this.boundingRect;
  }

  getInternalViewportCoordinates({ x, y }: Point): Point {
    const { x: overlayX, y: overlayY, width } = this.getBoundingClientRect();

    const screenWidth = this.screen.offsetWidth;

    const scale = screenWidth / width;
    const screenX = (x - overlayX) * scale;
    const screenY = (y - overlayY) * scale;

    return { x: Math.round(screenX), y: Math.round(screenY) };
  }

  getCurrentScroll(): Point {
    const docEl = this.document?.documentElement;
    const x = docEl ? docEl.scrollLeft : 0;
    const y = docEl ? docEl.scrollTop : 0;
    return { x, y };
  }

  getInternalCoordinates(p: Point): Point {
    const { x, y } = this.getInternalViewportCoordinates(p);

    const sc = this.getCurrentScroll();

    return { x: x + sc.x, y: y + sc.y };
  }

  getElementFromInternalPoint({ x, y }: Point): Element | null {
    // elementFromPoint && elementFromPoints require viewpoint-related coordinates,
    //                                                 not document-related
    return this.document?.elementFromPoint(x, y) || null;
  }

  getElementsFromInternalPoint(point: Point): Element[] {
    const doc = this.document;
    if (!doc) {
      return [];
    }
    return getElementsFromInternalPointDeep(doc, point);
  }

  getElementFromPoint(point: Point): Element | null {
    return this.getElementFromInternalPoint(this.getInternalViewportCoordinates(point));
  }

  getElementBySelector(selector: string) {
    if (!selector) return null;
    try {
      const safeSelector = selector.replace(/\//g, '\\/');
      return this.document?.querySelector<HTMLElement>(safeSelector) || null;
    } catch (e) {
      console.error('Can not select element. ', e);
      return null;
    }
  }

  display(flag: boolean = true) {
    this.screen.style.display = flag ? '' : 'none';
  }

  displayFrame(flag: boolean = true) {
    this.iframe.style.display = flag ? '' : 'none';
  }

  private scaleRatio: number = 1;

  getScale() {
    return this.scaleRatio;
  }

  scale({ height, width }: Dimensions) {
    if (!this.parentElement) return;
    const { offsetWidth, offsetHeight } = this.parentElement;

    let translate = '';
    let posStyles = {};
    switch (this.scaleMode) {
      case ScaleMode.Embed:
        this.scaleRatio = Math.min(offsetWidth / width, offsetHeight / height);
        translate = 'translate(-50%, -50%)';
        posStyles = { height: height + 'px' };
        break;
      case ScaleMode.AdjustParentHeight:
        // we want to scale the document with true height so the clickmap will be scrollable
        const usedHeight =
          this.document?.body.offsetHeight && this.document?.body.offsetHeight > height
            ? this.document.body.offsetHeight + 'px'
            : height + 'px';
        this.scaleRatio = offsetWidth / width;
        translate = 'translate(-50%, 0)';
        posStyles = { top: 0, height: usedHeight };
        break;
    }

    if (this.scaleRatio > 1) {
      this.scaleRatio = 1;
    } else {
      this.scaleRatio = Math.round(this.scaleRatio * 1e3) / 1e3;
    }

    if (this.scaleMode === ScaleMode.AdjustParentHeight) {
      this.parentElement.style.height = this.scaleRatio * height + 'px';
    }

    Object.assign(this.screen.style, posStyles, {
      width: width + 'px',
      transform: `scale(${this.scaleRatio}) ${translate}`,
    });
    Object.assign(this.iframe.style, posStyles, {
      width: width + 'px',
    });

    this.boundingRect = this.screen.getBoundingClientRect();
    this.onUpdateHook?.(width, height);
  }

  setOnUpdate(cb: any) {
    this.onUpdateHook = cb;
  }

  public createSelection(start: HTMLDivElement, end: HTMLDivElement) {
    this.selectionTargets = { start, end };

    this.overlay.appendChild(start);
    this.overlay.appendChild(end);

    setTimeout(() => {
      start.className = styles.highlightoff;
      end.className = styles.highlightoff;
    }, 750);
  }

  public updateOverlayStyle(style: Partial<CSSStyleDeclaration>) {
    Object.assign(this.overlay.style, style);
  }

  public clearSelection() {
    if (this.selectionTargets.start && this.selectionTargets.end) {
      this.overlay.removeChild(this.selectionTargets.start);
      this.overlay.removeChild(this.selectionTargets.end);
      this.selectionTargets.start.remove();
      this.selectionTargets.end.remove();
      this.selectionTargets = { start: undefined, end: undefined };
    }
  }
}
