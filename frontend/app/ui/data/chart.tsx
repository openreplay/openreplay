import {
  BarChart,
  LineChart,
  PieChart,
  SankeyChart,
  SunburstChart,
} from 'echarts/charts';
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import type { EChartsCoreOption } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  SankeyChart,
  SunburstChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DatasetComponent,
  SVGRenderer,
]);

export interface ChartTheme {
  series: string[];
  grid: string;
  axis: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  surface: string;
  raised: string;
  border: string;
  font: string;
  fontMono: string;
  fontSize: number;

  radius: number;
  heatLow: string;
  heatHigh: string;
  danger: string;

  duration: number;
  ease: 'cubicOut';
}

const px = (v: string, fallback: number) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

export function readChartTheme(
  root: HTMLElement = document.documentElement,
): ChartTheme {
  const cs = getComputedStyle(root);
  const v = (name: string) => cs.getPropertyValue(name).trim();

  const rem = px(cs.fontSize, 16);
  const fs = v('--m-text-xs');
  return {
    series: Array.from({ length: 8 }, (_, i) => v(`--m-chart-${i + 1}`)),
    grid: v('--m-chart-grid'),
    axis: v('--m-chart-axis'),
    text: v('--m-content-primary'),
    textSecondary: v('--m-content-secondary'),
    textMuted: v('--m-content-muted'),
    surface: v('--m-surface-default'),
    raised: v('--m-surface-raised'),
    border: v('--m-border-default'),
    font: v('--m-font-sans'),
    fontMono: v('--m-font-num') || v('--m-font-mono'),
    fontSize: fs.endsWith('rem') ? px(fs, 0.75) * rem : px(fs, 12),
    radius: px(v('--m-radius-control'), 4),
    heatLow: v('--m-chart-heat-low'),
    heatHigh: v('--m-chart-heat-high'),
    danger: v('--m-content-danger'),
    duration: px(v('--m-duration-base'), 180),
    ease: 'cubicOut',
  };
}

/* One theme reader for the whole page: every chart used to install its own
   MutationObserver on <html> and re-render on each mutation. Charts re-render
   only when a token value actually changes. */
let currentTheme: ChartTheme | null = null;
let currentKey = '';
const themeListeners = new Set<() => void>();
let stopThemeWatch: (() => void) | null = null;

function themeSnapshot(): ChartTheme {
  if (!currentTheme) {
    currentTheme = readChartTheme();
    currentKey = JSON.stringify(currentTheme);
  }
  return currentTheme;
}

function watchTheme() {
  const root = document.documentElement;
  let frame = 0;
  const reread = () => {
    cancelAnimationFrame(frame);
    // two frames: the class toggles first, the custom properties resolve after
    frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const next = readChartTheme(root);
        const key = JSON.stringify(next);
        if (key === currentKey) return;
        currentTheme = next;
        currentKey = key;
        themeListeners.forEach((notify) => notify());
      }),
    );
  };
  const mo = new MutationObserver(reread);
  mo.observe(root, { attributes: true, attributeFilter: ['class', 'style'] });
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', reread);
  document.fonts?.ready.then(reread);
  return () => {
    cancelAnimationFrame(frame);
    mo.disconnect();
    mq.removeEventListener('change', reread);
  };
}

function subscribeTheme(notify: () => void) {
  themeListeners.add(notify);
  if (!stopThemeWatch) {
    // nothing watched while no chart was mounted: the cache may predate a toggle
    const next = readChartTheme();
    const key = JSON.stringify(next);
    if (key !== currentKey) {
      currentTheme = next;
      currentKey = key;
      queueMicrotask(() => themeListeners.forEach((n) => n()));
    }
    stopThemeWatch = watchTheme();
  }
  return () => {
    themeListeners.delete(notify);
    if (themeListeners.size === 0) {
      stopThemeWatch?.();
      stopThemeWatch = null;
    }
  };
}

export function useChartTheme(): ChartTheme {
  return useSyncExternalStore(subscribeTheme, themeSnapshot, () => EMPTY_THEME);
}

const EMPTY_THEME: ChartTheme = {
  series: [],
  grid: '',
  axis: '',
  text: '',
  textSecondary: '',
  textMuted: '',
  surface: '',
  raised: '',
  border: '',
  font: '',
  fontMono: '',
  fontSize: 12,
  radius: 4,
  heatLow: '',
  heatHigh: '',
  danger: '',
  duration: 180,
  ease: 'cubicOut' as const,
};

export function baseOption(t: ChartTheme): EChartsCoreOption {
  return {
    color: t.series,
    textStyle: {
      fontFamily: t.font,
      fontSize: t.fontSize,
      color: t.textSecondary,
    },
    animationDuration: t.duration * 2,
    animationDurationUpdate: t.duration,
    animationEasing: t.ease,
    animationEasingUpdate: t.ease,
    tooltip: {
      backgroundColor: t.raised,
      borderColor: t.border,
      borderWidth: 1,
      padding: [6, 10],
      textStyle: { color: t.text, fontSize: t.fontSize, fontFamily: t.font },
      extraCssText:
        'box-shadow: var(--m-shadow-popover); border-radius: var(--m-radius-control);',
    },

    legend: {
      show: false,
      type: 'scroll',
      top: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 16,
      textStyle: { color: t.textSecondary, fontSize: t.fontSize },
      pageIconSize: 9,
      pageIconColor: t.axis,
      pageIconInactiveColor: t.grid,
      pageTextStyle: { color: t.textSecondary, fontSize: t.fontSize },

      inactiveColor: t.grid,
    },
    grid: { left: 8, right: 12, top: 28, bottom: 8, containLabel: true },
  };
}

export interface EChartProps {
  option: EChartsCoreOption;
  height?: number | string;
  className?: string;
  style?: CSSProperties;

  onClick?: (params: {
    seriesName?: string;
    name?: string;
    dataIndex?: number;
    data?: unknown;
    componentType?: string;
  }) => void;

  onAxisClick?: (dataIndex: number) => void;
  ariaLabel?: string;
}

export function EChart({
  option,
  height = 240,
  className,
  style,
  onClick,
  onAxisClick,
  ariaLabel,
}: EChartProps) {
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const click = useRef(onClick);
  click.current = onClick;
  const axisClick = useRef(onAxisClick);
  axisClick.current = onAxisClick;

  const last = useRef<string>('');

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const c = echarts.init(el, undefined, { renderer: 'svg' });
    chart.current = c;

    last.current = '';

    let taken = false;
    c.on('click', (p) => {
      const q = p as { dataIndex?: number };
      if (typeof q.dataIndex === 'number') taken = true;
      click.current?.(p as never);
    });

    c.getZr().on('click', (e: { offsetX: number; offsetY: number }) => {
      if (taken) {
        taken = false;
        return;
      }
      if (!axisClick.current) return;
      const at: [number, number] = [e.offsetX, e.offsetY];
      if (!c.containPixel('grid', at)) return;
      const xAxis = (
        c.getOption() as { xAxis?: { type?: string; data?: unknown[] }[] }
      ).xAxis?.[0];
      if (!xAxis || xAxis.type !== 'category' || !xAxis.data?.length) return;
      let best = -1,
        dist = Infinity;
      xAxis.data.forEach((_, i) => {
        const px = c.convertToPixel(
          { xAxisIndex: 0 },
          i as never,
        ) as unknown as number;
        const d = Math.abs(px - e.offsetX);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      if (best >= 0) axisClick.current(best);
    });
    // one resize per frame: a grid reflow or a window drag fires many entries
    let resizeFrame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => c.resize());
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(resizeFrame);
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    const key = JSON.stringify(option);
    if (key === last.current) return;
    last.current = key;
    chart.current?.setOption(option, { notMerge: true });
  }, [option]);

  const sized = useMemo<CSSProperties>(
    () => ({ height, width: '100%', ...style }),
    [height, style],
  );
  return (
    <div
      ref={box}
      className={className}
      style={sized}
      role="img"
      aria-label={ariaLabel}
      data-slot="chart"
    />
  );
}
