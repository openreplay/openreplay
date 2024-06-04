class SimpleHeatmap {
  _canvas: HTMLCanvasElement;
  _ctx: CanvasRenderingContext2D | null;
  _width: number;
  _height: number;
  _max: number;
  _data: number[][];

  setCanvas(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._width = canvas.width;
    this._height = canvas.height;
    this._max = 1;
    this._data = [];

    return this;
  }

  _circle
  _grad
  _r
  defaultRadius = 25;
  defaultGradient = {
    0.4: 'blue',
    0.6: 'cyan',
    0.7: 'lime',
    0.8: 'yellow',
    1.0: 'red'
  };

  setData(data: number[][]) {
    this._data = data;
    return this;
  }

  setMax(max: number) {
    this._max = max;
    return this;
  }

  add(point: number[]) {
    this._data.push(point);
    return this;
  }

  clear() {
    this._data = [];
    return this;
  }

  setRadius(r: number, blur?: number) {
    blur = blur === undefined ? 15 : blur;
    const circle = this._circle = this._createCanvas();
    const ctx = circle.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2d context is not supported');
    }
    const r2 = this._r = r + blur;

    circle.width = circle.height = r2 * 2;

    ctx.shadowOffsetX = ctx.shadowOffsetY = r2 * 2;
    ctx.shadowBlur = blur;
    ctx.shadowColor = 'black';

    ctx.beginPath();
    ctx.arc(-r2, -r2, r, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();

    return this;
  }

  resize() {
    this._width = this._canvas.width;
    this._height = this._canvas.height;
  }

  setGradient(grad: Record<string, string>) {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2d context is not supported');
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);

    canvas.width = 1;
    canvas.height = 256;

    for (const i in grad) {
      gradient.addColorStop(+i, grad[i]);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, 256);

    this._grad = ctx.getImageData(0, 0, 1, 256).data;

    return this;
  }


  draw(minOpacity?: number) {
    if (!this._circle) this.setRadius(this.defaultRadius);
    if (!this._grad) this.setGradient(this.defaultGradient);

    const ctx = this._ctx;
    if (!ctx) {
      throw new Error('Canvas 2d context is not supported');
    }

    ctx.clearRect(0, 0, this._width, this._height);

    for (let i = 0, len = this._data.length, p; i < len; i++) {
      p = this._data[i];
      ctx.globalAlpha = Math.min(Math.max(p[2] / this._max, minOpacity === undefined ? 0.05 : minOpacity), 1);
      ctx.drawImage(this._circle, p[0] - this._r, p[1] - this._r);
    }

    const colored = ctx.getImageData(0, 0, this._width, this._height);
    this._colorize(colored.data, this._grad);
    ctx.putImageData(colored, 0, 0);

    return this;
  }

  _colorize(pixels: Uint8ClampedArray, gradient: Uint8ClampedArray) {
    for (let i = 0, len = pixels.length, j; i < len; i += 4) {
      j = pixels[i + 3] * 4;

      if (j) {
        pixels[i] = gradient[j];
        pixels[i + 1] = gradient[j + 1];
        pixels[i + 2] = gradient[j + 2];
      }
    }
  }

  _createCanvas() {
    return document.createElement('canvas');
  }
}

const heatmapRenderer = new SimpleHeatmap();

export default heatmapRenderer;