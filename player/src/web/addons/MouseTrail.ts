/**
 * Inspired by Bryan C (@bryjch at codepen)
 * */

const FRAME_MS = 1000 / 60;
/** How long a recorded point stays in the trail: once the cursor rests, the
 *  tail closes on it in this time and the trail is gone. */
const TRAIL_MS = 400;
/** Half-widths at the tail and at the head, in screen pixels. */
const TAIL_HALF = 0.4;
const HEAD_HALF = 2.6;
const HEAD_ALPHA = 0.55;
/** Samples per curve between two recorded points. */
const STEPS = 8;

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
type Sample = { x: number; y: number; born: number };
type TouchPulse = { x: number; y: number; born: number };

/**
 * Draws on its own canvas only while there is something to draw: the frame
 * loop stops once every point has faded and restarts on the next point.
 */
export default class MouseTrail {
  public isActive = true;

  public context: CanvasRenderingContext2D;

  private points: Point[] = [];

  private color = '57, 78, 255';

  private touchPulses: TouchPulse[] = [];

  private frameId = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    isNativeMobile: boolean = false,
    /** the screen's scale: the ribbon keeps its width in screen pixels */
    private readonly getScale: () => number = () => 1,
    /** where the cursor is drawn now */
    private readonly getHead?: () => { x: number; y: number },
  ) {}

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

  /** the ribbon ends under the pointer's tip */
  leaveTrail = (x: number, y: number) => {
    this.addPoint(x, y);
  };

  addPoint = (x: number, y: number) => {
    if (reducedMotion()) return;
    if (!this.points.length) this.readColor();
    this.points.push({ x, y, born: performance.now() });
    this.schedule();
  };

  /** The drawings' accent, as the app's theme has it now. */
  private readColor() {
    const hex = getComputedStyle(this.canvas)
      .getPropertyValue('--m-accent-bright')
      .trim();
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (m)
      this.color = `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
  }

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

    // the newest point that has aged out still anchors the tail's curve
    const { points } = this;
    let first = 0;
    while (first < points.length - 1 && now - points[first + 1].born > TRAIL_MS)
      first++;
    points.splice(0, first);
    if (points.length && now - points[points.length - 1].born > TRAIL_MS) {
      points.length = 0;
    }

    const samples = smooth(withHead(points, this.getHead?.() ?? null)).filter(
      (p) => now - p.born <= TRAIL_MS,
    );
    if (samples.length > 1) this.drawRibbon(samples);

    this.drawTouchPulses(now);
  }

  /** One filled shape, tapering to a hair at the tail, round at the head. */
  private drawRibbon(pts: Sample[]) {
    const ctx = this.context;
    const scale = this.getScale() || 1;
    const n = pts.length;
    const left: Sample[] = [];
    const right: Sample[] = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(n - 1, i + 1)];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const k = i / (n - 1);
      const w = (TAIL_HALF + (HEAD_HALF - TAIL_HALF) * k * k) / scale;
      left.push({
        x: pts[i].x - (dy / len) * w,
        y: pts[i].y + (dx / len) * w,
        born: 0,
      });
      right.push({
        x: pts[i].x + (dy / len) * w,
        y: pts[i].y - (dx / len) * w,
        born: 0,
      });
    }
    const tail = pts[0];
    const head = pts[n - 1];
    const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
    grad.addColorStop(0, `rgba(${this.color}, 0)`);
    grad.addColorStop(1, `rgba(${this.color}, ${HEAD_ALPHA})`);
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i].x, left[i].y);
    const before = pts[n - 2];
    const dir = Math.atan2(head.y - before.y, head.x - before.x);
    // from the left edge round the front to the right edge
    ctx.arc(
      head.x,
      head.y,
      HEAD_HALF / scale,
      dir + Math.PI / 2,
      dir - Math.PI / 2,
      true,
    );
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
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

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A smooth path through the recorded points: a curve from each midpoint to
 *  the next, bent by the point between them. Each sample carries the time it
 *  stands for, so the tail can retire it. */
function smooth(points: Point[]): Sample[] {
  const n = points.length;
  if (n < 2) return [];
  const mid = (a: Point, b: Point): Sample => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    born: (a.born + b.born) / 2,
  });
  const out: Sample[] = [points[0]];
  let from: Sample = points[0];
  for (let i = 1; i < n; i++) {
    const c = points[i];
    const to = i === n - 1 ? c : mid(c, points[i + 1]);
    for (let s = 1; s <= STEPS; s++) {
      const t = s / STEPS;
      const u = 1 - t;
      out.push({
        x: u * u * from.x + 2 * u * t * c.x + t * t * to.x,
        y: u * u * from.y + 2 * u * t * c.y + t * t * to.y,
        born: u * from.born + t * to.born,
      });
    }
    from = to;
  }
  return out;
}

/** The newest point moved to where the cursor is drawn: it eases to each
 *  recorded point, and the ribbon's head rides with it, not ahead. */
function withHead(points: Point[], head: { x: number; y: number } | null) {
  const n = points.length;
  if (!head || n < 2) return points;
  return [...points.slice(0, -1), { ...points[n - 1], x: head.x, y: head.y }];
}
