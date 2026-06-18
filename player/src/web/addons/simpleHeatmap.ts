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

  private hoveredIndex: number | null = null;
  private selectedIndex: number | null = null;
  private _onMouseMove?: (e: MouseEvent) => void;
  private _onClick?: (e: MouseEvent) => void;
  private lastMinOpacity: number = 0.05;

  private clusters: {
    indices: number[];
    sum: number;
    cx: number;
    cy: number;
    bbox: [number, number, number, number];
  }[] = [];
  private clustersDirty = true;
  private clusterEps?: number;
  private minClusterPoints = 1;

  /**
   * Attach a canvas and initialize renderer state.
   * Call this before providing data; sizes are read from the canvas element.
   */
  setCanvas(canvas: HTMLCanvasElement): this {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.max = 1;
    this.data = [];
    this.hoveredIndex = null;
    this.selectedIndex = null;
    this.clustersDirty = true;
    return this;
  }

  /**
   * Provide heatmap points as `[x, y, weight?]`.
   * `weight` defaults to 1 if omitted and contributes to cluster totals.
   */
  setData(data: number[][]): this {
    this.data = data;
    this.clustersDirty = true;
    return this;
  }

  /**
   * Set normalization max for per-point alpha mixing (not cluster totals).
   */
  setMax(max: number): this {
    this.max = max;
    return this;
  }

  /**
   * Push a single point `[x, y, weight?]` into the dataset.
   */
  add(point: number[]): this {
    this.data.push(point);
    this.clustersDirty = true;
    return this;
  }

  /**
   * Clear all points and interaction state.
   */
  clear(): this {
    this.data = [];
    this.hoveredIndex = null;
    this.selectedIndex = null;
    this.clusters = [];
    this.clustersDirty = false;
    return this;
  }

  /**
   * Define the rendered kernel radius and blur. Also influences clustering padding.
   * @param r - kernel radius (px) for each point
   * @param blur - added blur (px) used in the offscreen kernel
   */
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

    this.clustersDirty = true;

    return this;
  }

  /**
   * Whether a canvas and 2D context are ready.
   */
  checkReady(): boolean {
    return !!(this.canvas && this.ctx);
  }

  /**
   * Sync internal width/height with the current canvas size.
   */
  resize(): this {
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    return this;
  }

  /**
   * Provide a 0..1 gradient map used to colorize the alpha field.
   */
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

  /**
   * Render the heatmap and interaction overlays.
   * @param minOpacity - floor for point alpha contribution (0..1)
   */
  draw(minOpacity: number = 0.05): this {
    if (!this.circle) this.setRadius(this.defaultRadius);
    if (!this.grad) this.setGradient(this.defaultGradient);

    const { ctx } = this;
    if (!ctx || this.width === 0 || this.height === 0) return this;

    this.lastMinOpacity = minOpacity;

    if (this.clustersDirty) this.computeClusters();

    ctx.clearRect(0, 0, this.width, this.height);

    this.data.forEach((p) => {
      ctx.globalAlpha = Math.min(
        Math.max((p[2] ?? 1) / this.max, minOpacity),
        1,
      );
      ctx.drawImage(this.circle, p[0] - this.r, p[1] - this.r);
    });

    try {
      const colored = ctx.getImageData(0, 0, this.width, this.height);
      this.colorize(colored.data, this.grad);
      ctx.putImageData(colored, 0, 0);
    } catch (e) {
      console.error('Error while colorizing heatmap:', e);
    }

    ctx.globalAlpha = 1;
    this.drawSelectionBoxes();

    return this;
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

  /**
   * Tune clustering.
   * @param eps - neighborhood radius (px) used to group nearby points into a cluster.
   *              If omitted, defaults to ~60% of the render radius (min 8px).
   * @param minPts - minimum number of points to form a cluster (default 1).
   */
  setClusterParams(eps?: number, minPts?: number): this {
    if (eps != null) this.clusterEps = eps;
    if (minPts != null) this.minClusterPoints = minPts;
    this.clustersDirty = true;
    return this;
  }

  /**
   * Enable hover/click interactions.
   * - Hover shows a tooltip of total clicks for the cluster under cursor.
   * - Click selects the cluster and calls `onSelect` with its bounding box and click sum.
   * @param onSelect - callback receiving `[[x1,y1],[x2,y2]]` and `{clicks}`.
   */
  enableInteractions(
    onSelect: (
      coords: [[x1: number, y1: number], [x2: number, y2: number]],
      info?: { clicks: number },
    ) => void,
  ): this {
    if (!this.canvas) return this;
    if (!this.r) this.setRadius(this.defaultRadius);

    this._onMouseMove = (e: MouseEvent) => {
      const { x, y } = this.getMousePos(e);
      const idx = this.findClusterIndexAt(x, y);
      if (idx !== this.hoveredIndex) {
        this.hoveredIndex = idx;
        this.draw(this.lastMinOpacity);
      }
    };

    this._onClick = (e: MouseEvent) => {
      const { x, y } = this.getMousePos(e);
      const idx = this.findClusterIndexAt(x, y);
      this.selectedIndex = idx;
      this.draw(this.lastMinOpacity);
      if (idx !== null) {
        const [x1, y1, x2, y2] = this.clusters[idx].bbox;
        onSelect(
          [
            [Math.max(0, Math.floor(x1)), Math.max(0, Math.floor(y1))],
            [
              Math.min(this.width, Math.ceil(x2)),
              Math.min(this.height, Math.ceil(y2)),
            ],
          ],
          { clicks: Math.round(this.clusters[idx].sum) },
        );
      }
    };

    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('click', this._onClick);
    return this;
  }

  /**
   * Remove interaction listeners and keep current render intact.
   */
  disableInteractions(): this {
    if (!this.canvas) return this;
    if (this._onMouseMove)
      this.canvas.removeEventListener('mousemove', this._onMouseMove);
    if (this._onClick) this.canvas.removeEventListener('click', this._onClick);
    this._onMouseMove = undefined;
    this._onClick = undefined;
    return this;
  }

  /**
   * Convert mouse event coordinates to canvas-space pixels (accounts for CSS scaling).
   */
  private getMousePos(evt: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (evt.clientX - rect.left) * scaleX;
    const y = (evt.clientY - rect.top) * scaleY;
    return { x, y };
  }

  /**
   * Find cluster under a point. Prefers bounding boxes; falls back to nearest center within `eps`.
   */
  private findClusterIndexAt(x: number, y: number): number | null {
    if (this.clustersDirty) this.computeClusters();
    if (!this.clusters.length) return null;

    let bestIdx: number | null = null;
    let bestSum = -1;

    for (let i = 0; i < this.clusters.length; i++) {
      const c = this.clusters[i];
      const [x1, y1, x2, y2] = c.bbox;
      if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
        if (c.sum > bestSum) {
          bestSum = c.sum;
          bestIdx = i;
        }
      }
    }

    if (bestIdx !== null) return bestIdx;

    const eps = Math.max(this.getClusterEps(), this.r);
    const eps2 = eps * eps;
    let bestD2 = Infinity;
    for (let i = 0; i < this.clusters.length; i++) {
      const c = this.clusters[i];
      const dx = x - c.cx;
      const dy = y - c.cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2 && d2 <= eps2) {
        bestD2 = d2;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  private drawSelectionBoxes(): void {
    const ctx = this.ctx;
    if (!ctx || !this.r) return;

    ctx.save();

    if (this.hoveredIndex !== null) {
      const [x1, y1, x2, y2] = this.clusters[this.hoveredIndex].bbox;
      const w = x2 - x1;
      const h = y2 - y1;
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.strokeRect(x1, y1, w, h);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(4,4,4,0.6)';
      ctx.strokeRect(x1, y1, w, h);
      this.drawTooltip(this.hoveredIndex);
    }

    if (this.selectedIndex !== null) {
      const [x1, y1, x2, y2] = this.clusters[this.selectedIndex].bbox;
      const w = x2 - x1;
      const h = y2 - y1;
      ctx.setLineDash([]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.98)';
      ctx.strokeRect(x1, y1, w, h);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(4,4,4,0.95)';
      ctx.strokeRect(x1, y1, w, h);
    }

    ctx.restore();
  }

  /**
   * Draw tooltip centered above the hovered cluster's bbox (falls back below if not enough space).
   */
  private drawTooltip(index: number): void {
    const ctx = this.ctx;
    if (!ctx || index == null) return;

    const c = this.clusters[index];
    const [x1, y1, x2, y2] = c.bbox;
    const centerX = (x1 + x2) / 2;

    const clicks = Math.round(c.sum);
    const paddingX = 6;
    const paddingY = 4;
    const offset = 8;

    ctx.save();
    ctx.font = '12px sans-serif';
    ctx.textBaseline = 'top';
    const text = `${clicks} ${clicks === 1 ? 'Click' : 'Clicks'}`;
    const tw = ctx.measureText(text).width;
    const th = 14;

    const bw = tw + paddingX * 2;
    const bh = th + paddingY * 2;

    let tx = centerX - bw / 2;
    let tyTop = y1 - offset - bh;
    let ty = tyTop >= 0 ? tyTop : y2 + offset;

    if (tx < 2) tx = 2;
    if (tx + bw > this.width - 2) tx = this.width - bw - 2;
    if (ty + bh > this.height - 2) ty = this.height - bh - 2;

    ctx.fillStyle = 'rgba(255,255,255, 1)';
    ctx.strokeStyle = 'rgba(4,4,4, 0.9)';
    ctx.lineWidth = 1;
    ctx.fillRect(tx, ty, bw, bh);
    ctx.strokeRect(tx, ty, bw, bh);

    ctx.fillStyle = 'rgba(20,20,20, 1)';
    ctx.fillText(text, tx + paddingX, ty + paddingY);

    ctx.restore();
  }

  /**
   * Build clusters with a fast grid-based flood-fill.
   * - Totals (`sum`) are weight sums of included points.
   * - BBoxes are padded by the render radius for nicer hit targets.
   */
  private computeClusters(): void {
    this.clusters = [];
    this.clustersDirty = false;
    const n = this.data?.length ?? 0;
    if (!n) return;

    const eps = this.getClusterEps();
    const eps2 = eps * eps;
    const cell = eps;

    const xs = new Array<number>(n);
    const ys = new Array<number>(n);
    const ws = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const p = this.data[i];
      xs[i] = p[0];
      ys[i] = p[1];
      ws[i] = p[2] ?? 1;
    }

    const key = (gx: number, gy: number) => `${gx},${gy}`;
    const grid = new Map<string, number[]>();
    for (let i = 0; i < n; i++) {
      const gx = Math.floor(xs[i] / cell);
      const gy = Math.floor(ys[i] / cell);
      const k = key(gx, gy);
      let arr = grid.get(k);
      if (!arr) grid.set(k, (arr = []));
      arr.push(i);
    }

    const used = new Uint8Array(n);

    for (let i = 0; i < n; i++) {
      if (used[i]) continue;

      const queue = [i];
      used[i] = 1;
      const indices: number[] = [i];

      while (queue.length) {
        const a = queue.pop()!;
        const agx = Math.floor(xs[a] / cell);
        const agy = Math.floor(ys[a] / cell);

        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const neigh = grid.get(key(agx + dx, agy + dy));
            if (!neigh) continue;
            for (let j = 0; j < neigh.length; j++) {
              const b = neigh[j];
              if (used[b]) continue;
              const dxp = xs[a] - xs[b];
              const dyp = ys[a] - ys[b];
              if (dxp * dxp + dyp * dyp <= eps2) {
                used[b] = 1;
                queue.push(b);
                indices.push(b);
              }
            }
          }
        }
      }

      if (indices.length < this.minClusterPoints && this.minClusterPoints > 1) {
        for (const idx of indices) used[idx] = 0;
        continue;
      }

      let sum = 0,
        wx = 0,
        wy = 0;
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const idx of indices) {
        const w = ws[idx];
        sum += w;
        wx += xs[idx] * w;
        wy += ys[idx] * w;
        if (xs[idx] < minX) minX = xs[idx];
        if (ys[idx] < minY) minY = ys[idx];
        if (xs[idx] > maxX) maxX = xs[idx];
        if (ys[idx] > maxY) maxY = ys[idx];
      }
      const cx = sum ? wx / sum : xs[indices[0]];
      const cy = sum ? wy / sum : ys[indices[0]];

      const pad = this.r ?? this.defaultRadius;
      const bbox: [number, number, number, number] = [
        Math.max(0, minX - pad),
        Math.max(0, minY - pad),
        Math.min(this.width, maxX + pad),
        Math.min(this.height, maxY + pad),
      ];

      this.clusters.push({ indices, sum, cx, cy, bbox });
    }

    this.clusters.sort((a, b) => b.sum - a.sum);
  }

  /**
   * Effective clustering radius. Defaults to ~60% of the render radius (min 8px).
   * If `setClusterParams(eps)` was called, that value is used.
   */
  private getClusterEps(): number {
    if (this.clusterEps != null) return this.clusterEps;
    const base = this.r ? this.r * 0.6 : this.defaultRadius * 0.6;
    return Math.max(8, base);
  }
}

const heatmapRenderer = new SimpleHeatmap();

export default heatmapRenderer;
