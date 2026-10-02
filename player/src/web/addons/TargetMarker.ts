import type { Store } from '../../common/types';
import type Screen from '../Screen/Screen';
import type { Point } from '../Screen/types';
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

function getOffset(el: Element, innerWindow: Window) {
  const rect = el.getBoundingClientRect();
  return {
    fixedLeft: rect.left + innerWindow.scrollX,
    fixedTop: rect.top + innerWindow.scrollY,
    rect,
  };
}

interface BoundingRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface MarkedTarget {
  boundingRect: BoundingRect;
  el: Element;
  selector: string;
  count: number;
  index: number;
  active?: boolean;
  percent: number;
}

export interface State {
  markedTargets: MarkedTarget[] | null;
  activeTargetIndex: number;
}

/** Normalized (percent, 2 decimals) cluster corners: [[x1, y1], [x2, y2]]. */
export type ClusterCoords = string[][];

export default class TargetMarker {
  private clickMapOverlay: HTMLCanvasElement | null = null;
  private heatmap: SimpleHeatmap | null = null;
  private onCluster?: (coords: ClusterCoords) => void = undefined;
  private rectRefreshTimeout?: ReturnType<typeof setTimeout>;

  static INITIAL_STATE: State = {
    markedTargets: null,
    activeTargetIndex: 0,
  };

  constructor(
    private readonly screen: Screen,
    private readonly store: Store<State>,
  ) {}

  setOnCluster = (onCluster: (coords: ClusterCoords) => void) => {
    this.onCluster = onCluster;
  };

  updateMarkedTargets() {
    const { markedTargets } = this.store.get();
    if (markedTargets) {
      this.store.update({
        markedTargets: markedTargets.map((mt) => ({
          ...mt,
          boundingRect: this.calculateRelativeBoundingRect(mt.el),
        })),
      });
    }
  }

  private calculateRelativeBoundingRect(el: Element): BoundingRect {
    const parentEl = this.screen.getParentElement();
    if (!parentEl) {
      return {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      };
    } // TODO: can be initialized(?) on mounted screen only
    const { top, left, width, height } = el.getBoundingClientRect();
    const s = this.screen.getScale();
    const screenRect = this.screen.overlay.getBoundingClientRect(); // this.screen.getBoundingClientRect() (now private)
    const parentRect = parentEl.getBoundingClientRect();

    return {
      top: top * s + screenRect.top - parentRect.top,
      left: left * s + screenRect.left - parentRect.left,
      width: width * s,
      height: height * s,
    };
  }

  setActiveTarget(index: number) {
    const { window } = this.screen;
    const { markedTargets } = this.store.get();
    const target = markedTargets && markedTargets[index];
    if (target && window) {
      const { fixedTop, rect } = getOffset(target.el, window);
      const scrollToY = fixedTop - window.innerHeight / 1.5;
      if (rect.top < 0 || rect.top > window.innerHeight) {
        // behavior hack TODO: fix it somehow when they will decide to remove it from browser api
        // @ts-ignore
        window.scrollTo({ top: scrollToY, behavior: 'instant' });
        if (this.rectRefreshTimeout) {
          clearTimeout(this.rectRefreshTimeout);
        }
        // every marker moved with the scroll, not only the active one
        this.rectRefreshTimeout = setTimeout(() => {
          this.rectRefreshTimeout = undefined;
          this.updateMarkedTargets();
        }, 0);
      }
    }
    this.store.update({ activeTargetIndex: index });
  }

  private actualScroll: Point | null = null;

  markTargets(selections: { selector: string; count: number }[] | null) {
    if (selections) {
      const totalCount = selections.reduce((a, b) => a + b.count, 0);
      const markedTargets: MarkedTarget[] = [];
      let index = 0;
      selections.forEach((s) => {
        const el = this.screen.getElementBySelector(s.selector);
        if (!el) return;

        markedTargets.push({
          ...s,
          el,
          index: index++,
          percent: Math.round((s.count * 100) / totalCount),
          boundingRect: this.calculateRelativeBoundingRect(el),
          count: s.count,
        });
      });
      this.actualScroll = this.screen.getCurrentScroll();
      this.store.update({ markedTargets });
    } else {
      if (this.actualScroll) {
        this.screen.window?.scrollTo(this.actualScroll.x, this.actualScroll.y);
        this.actualScroll = null;
      }
      this.store.update({ markedTargets: null });
    }
  }

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
      this.store.update({ markedTargets: null });
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
    if (this.rectRefreshTimeout) {
      clearTimeout(this.rectRefreshTimeout);
      this.rectRefreshTimeout = undefined;
    }
    this.removeClickMap();
    this.onCluster = undefined;
    this.actualScroll = null;
  }
}

function roundToSecond(num: number) {
  return Math.round(num * 100) / 100;
}
