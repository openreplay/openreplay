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
  // AdjustParentWidth
  AdjustParentHeight,
}

function getElementsFromInternalPoint(
  doc: Document,
  { x, y }: Point,
): Element[] {
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

function getElementsFromInternalPointDeep(
  doc: Document,
  point: Point,
): Element[] {
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
  private selectionTargets: Element[];
  private readonly iframe: HTMLIFrameElement;
  private readonly screen: HTMLDivElement;
  private scrollSpacer: HTMLDivElement | null = null;
  private parentElement: HTMLElement | null = null;
  private onUpdateHook: (w: number, h: number) => void;

  constructor(
    private readonly isMobile: boolean,
    private scaleMode: ScaleMode = ScaleMode.Embed,
  ) {
    const iframe = document.createElement('iframe');
    iframe.className = styles.iframe;
    this.iframe = iframe;

    const overlay = document.createElement('div');
    overlay.className = styles.overlay;
    this.overlay = overlay;
    this.overlay.dataset['testId'] = 'player-overlay';

    const screen = document.createElement('div');

    screen.className = styles.screen;
    screen.appendChild(iframe);
    screen.appendChild(overlay);
    this.screen = screen;

    this.cursor = new Cursor(this.overlay, isMobile); // TODO: move outside
  }

  addMobileStyles(stableTop?: boolean) {
    this.iframe.className = styles.mobileIframe;
    this.screen.className = styles.mobileScreen;
    if (stableTop) {
      this.screen.style.marginTop = '0px';
    }
    if (this.document) {
      Object.assign(this.document?.body.style, {
        margin: 0,
        overflow: 'hidden',
      });
    }
  }

  addFullscreenBoundary() {
    this.screen.className = styles.mobileScreenFullview;
  }

  clean() {
    this.iframe?.remove?.();
    this.overlay?.remove?.();
    this.screen?.remove?.();
    this.scrollSpacer?.remove?.();
  }

  getScaleMode(): ScaleMode {
    return this.scaleMode;
  }

  setScaleMode(mode: ScaleMode) {
    const prevMode = this.scaleMode;
    this.scaleMode = mode;

    if (prevMode === ScaleMode.AdjustParentHeight && mode === ScaleMode.Embed) {
      this.scrollSpacer?.remove?.();
    }
  }

  attach(parentElement: HTMLElement) {
    if (this.parentElement) {
      console.error(
        '!!! web/Screen.ts#108: Tried to reattach the parent element.',
      );
      return;
    }

    parentElement.appendChild(this.screen);
    this.parentElement = parentElement;
  }

  addToBody(el: HTMLElement) {
    if (this.document) {
      this.document.body.style.margin = '0';
      this.document.body.appendChild(el);
    } else {
      console.error('Attempt to add to player screen without document');
    }
  }

  addToScreen = (el: HTMLElement) => {
    this.screen.appendChild(el);
  };

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
    // not document-related
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
    return this.getElementFromInternalPoint(
      this.getInternalViewportCoordinates(point),
    );
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
        posStyles = { top: '50%', height: `${height}px` };
        break;
      case ScaleMode.AdjustParentHeight:
        // Scale the document with true height so the full page is scrollable
        const bodyScrollHeight = this.document?.body.scrollHeight || 0;
        const usedHeight =
          bodyScrollHeight && bodyScrollHeight > height
            ? bodyScrollHeight + 'px'
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
      // Use a spacer div to create scrollable area in the parent container.
      // The screen is position:absolute, so it doesn't contribute to scroll height.
      // The spacer is a normal-flow element that forces the parent to be scrollable.
      const bodyScrollHeight = this.document?.body.scrollHeight || 0;
      const contentHeight = bodyScrollHeight > height ? bodyScrollHeight : height;
      const scaledHeight = this.scaleRatio * contentHeight;

      if (!this.scrollSpacer) {
        this.scrollSpacer = document.createElement('div');
        this.scrollSpacer.style.pointerEvents = 'none';
        this.scrollSpacer.style.width = '1px';
        this.scrollSpacer.style.visibility = 'hidden';
      }
      this.scrollSpacer.style.height = `${scaledHeight}px`;
      if (this.parentElement && !this.scrollSpacer.parentElement) {
        this.parentElement.appendChild(this.scrollSpacer);
      }
    } else {
      // Remove spacer when not in AdjustParentHeight mode
      if (this.scrollSpacer?.parentElement) {
        this.scrollSpacer.remove();
      }
    }

    Object.assign(this.screen.style, posStyles, {
      width: `${width}px`,
      transform: `scale(${this.scaleRatio}) ${translate}`,
    });
    Object.assign(this.iframe.style, posStyles, {
      width: `${width}px`,
    });

    this.boundingRect = this.screen.getBoundingClientRect();
    this.onUpdateHook?.(width, height);
  }

  setOnUpdate(cb: any) {
    this.onUpdateHook = cb;
  }

  public createSelection(nodes: Element[]) {
    this.overlay.append(...nodes);
    this.selectionTargets = nodes;
  }

  public updateOverlayStyle(style: Partial<CSSStyleDeclaration>) {
    Object.assign(this.overlay.style, style);
  }

  public clearSelection() {
    this.selectionTargets?.forEach((el) => el.remove());
    this.selectionTargets = [];
  }
}
