import type { Store } from '../../common/types';
import type Screen from '../Screen/Screen';
import type { Point } from '../Screen/types';
import { clickmapStyles } from './clickmapStyles';
import heatmapRenderer from './simpleHeatmap';

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

export default class TargetMarker {
  private clickMapOverlay: HTMLCanvasElement | null = null;

  static INITIAL_STATE: State = {
    markedTargets: null,
    activeTargetIndex: 0,
  };

  constructor(
    private readonly screen: Screen,
    private readonly store: Store<State>,
  ) {}

  updateMarkedTargets() {
    const { markedTargets } = this.store.get();
    if (markedTargets) {
      this.store.update({
        markedTargets: markedTargets.map((mt: any) => ({
          ...mt,
          boundingRect: this.calculateRelativeBoundingRect(mt.el),
        })),
      });
    }

    if (heatmapRenderer.checkReady()) {
      heatmapRenderer.resize().draw();
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
        setTimeout(() => {
          if (!markedTargets) {
            return;
          }
          this.store.update({
            markedTargets: markedTargets.map((t) =>
              t === target
                ? {
                    ...target,
                    boundingRect: this.calculateRelativeBoundingRect(target.el),
                  }
                : t,
            ),
          });
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
      this.clickMapOverlay?.remove();
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
      this.screen.document.body.appendChild(overlay);

      const pointMap: Record<
        string,
        { times: number; data: number[]; original: any }
      > = {};
      overlay.width = scrollWidth;
      overlay.height = scrollHeight;
      let maxIntensity = 0;

      clicks.forEach((point) => {
        const y = roundToSecond(point.normalizedY);
        const x = roundToSecond(point.normalizedX);
        const key = `${y}-${x}`;
        if (pointMap[key]) {
          const times = pointMap[key].times + 1;
          maxIntensity = Math.max(maxIntensity, times);
          pointMap[key].times = times;
        } else {
          const clickData = [(x / 100) * scrollWidth, (y / 100) * scrollHeight];
          pointMap[key] = { times: 1, data: clickData, original: point };
        }
      });

      const heatmapData: number[][] = [];
      for (const key in pointMap) {
        const { data, times } = pointMap[key];
        heatmapData.push([...data, times]);
      }

      heatmapRenderer
        .setCanvas(overlay)
        .setData(heatmapData)
        .setRadius(15, 10)
        .setMax(maxIntensity)
        .resize()
        .draw();
    } else {
      this.store.update({ markedTargets: null });
      this.clickMapOverlay?.remove();
      this.clickMapOverlay = null;
    }
  }
}

function roundToSecond(num: number) {
  return Math.round(num * 100) / 100;
}
