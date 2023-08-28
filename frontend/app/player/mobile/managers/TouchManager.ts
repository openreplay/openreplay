import {MOUSE_TRAIL} from "App/constants/storageKeys";
import ListWalker from 'Player/common/ListWalker';
import MouseTrail from 'Player/web/addons/MouseTrail';
import styles from 'Player/web/managers/trail.module.css';
import type {IosClickEvent, IosSwipeEvent} from 'Player/web/messages';
import {MType} from "Player/web/messages";
import type Screen from 'Player/web/Screen/Screen';

export default class TouchManager extends ListWalker<IosClickEvent | IosSwipeEvent> {
  private touchTrail: MouseTrail | undefined;
  private readonly removeTouchTrail: boolean = false;

  constructor(private screen: Screen) {
    super();
    const canvas = document.createElement('canvas');
    canvas.id = 'openreplay-touch-trail';
    canvas.className = styles.canvas;

    this.removeTouchTrail = localStorage.getItem(MOUSE_TRAIL) === 'false'
    if (!this.removeTouchTrail) {
      this.touchTrail = new MouseTrail(canvas)
    }

    this.screen.overlay.appendChild(canvas);
    this.touchTrail?.createContext();

    const updateSize = (w: number, h: number) => {
      return this.touchTrail?.resizeCanvas(w, h);
    }

    this.screen.setOnUpdate(updateSize);
  }

  public move(t: number) {
    const lastTouch = this.moveGetLast(t)
    if (!!lastTouch) {
      this.screen.cursor.move(lastTouch)
      this.screen.cursor.click()
      if (lastTouch.tp === MType.IosSwipeEvent) {
        const startCoords = calculateTrail({
          x: lastTouch.x,
          y: lastTouch.y,
          direction: lastTouch.direction
        } as Swipe)
        this.touchTrail?.leaveTrail(startCoords.x, startCoords.y)
        this.touchTrail?.leaveTrail(lastTouch.x, lastTouch.y)
      }
    }
  }

}


interface Swipe {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
}
const trailLength = 15
function calculateTrail({ x, y, direction }: Swipe) {
  switch (direction) {
    case 'up':
      return { x, y: y - trailLength };
    case 'down':
      return { x, y: y + trailLength };
    case 'left':
      return { x: x - trailLength, y };
    case 'right':
      return { x: x + trailLength, y };
    default:
      return { x, y };
  }
}