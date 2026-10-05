import styles from './screen.module.css';
import Cursor from './Cursor';
import SelectDropdown from './SelectDropdown';

import type { Point, Dimensions } from './types';
import { isHTMLElement, isSelectElement } from '../../guards';
import { getDocumentOffset, getElementsFromPointDeep } from './frameGeometry';

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

type UpdateHook = (w: number, h: number) => void;

export default class Screen {
  readonly overlay: HTMLDivElement;
  readonly cursor: Cursor;
  readonly selectMenu: SelectDropdown;
  private selectionTargets: Element[] = [];
  private readonly iframe: HTMLIFrameElement;
  private readonly screen: HTMLDivElement;
  private parentElement: HTMLElement | null = null;
  private onUpdateHook: UpdateHook | undefined;
  private lastDimensions: Dimensions | null = null;

  constructor(
    private readonly isMobile: boolean,
    private scaleMode: ScaleMode = ScaleMode.Embed,
  ) {
    const iframe = document.createElement('iframe');
    iframe.className = styles.iframe;
    // These flags are fixed when the browsing
    // context is created, so this MUST be set before the iframe is attached.
    // No allow-scripts: a crafted recording then can never execute JS in the
    // app origin, whatever slips past sanitize.ts. That also disables scripting
    // for the document, which stops <canvas> from painting its bitmap — see
    // CanvasManager#paintFrame for how replayed canvases are rendered instead.
    iframe.setAttribute('sandbox', 'allow-same-origin');
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
    this.selectMenu = new SelectDropdown(this.overlay, () => this.window);
  }

  private remoteControlActive = false;

  /**
   * During remote control the agent drives the real <select> (native picker via
   * showPicker on their own gesture), so the synthetic replay picker must stay
   * out of the way. Toggled by the assist RemoteControl.
   */
  setRemoteControlActive(active: boolean): void {
    this.remoteControlActive = active;
    if (active) {
      this.selectMenu.hide();
    }
  }

  /**
   * Reflect a recorded click on a native <select>: show a synthetic option list
   * approximating the open picker (the real one can't be reopened during replay
   * — it needs a user gesture). Any other click target dismisses it.
   */
  showSelectMenu(node: Node | null | undefined): void {
    if (this.remoteControlActive) {
      return;
    }
    if (isSelectElement(node)) {
      this.selectMenu.open(node);
    } else {
      this.selectMenu.hide();
    }
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
    if (this.clickHighlightTimeout) {
      clearTimeout(this.clickHighlightTimeout);
      this.clickHighlightTimeout = undefined;
    }
    this.clickHighlightBox = null;
    this.selectMenu.remove(); // clears its pending timer + scroll listener
    this.onUpdateHook = undefined;
    this.iframe?.remove?.();
    this.overlay?.remove?.();
    this.screen?.remove?.();
    this.parentElement = null;
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

  /**
   * Whether scripting is enabled for the replay document — i.e. whether a
   * <canvas> in it will paint its bitmap at all. False under the sandbox above.
   * See CanvasManager#paintFrame for why canvas replay needs to know.
   */
  get scriptingEnabled(): boolean {
    const sandbox = this.iframe.getAttribute('sandbox');
    return sandbox === null || sandbox.split(/\s+/).includes('allow-scripts');
  }

  get document(): Document | null {
    return this.iframe.contentDocument;
  }

  get iframeStylesRef(): CSSStyleDeclaration {
    return this.iframe.style;
  }

  private getBoundingClientRect(): DOMRect {
    // Always re-read: the player can move (host scroll, panels, banners) without scale() being called.
    return this.screen.getBoundingClientRect();
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
    return getElementsFromPointDeep(doc, point);
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

  getLastDimensions(): Dimensions | null {
    return this.lastDimensions;
  }

  scale({ height, width }: Dimensions) {
    if (!this.parentElement) return;
    this.lastDimensions = { width, height };
    const { offsetWidth, offsetHeight } = this.parentElement;

    let translate = '';
    let posStyles = {};
    switch (this.scaleMode) {
      case ScaleMode.Embed:
        this.scaleRatio = Math.min(offsetWidth / width, offsetHeight / height);
        translate = 'translate(-50%, -50%)';
        posStyles = { height: `${height}px` };
        break;
      case ScaleMode.AdjustParentHeight:
        // we want to scale the document with true height so the clickmap will be scrollable
        const usedHeight =
          this.document?.body.scrollHeight &&
          this.document?.body.scrollHeight > height
            ? this.document.body.scrollHeight + 'px'
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
      this.parentElement.style.height = `${this.scaleRatio * height}px`;
    }

    Object.assign(this.screen.style, posStyles, {
      width: `${width}px`,
      transform: `scale(${this.scaleRatio}) ${translate}`,
    });
    Object.assign(this.iframe.style, posStyles, {
      width: `${width}px`,
    });

    this.onUpdateHook?.(width, height);
  }

  setOnUpdate(cb: UpdateHook | null) {
    this.onUpdateHook = cb ?? undefined;
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

  private clickHighlightBox: HTMLDivElement | null = null;
  private clickHighlightTimeout?: ReturnType<typeof setTimeout>;

  /**
   * Timer/screenshot mode only: draw red corner brackets around the clicked
   * element for ~500ms so the click target is captured by a 2fps frame.
   * Rendered in the overlay (not the iframe doc — vdom patches would wipe it).
   * The overlay shares the cursor's coordinate space (viewport px, scaled by the
   * screen transform), so element viewport rects map straight through; only
   * nested-iframe offsets need adding.
   */
  public highlightClick(node?: Node | null): void {
    if (!isHTMLElement(node)) return;

    const rect = node.getBoundingClientRect();
    if (!rect.width && !rect.height) return;

    // A click inside a nested iframe still has to line up in the overlay.
    const offset = getDocumentOffset(node.ownerDocument, this.window);
    const left = rect.left + offset.x;
    const top = rect.top + offset.y;

    if (this.clickHighlightTimeout) {
      clearTimeout(this.clickHighlightTimeout);
    }
    this.clickHighlightBox?.remove();

    const box = document.createElement('div');
    Object.assign(box.style, {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      pointerEvents: 'none',
      zIndex: '2147483647',
    });

    const arm = 12; // bracket arm length, px
    const thick = 3; // border thickness, px
    const red = `${thick}px solid #cc0000`;
    const corners: Array<Partial<CSSStyleDeclaration>> = [
      { top: '0', left: '0', borderTop: red, borderLeft: red },
      { top: '0', right: '0', borderTop: red, borderRight: red },
      { bottom: '0', left: '0', borderBottom: red, borderLeft: red },
      { bottom: '0', right: '0', borderBottom: red, borderRight: red },
    ];
    corners.forEach((pos) => {
      const corner = document.createElement('div');
      Object.assign(corner.style, {
        position: 'absolute',
        width: `${arm}px`,
        height: `${arm}px`,
        ...pos,
      });
      box.appendChild(corner);
    });

    this.overlay.appendChild(box);
    this.clickHighlightBox = box;
    this.clickHighlightTimeout = setTimeout(() => {
      box.remove();
      this.clickHighlightBox = null;
      this.clickHighlightTimeout = undefined;
    }, 750);
  }

  private highlightedElement: HTMLElement | null = null;
  private highlightPrevOutline: string = '';

  public highlightElement(node: HTMLElement | null) {
    if (this.highlightedElement) {
      this.highlightedElement.style.outline = this.highlightPrevOutline;
      this.highlightedElement = null;
      this.highlightPrevOutline = '';
    }
    if (node) {
      this.highlightPrevOutline = node.style.outline;
      node.style.outline = '3px solid #394EFF';
      this.highlightedElement = node;
    }
  }
}
