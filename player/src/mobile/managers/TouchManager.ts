import { MOUSE_TRAIL } from '../../constants';
import ListWalker from '../../common/ListWalker';
import MouseTrail, { SwipeEvent } from '../../web/addons/MouseTrail';
import type { MobileClickEvent, MobileSwipeEvent } from '../../web/messages';
import { MType } from '../../web/messages';
import type Screen from '../../web/Screen/Screen';

export default class TouchManager extends ListWalker<
  MobileClickEvent | MobileSwipeEvent
> {
  private touchTrail: MouseTrail | undefined;

  private readonly removeTouchTrail: boolean = false;

  /**
   * Touch coordinates arrive in the device's own logical points, but the canvas
   * is sized to the phone shell picked by `mapIphoneModel`. Those only agree
   * when the device is in that lookup table, so anything newer than the newest
   * entry needs its coordinates scaled or the cursor drifts from the content.
   */
  private scaleX = 1;

  private scaleY = 1;

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
    sourceWidth,
    sourceHeight,
  }: {
    width: number;
    height: number;
    sourceWidth?: number;
    sourceHeight?: number;
  }) {
    this.scaleX = sourceWidth && sourceWidth > 0 ? width / sourceWidth : 1;
    this.scaleY = sourceHeight && sourceHeight > 0 ? height / sourceHeight : 1;
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
        this.touchTrail?.addTouch(
          lastTouch.x * this.scaleX,
          lastTouch.y * this.scaleY,
        );
        // this.screen.cursor.move(lastTouch);
        // this.screen.cursor.mobileClick();
      }
    }
  }
}
