import type Screen from '../Screen/Screen';
import { clickmapStyles } from './clickmapStyles';
import SimpleHeatmap from './simpleHeatmap';

// Past these the browser either refuses to allocate the canvas (blank heatmap)
// or every colorize pass costs hundreds of MB, so tall pages render downscaled.
const MAX_CANVAS_SIDE = 16384;
const MAX_CANVAS_AREA = 24_000_000;

export function getCanvasDownscale(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 1;
  return Math.min(
    1,
    MAX_CANVAS_SIDE / width,
    MAX_CANVAS_SIDE / height,
    Math.sqrt(MAX_CANVAS_AREA / (width * height)),
  );
}

/** Normalized (percent, 2 decimals) cluster corners: [[x1, y1], [x2, y2]]. */
export type ClusterCoords = string[][];

/** A heatmap cell: normalized percent coordinates and how many clicks landed there. */
export interface ClickPoint {
  normalizedX: number;
  normalizedY: number;
  count?: number;
}

export default class TargetMarker {
  private clickMapOverlay: HTMLCanvasElement | null = null;
  private heatmap: SimpleHeatmap | null = null;
  private onCluster?: (coords: ClusterCoords) => void = undefined;
  private clicks: ClickPoint[] | null = null;

  constructor(private readonly screen: Screen) {}

  setOnCluster = (onCluster: (coords: ClusterCoords) => void) => {
    this.onCluster = onCluster;
  };

  /** The drawn heat layer, in page pixels (possibly downscaled), for the minimap. */
  get canvas(): HTMLCanvasElement | null {
    return this.clickMapOverlay;
  }

  /** Clicks to draw on the next redraw(). */
  setTargets(clicks: ClickPoint[] | null) {
    this.clicks = clicks;
  }

  injectTargets(clicks: ClickPoint[] | null) {
    this.setTargets(clicks);
    this.redraw();
  }

  /** Draws the current clicks again, sized to the document's current size. */
  redraw() {
    this.removeClickMap();
    if (this.clicks && this.screen.document) this.drawClickMap(this.clicks);
  }

  private drawClickMap(clicks: ClickPoint[]) {
    const overlay = document.createElement('canvas');
    const scrollHeight =
      this.screen.document?.documentElement.scrollHeight || 0;
    const scrollWidth = this.screen.document?.documentElement.scrollWidth || 0;

    Object.assign(
      overlay.style,
      clickmapStyles.overlayStyle({
        height: `${scrollHeight}px`,
        width: `${scrollWidth}px`,
      }),
    );

    this.clickMapOverlay = overlay;
    this.screen.addToScreen(overlay);
    // if we want to inject overlay inside the replay itself:
    // this.screen.document.body.appendChild(overlay);

    // Backing store may be smaller than the CSS size; everything below works in backing pixels.
    const k = getCanvasDownscale(scrollWidth, scrollHeight);
    overlay.width = Math.max(1, Math.round(scrollWidth * k));
    overlay.height = Math.max(1, Math.round(scrollHeight * k));

    const pointMap: Record<string, { times: number; data: number[] }> = {};
    let maxIntensity = 0;

    clicks.forEach((point) => {
      const y = roundToSecond(point.normalizedY);
      const x = roundToSecond(point.normalizedX);
      const key = `${y}-${x}`;
      const clickCount = point.count ?? 1;
      if (pointMap[key]) {
        pointMap[key].times += clickCount;
      } else {
        pointMap[key] = {
          times: clickCount,
          data: [(x / 100) * overlay.width, (y / 100) * overlay.height],
        };
      }
      maxIntensity = Math.max(maxIntensity, pointMap[key].times);
    });

    const heatmapData: number[][] = [];
    for (const key in pointMap) {
      const { data, times } = pointMap[key];
      heatmapData.push([...data, times]);
    }

    const setToNormalized = (coords: number[]) => [
      `${roundToSecond((coords[0] / overlay.width) * 100)}`,
      `${roundToSecond((coords[1] / overlay.height) * 100)}`,
    ];

    const onClusterSelect = (coords: number[][]) => {
      this.onCluster?.(coords.map(setToNormalized));
    };
    this.heatmap = new SimpleHeatmap()
      .setCanvas(overlay)
      .setData(heatmapData)
      .setRadius(15 * k, 10 * k)
      .setMax(maxIntensity)
      .resize()
      .draw()
      .enableInteractions(onClusterSelect);
  }

  private removeClickMap() {
    this.heatmap?.destroy();
    this.heatmap = null;
    this.clickMapOverlay?.remove();
    this.clickMapOverlay = null;
  }

  destroy() {
    this.clicks = null;
    this.removeClickMap();
    this.onCluster = undefined;
  }
}

function roundToSecond(num: number) {
  return Math.round(num * 100) / 100;
}
