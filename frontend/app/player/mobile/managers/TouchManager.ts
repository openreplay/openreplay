import ListWalker from 'Player/common/ListWalker';
import type Screen from 'Player/web/Screen/Screen';
import MouseTrail from 'Player/web/addons/MouseTrail';
import type { MobileClickEvent, MobileSwipeEvent } from 'Player/web/messages';
import { MType } from 'Player/web/messages';

import { MOUSE_TRAIL } from 'App/constants/storageKeys';

export default class TouchManager extends ListWalker<
  MobileClickEvent | MobileSwipeEvent
> {
  private touchTrail: MouseTrail | undefined;

  private readonly removeTouchTrail: boolean = false;

  constructor(private screen: Screen) {
    super();
    const canvas = document.createElement('canvas');
    canvas.id = 'openreplay-touch-trail';
    // canvas.className = styles.canvas;

    this.removeTouchTrail = localStorage.getItem(MOUSE_TRAIL) === 'false';
    if (!this.removeTouchTrail) {
      this.touchTrail = new MouseTrail(canvas, true);
    }

    this.screen.overlay.appendChild(canvas);
    this.touchTrail?.createContext();
  }

  public updateDimensions({
    width,
    height,
  }: {
    width: number;
    height: number;
  }) {
    return this.touchTrail?.resizeCanvas(width, height);
  }

  public move(t: number) {
    const lastTouch = this.moveGetLast(t);
    if (lastTouch) {
      if (lastTouch.tp === MType.MobileSwipeEvent) {
        // not using swipe rn
        // this.touchTrail?.createSwipeTrail({
        //   x: lastTouch.x,
        //   y: lastTouch.y,
        //   direction: lastTouch.direction
        // } as SwipeEvent)
      } else {
        this.touchTrail?.addTouch(lastTouch.x, lastTouch.y);
        // this.screen.cursor.move(lastTouch);
        // this.screen.cursor.mobileClick();
      }
    }
  }
}
