/**
 * Inspired by Bryan C (@bryjch at codepen)
 * */

const FRAME_MS = 1000 / 60;
/** Trail lifetime; the old frame-counted values (3.5 / 5) expressed in milliseconds at 60fps. */
const LINE_DURATION_MS = ((3.5 * 1000) / 60) * FRAME_MS;
const LINE_DURATION_MOBILE_MS = ((5 * 1000) / 60) * FRAME_MS;
const LINE_WIDTH_START = 5;

const TOUCH_PULSE_MS = 60 * FRAME_MS;
const TOUCH_PULSE_BASE_RADIUS = 8;
const TOUCH_PULSE_PEAK_RADIUS = 22;
const TOUCH_PULSE_ALPHA = 0.35;
const TOUCH_PULSE_Y_OFFSET = TOUCH_PULSE_PEAK_RADIUS;

export type SwipeEvent = {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
};

type Point = { x: number; y: number; born: number };
type TouchPulse = { x: number; y: number; born: number };

/**
 * Draws on its own canvas only while there is something to draw: the frame
 * loop stops once every point has faded and restarts on the next point.
 */
export default class MouseTrail {
  public isActive = true;

  public context: CanvasRenderingContext2D;

  private readonly lineDuration: number;

  private points: Point[] = [];

  private touchPulses: TouchPulse[] = [];

  private frameId = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    isNativeMobile: boolean = false,
  ) {
    this.lineDuration = isNativeMobile
      ? LINE_DURATION_MOBILE_MS
      : LINE_DURATION_MS;
  }

  resizeCanvas = (w: number, h: number) => {
    if (this.context !== undefined) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  };

  createContext = () => {
    if (this.canvas) {
      this.context = this.canvas.getContext('2d')!;
    } else {
      console.error('Canvas element not found');
    }
  };

  leaveTrail = (x: number, y: number) => {
    this.addPoint(x + 7, y + 7);
  };

  addPoint = (x: number, y: number) => {
    this.points.push({ x, y, born: performance.now() });
    this.schedule();
  };

  addTouch = (x: number, y: number) => {
    this.touchPulses.push({
      x,
      y: y + TOUCH_PULSE_Y_OFFSET,
      born: performance.now(),
    });
    this.schedule();
  };

  /** Drops everything drawn so far (e.g. on seek, so no streak joins the old and new position). */
  clear = () => {
    this.points = [];
    this.touchPulses = [];
    this.context?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  destroy = () => {
    this.isActive = false;
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.points = [];
    this.touchPulses = [];
    this.canvas.remove();
  };

  private schedule() {
    if (!this.frameId && this.isActive && this.context) {
      this.frameId = requestAnimationFrame(this.frame);
    }
  }

  private frame = () => {
    this.frameId = 0;
    if (!this.isActive) return;
    this.draw(performance.now());
    if (this.points.length || this.touchPulses.length) {
      this.schedule();
    }
  };

  private draw(now: number) {
    const ctx = this.context;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.lineJoin = 'round';

    // compact in place: splicing inside the loop would skip the next point
    const { points } = this;
    let kept = 0;
    let lastPoint: Point | undefined;
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const inc = (now - point.born) / this.lineDuration; // 0 to 1 over the lifetime
      if (inc > 1) continue;
      points[kept++] = point;
      const from = lastPoint ?? point;
      lastPoint = point;

      ctx.lineWidth = LINE_WIDTH_START * (1 - inc);
      ctx.strokeStyle = `rgba(60, 170, 170, ${1 - inc})`;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.closePath();
    }
    points.length = kept;

    this.drawTouchPulses(now);
  }

  private drawTouchPulses(now: number) {
    const pulses = this.touchPulses;
    let kept = 0;
    for (let i = 0; i < pulses.length; i++) {
      const pulse = pulses[i];
      const t = (now - pulse.born) / TOUCH_PULSE_MS;
      if (t > 1) continue;
      pulses[kept++] = pulse;

      const wave = Math.sin(Math.PI * t);
      const radius =
        TOUCH_PULSE_BASE_RADIUS +
        (TOUCH_PULSE_PEAK_RADIUS - TOUCH_PULSE_BASE_RADIUS) * wave;
      this.context.beginPath();
      this.context.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
      this.context.fillStyle = `rgba(128, 128, 128, ${TOUCH_PULSE_ALPHA * wave})`;
      this.context.fill();
      this.context.closePath();
    }
    pulses.length = kept;
  }
}
