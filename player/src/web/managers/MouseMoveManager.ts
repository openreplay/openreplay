import { MOUSE_TRAIL } from '../../constants';
import type Screen from '../Screen/Screen';
import type { MouseMove } from '../messages';
import { HOVER_CLASSNAME } from '../messages/rewriter/constants';
import ListWalker from '../../common/ListWalker';
import MouseTrail from '../addons/MouseTrail';
import styles from './trail.module.css';

export default class MouseMoveManager extends ListWalker<MouseMove> {
  private hoverElements: Array<Element> = [];

  private mouseTrail: MouseTrail | undefined;

  private readonly canvas: HTMLCanvasElement;

  private readonly removeMouseTrail: boolean = false;

  constructor(private screen: Screen) {
    super();
    const canvas = document.createElement('canvas');
    canvas.id = 'openreplay-mouse-trail';
    canvas.className = styles.canvas;
    this.canvas = canvas;

    this.removeMouseTrail = localStorage.getItem(MOUSE_TRAIL) === 'false';
    if (!this.removeMouseTrail) {
      this.mouseTrail = new MouseTrail(canvas);
    }

    this.screen.overlay.appendChild(canvas);
    this.mouseTrail?.createContext();

    this.screen.setOnUpdate(this.updateSize);
    // A manager re-created mid-session would otherwise keep the default 300x150 canvas until the next resize.
    const dims = this.screen.getLastDimensions();
    if (dims) {
      this.updateSize(dims.width, dims.height);
    }
  }

  private updateSize = (w: number, h: number) =>
    this.mouseTrail?.resizeCanvas(w, h);

  private getCursorTargets() {
    return this.screen.getElementsFromInternalPoint(this.current!);
  }

  private updateHover(): void {
    const curHoverElements = this.getCursorTargets();
    const diffAdd = curHoverElements.filter(
      (elem) => !this.hoverElements.includes(elem),
    );
    const diffRemove = this.hoverElements.filter(
      (elem) => !curHoverElements.includes(elem),
    );
    this.hoverElements = curHoverElements;
    diffAdd.forEach((elem) => {
      elem.classList.add(HOVER_CLASSNAME);
    });
    diffRemove.forEach((elem) => {
      elem.classList.remove(HOVER_CLASSNAME);
    });
  }

  private clearHover(): void {
    this.hoverElements.forEach((elem) => {
      elem.classList.remove(HOVER_CLASSNAME);
    });
    this.hoverElements = [];
  }

  /** Call on rewind/seek-back: drops stale :hover classes and the trail. */
  clearTrail(): void {
    this.clearHover();
    this.mouseTrail?.clear();
  }

  reset(): void {
    super.reset();
    this.clearTrail();
  }

  destroy(): void {
    this.clearHover();
    this.mouseTrail?.destroy();
    this.mouseTrail = undefined;
    this.canvas.remove();
    this.screen.setOnUpdate(null);
  }

  move(t: number) {
    const lastMouseMove = this.moveGetLast(t);
    if (lastMouseMove) {
      this.screen.cursor.move(lastMouseMove);
      // window.getComputedStyle(this.screen.getCursorTarget()).cursor === 'pointer' // might influence performance though
      this.updateHover();
      this.mouseTrail?.leaveTrail(lastMouseMove.x, lastMouseMove.y);
    }
  }
}
