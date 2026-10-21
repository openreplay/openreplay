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

export default class TargetMarker {
  private clickMapOverlay: HTMLCanvasElement | null = null;
  private heatmap: SimpleHeatmap | null = null;
  private onCluster?: (coords: ClusterCoords) => void = undefined;

  constructor(private readonly screen: Screen) {}

  setOnCluster = (onCluster: (coords: ClusterCoords) => void) => {
    this.onCluster = onCluster;
  };

  injectTargets(clicks: { normalizedX: number; normalizedY: number }[] | null) {
    if (clicks && this.screen.document) {
      this.removeClickMap();
      const overlay = document.createElement('canvas');
      const scrollHeight =
        this.screen.document?.documentElement.scrollHeight || 0;
      const scrollWidth =
        this.screen.document?.documentElement.scrollWidth || 0;

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
        if (pointMap[key]) {
          pointMap[key].times += 1;
        } else {
          pointMap[key] = {
            times: 1,
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
    } else {
      this.removeClickMap();
    }
  }

  private removeClickMap() {
    this.heatmap?.destroy();
    this.heatmap = null;
    this.clickMapOverlay?.remove();
    this.clickMapOverlay = null;
  }

  destroy() {
    this.removeClickMap();
    this.onCluster = undefined;
  }
}

function roundToSecond(num: number) {
  return Math.round(num * 100) / 100;
}
