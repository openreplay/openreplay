/**
 * Inspired by Bryan C (@bryjch at codepen)
 * */

const LINE_DURATION = 3.5;
const LINE_DURATION_MOBILE = 5;
const LINE_WIDTH_START = 5;

const TOUCH_PULSE_FRAMES = 60;
const TOUCH_PULSE_BASE_RADIUS = 8;
const TOUCH_PULSE_PEAK_RADIUS = 22;
const TOUCH_PULSE_ALPHA = 0.35;
const TOUCH_PULSE_Y_OFFSET = TOUCH_PULSE_PEAK_RADIUS;

export type SwipeEvent = {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
};

export default class MouseTrail {
  public isActive = true;

  public context: CanvasRenderingContext2D;

  private dimensions = { width: 0, height: 0 };

  private readonly lineDuration: number;

  private points: Point[] = [];

  private touchPulses: TouchPulse[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    isNativeMobile: boolean = false,
  ) {
    // @ts-ignore patching window
    window.requestAnimFrame =
      window.requestAnimationFrame ||
      // @ts-ignore
      window.webkitRequestAnimationFrame ||
      // @ts-ignore
      window.mozRequestAnimationFrame ||
      // @ts-ignore
      window.oRequestAnimationFrame ||
      // @ts-ignore
      window.msRequestAnimationFrame ||
      function (callback: any) {
        window.setTimeout(callback, 1000 / 60);
      };

    this.lineDuration = isNativeMobile ? LINE_DURATION_MOBILE : LINE_DURATION;
  }

  resizeCanvas = (w: number, h: number) => {
    if (this.context !== undefined) {
      this.context.canvas.width = w;
      this.context.canvas.height = h;
      this.canvas.width = w;
      this.canvas.height = h;

      this.dimensions.width = w;
      this.dimensions.height = h;
    }
  };

  createContext = () => {
    if (this.canvas) {
      this.context = this.canvas.getContext('2d')!;
      this.init();
    } else {
      console.error('Canvas element not found');
    }
  };

  leaveTrail = (x: number, y: number) => {
    this.addPoint(x + 7, y + 7);
  };

  init = () => {
    if (this.isActive) {
      this.animatePoints();
      // @ts-ignore patched
      window.requestAnimFrame(this.init);
    }
  };

  animatePoints = () => {
    this.context.clearRect(
      0,
      0,
      this.context.canvas.width,
      this.context.canvas.height,
    );

    const duration = (this.lineDuration * 1000) / 60;
    const { points } = this;
    let point;
    let lastPoint;

    for (let i = 0; i < points.length; i++) {
      point = points[i];

      if (points[i - 1] !== undefined) {
        lastPoint = points[i - 1];
      } else {
        lastPoint = points[i];
      }

      point.lifetime! += 1;

      // 3500/60 = 58.333333333333336
      if (point.lifetime! > duration) {
        points.splice(i, 1);
        continue;
      }

      const inc = point.lifetime! / duration; // 0 to 1 over lineDuration
      const dec = 1 - inc;

      const spreadRate = LINE_WIDTH_START * (1 - inc);
      this.context.lineJoin = 'round';
      this.context.lineWidth = spreadRate;
      this.context.strokeStyle = `rgba(60, 170, 170, ${dec})`;

      this.context.beginPath();
      this.context.moveTo(lastPoint.x, lastPoint.y);
      this.context.lineTo(point.x, point.y);
      this.context.stroke();
      this.context.closePath();
    }

    this.drawTouchPulses();
  };

  addPoint = (x: number, y: number) => {
    const point = new Point(x, y, 0);
    this.points.push(point);
  };

  addTouch = (x: number, y: number) => {
    this.touchPulses.push({ x, y: y + TOUCH_PULSE_Y_OFFSET, lifetime: 0 });
  };

  private drawTouchPulses = () => {
    const pulses = this.touchPulses;
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pulse = pulses[i]!;
      pulse.lifetime += 1;

      if (pulse.lifetime > TOUCH_PULSE_FRAMES) {
        pulses.splice(i, 1);
        continue;
      }

      const t = pulse.lifetime / TOUCH_PULSE_FRAMES;
      const wave = Math.sin(Math.PI * t);
      const radius =
        TOUCH_PULSE_BASE_RADIUS +
        (TOUCH_PULSE_PEAK_RADIUS - TOUCH_PULSE_BASE_RADIUS) * wave;
      const alpha = TOUCH_PULSE_ALPHA * wave;

      this.context.beginPath();
      this.context.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
      this.context.fillStyle = `rgba(128, 128, 128, ${alpha})`;
      this.context.fill();
      this.context.closePath();
    }
  };
}

type TouchPulse = { x: number; y: number; lifetime: number };

type Coords = { x: number; y: number };

class Point {
  constructor(
    public x: number,
    public y: number,
    public lifetime?: number,
  ) {}

  static distance(a: Coords, b: Coords) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return Math.sqrt(dx * dx + dy * dy);
  }

  static midPoint(a: Coords, b: Coords) {
    const mx = a.x + (b.x - a.x) * 0.5;
    const my = a.y + (b.y - a.y) * 0.5;

    return new Point(mx, my);
  }

  static angle(a: Coords, b: Coords) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return Math.atan2(dy, dx);
  }

  get pos() {
    return `${this.x},${this.y}`;
  }
}
