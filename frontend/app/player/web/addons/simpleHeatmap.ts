/**
 * modified version of simpleheat
 *
 * https://github.com/mourner/simpleheat
 * Copyright (c) 2015, Vladimir Agafonkin
 *
 * */

class SimpleHeatmap {
  private canvas: HTMLCanvasElement;

  private ctx: CanvasRenderingContext2D | null;

  private width: number;

  private height: number;

  private max: number;

  private data: number[][];

  private circle: HTMLCanvasElement;

  private grad: Uint8ClampedArray;

  private r: number;

  private defaultRadius = 25;

  private defaultGradient = {
    0.4: 'blue',
    0.6: 'cyan',
    0.7: 'lime',
    0.8: 'yellow',
    1.0: 'red',
  };

  setCanvas(canvas: HTMLCanvasElement): this {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.max = 1;
    this.data = [];
    return this;
  }

  setData(data: number[][]): this {
    this.data = data;
    return this;
  }

  setMax(max: number): this {
    this.max = max;
    return this;
  }

  add(point: number[]): this {
    this.data.push(point);
    return this;
  }

  clear(): this {
    this.data = [];
    return this;
  }

  setRadius(r: number, blur: number = 15): this {
    const circle = this.createCanvas();
    const ctx = circle.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2d context is not supported');
    }
    const r2 = r + blur;

    circle.width = circle.height = r2 * 2;

    ctx.shadowOffsetX = ctx.shadowOffsetY = r2 * 2;
    ctx.shadowBlur = blur;
    ctx.shadowColor = 'black';

    ctx.beginPath();
    ctx.arc(-r2, -r2, r, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();

    this.circle = circle;
    this.r = r2;

    return this;
  }

  checkReady(): boolean {
    return !!(this.canvas && this.ctx);
  }

  resize(): this {
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    return this;
  }

  setGradient(grad: Record<string, string>): this {
    const canvas = this.createCanvas();
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2d context is not supported');
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);

    canvas.width = 1;
    canvas.height = 256;

    for (const i in grad) {
      gradient.addColorStop(parseFloat(i), grad[i]);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, 256);

    this.grad = ctx.getImageData(0, 0, 1, 256).data;

    return this;
  }

  draw(minOpacity: number = 0.05): this {
    if (!this.circle) this.setRadius(this.defaultRadius);
    if (!this.grad) this.setGradient(this.defaultGradient);

    const { ctx } = this;
    if (!ctx) {
      throw new Error('Canvas 2d context is not supported');
    }

    ctx.clearRect(0, 0, this.width, this.height);

    this.data.forEach((p) => {
      ctx.globalAlpha = Math.min(Math.max(p[2] / this.max, minOpacity), 1);
      ctx.drawImage(this.circle, p[0] - this.r, p[1] - this.r);
    });

    try {
      const colored = ctx.getImageData(0, 0, this.width, this.height);
      this.colorize(colored.data, this.grad);
      ctx.putImageData(colored, 0, 0);
    } catch (e) {
      // usually happens if session is corrupted ?
      console.error('Error while colorizing heatmap:', e);
    } finally {
      return this;
    }
  }

  private colorize(
    pixels: Uint8ClampedArray,
    gradient: Uint8ClampedArray,
  ): void {
    for (let i = 0, len = pixels.length; i < len; i += 4) {
      const j = pixels[i + 3] * 4;

      if (j) {
        pixels[i] = gradient[j];
        pixels[i + 1] = gradient[j + 1];
        pixels[i + 2] = gradient[j + 2];
      }
    }
  }

  private createCanvas(): HTMLCanvasElement {
    return document.createElement('canvas');
  }
}

const heatmapRenderer = new SimpleHeatmap();

export default heatmapRenderer;
