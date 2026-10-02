import { MOUSE_TRAIL } from '../../constants';
import ListWalker from '../../common/ListWalker';
import MouseTrail from '../../web/addons/MouseTrail';
import type { MobileClickEvent, MobileSwipeEvent } from '../../web/messages';
import { MType } from '../../web/messages';
import type Screen from '../../web/Screen/Screen';

/** Same window as web clicks: only touches this recent get a pulse. */
const TOUCH_PULSE_WINDOW = 600;

export default class TouchManager extends ListWalker<
  MobileClickEvent | MobileSwipeEvent
> {
  private touchTrail: MouseTrail | undefined;

  private canvas: HTMLCanvasElement | undefined;

  private lastT = 0;

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
    if (localStorage.getItem(MOUSE_TRAIL) === 'false') {
      return;
    }
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'openreplay-touch-trail';
    this.touchTrail = new MouseTrail(this.canvas, true);
    this.screen.overlay.appendChild(this.canvas);
    this.touchTrail.createContext();
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
    if (t < this.lastT) {
      this.touchTrail?.clear();
    }
    this.lastT = t;
    // swipes are stored but not drawn; a swipe must not hide a click in the same frame
    this.moveApply(t, (touch) => {
      if (
        touch.tp === MType.MobileClickEvent &&
        t - touch.time < TOUCH_PULSE_WINDOW
      ) {
        this.touchTrail?.addTouch(touch.x * this.scaleX, touch.y * this.scaleY);
      }
    });
  }

  public destroy() {
    this.touchTrail?.destroy();
    this.touchTrail = undefined;
    this.canvas?.remove();
    this.canvas = undefined;
  }
}
