/**
 * Inspired by Bryan C (@bryjch at codepen)
 * */

const LINE_DURATION = 3.5;
const LINE_WIDTH_START = 5;

export type SwipeEvent = { x: number; y: number; direction: 'up' | 'down' | 'left' | 'right' }

export default class MouseTrail {
  public isActive = true;
  public context: CanvasRenderingContext2D;
  private dimensions = { width: 0, height: 0 };
  /**
   * 1 - every frame,
   * 2 - every 2nd frame
   * and so on, doesn't always work properly
   * but 1 doesnt affect performance so we're fine
   * */
  private drawOnFrame = 1;
  private currentFrame = 0;
  private lineDuration = LINE_DURATION;
  private points: Point[] = [];
  private swipePoints: Point[] = []

  constructor(private readonly canvas: HTMLCanvasElement, isNativeMobile: boolean = false) {
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

    if (isNativeMobile) {
      this.lineDuration = 5
    }
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
    if (this.currentFrame === this.drawOnFrame) {
      this.addPoint(x + 7, y + 7);
      this.currentFrame = 0;
    }
    this.currentFrame++;
  };

  init = () => {
    if (this.isActive) {
      this.animatePoints();
      // @ts-ignore patched
      window.requestAnimFrame(this.init);
    }
  };

  createSwipeTrail = ({ x, y, direction }: SwipeEvent) => {
    const startCoords = this.calculateTrail({ x, y, direction });
    this.addPoint(startCoords.x, startCoords.y);
    this.addPoint(x, y);
  }

  calculateTrail = ({ x, y, direction }: SwipeEvent) => {
    switch (direction) {
      case 'up':
        return { x, y: y - 20 };
      case 'down':
        return { x, y: y + 20 };
      case 'left':
        return { x: x - 20, y };
      case 'right':
        return { x: x + 20, y };
      default:
        return { x, y };
    }
  }

  animatePoints = () => {
    this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);

    const duration = (this.lineDuration * 1000) / 60;
    let point, lastPoint;

    for (let i = 0; i < this.points.length; i++) {
      point = this.points[i];

      if (this.points[i - 1] !== undefined) {
        lastPoint = this.points[i - 1];
      } else {
        lastPoint = this.points[i];
      }

      point.lifetime! += 1;

      if (point.lifetime! > duration) {
        this.points.splice(i, 1);
        continue;
      }

      const inc = point.lifetime! / duration; // 0 to 1 over lineDuration
      const dec = 1 - inc;

      const spreadRate = LINE_WIDTH_START * (1 - inc);
      this.context.lineJoin = 'round';
      this.context.lineWidth = spreadRate;
      this.context.strokeStyle = `rgba(60, 170, 170, ${dec})`

      this.context.beginPath();
      this.context.moveTo(lastPoint.x, lastPoint.y);
      this.context.lineTo(point.x, point.y);
      this.context.stroke();
      this.context.closePath();
    }
  };

  addPoint = (x: number, y: number) => {
    const point = new Point(x, y, 0);
    this.points.push(point);
  };
}

type Coords = { x: number; y: number };

class Point {
  constructor(public x: number, public y: number, public lifetime?: number) {}

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
    return this.x + ',' + this.y;
  }
}