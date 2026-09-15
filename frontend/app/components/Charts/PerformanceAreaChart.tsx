import { LineChart } from 'echarts/charts';
import { MarkLineComponent } from 'echarts/components';
import React from 'react';

import { echarts } from './init';

// A tree-shaken echarts renders an unregistered component as nothing at all,
// without warning — MarkLineComponent is not in ./init's shared set.
echarts.use([LineChart, MarkLineComponent]);

export interface PerfBand {
  key: string;
  color: string;
  strokeColor?: string;
  step?: boolean;
  gradient?: boolean;
  /** Stroke only, no fill. */
  line?: boolean;
}

interface Props {
  data: any[];
  bands: PerfBand[];
  /** Corner caption — 'FPS', 'CPU', 'Memory', 'Nodes'. */
  label: string;
  xKey?: string;
  yMin?: number;
  yMax?: number | null;
  /** Top of the value axis as a multiple of the largest sample. */
  yMaxRatio?: number;
  /** Omit to hide the value axis entirely. */
  yFormatter?: (value: number) => string;
  /** Omit to keep the time axis but hide its labels. */
  xFormatter?: (value: number) => string;
  ticks?: number[];
  cursorTime?: number;
  cursorColor?: string;
  height: number | string;
  /** Charts sharing a group id sync their axis pointer. */
  groupId?: string;
  onPointClick?: (index: number) => void;
  /** Return null to suppress the tooltip for that row. */
  tooltipFormatter?: (row: any, index: number) => string | null;
}

/* A markLine on a series with no data has no coordinate system to resolve
   against and renders nothing, so the cursor rides the first data series. */
const CURSOR_SERIES_ID = '__band0';

/** Applied on top of whatever alpha the gradient stops carry. */
const AREA_FILL_OPACITY = 0.6;

/* echarts stamps sans-serif on its own text; the old SVG inherited the app's. */
const FONT_FAMILY = 'Roboto, sans-serif';

/* Pointer sync. echarts.connect() forwards the source chart's seriesIndex, so a
   strip whose series is null at that index — FPS while the tab was hidden,
   exactly when its tooltip has something to say — shows nothing. Broadcasting a
   pixel position instead lets each strip resolve the row itself. */
const groups = new Map<string, Set<any>>();

function withAlpha(color: string, alpha: number): string {
  const hex = color.trim();
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * One strip of the session player's performance panel: an area chart over
 * session time with a playback cursor, click-to-seek, and a pointer synced
 * across the sibling strips.
 */
function PerformanceAreaChart(props: Props) {
  const {
    data,
    bands,
    label,
    xKey = 'time',
    yMin = 0,
    yMax = null,
    yMaxRatio,
    yFormatter,
    xFormatter,
    ticks,
    cursorTime,
    cursorColor = '#394EFF',
    height,
    groupId,
    onPointClick,
    tooltipFormatter,
  } = props;

  const chartRef = React.useRef<HTMLDivElement>(null);
  const instRef = React.useRef<any>(null);

  /* The parent re-renders on every playback tick, so anything the chart reads
     from props goes through here rather than into effect deps: handlers stay
     bound once and always see the current callbacks and rows. */
  const latest = React.useRef({
    rows: [] as any[],
    xs: [] as number[],
    cursorTime,
    onPointClick,
    tooltipFormatter,
    xFormatter,
    yFormatter,
  });
  // Runs before the effects below on every commit.
  React.useEffect(() => {
    latest.current.cursorTime = cursorTime;
    latest.current.onPointClick = onPointClick;
    latest.current.tooltipFormatter = tooltipFormatter;
    latest.current.xFormatter = xFormatter;
    latest.current.yFormatter = yFormatter;
  });

  // Callers write `bands={[...]}` inline; compare by value.
  const bandsKey = JSON.stringify(bands);
  const stableBands = React.useMemo(() => bands, [bandsKey]);

  React.useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const chart = echarts.init(el);
    instRef.current = chart;
    let peers: Set<any> | undefined;
    if (groupId) {
      peers = groups.get(groupId);
      if (!peers) {
        peers = new Set();
        groups.set(groupId, peers);
      }
      peers.add(chart);
    }

    const obs = new ResizeObserver(() => chart.resize());
    obs.observe(el);

    // A click anywhere on the plot seeks, so map its x back to the nearest
    // sample rather than requiring a hit on a point.
    const zr = chart.getZr();
    const handleClick = (event: any) => {
      const { rows, xs, onPointClick: onClick } = latest.current;
      if (!onClick || !rows.length) return;
      const point = [event.offsetX, event.offsetY];
      // convertFromPixel returns a tuple for a grid finder but a bare number
      // for a single-axis one, which destructures to undefined.
      const converted: any = chart.convertFromPixel({ gridIndex: 0 }, point);
      const x = Array.isArray(converted) ? converted[0] : converted;
      if (x == null || Number.isNaN(x)) return;
      let nearest = 0;
      let best = Infinity;
      xs.forEach((value: number, i: number) => {
        const d = Math.abs(value - x);
        if (d < best) {
          best = d;
          nearest = i;
        }
      });
      onClick(nearest);
    };
    zr.on('click', handleClick);

    const broadcast = (event: any) => {
      peers?.forEach((peer) => {
        if (peer === chart) return;
        peer.dispatchAction({
          type: 'showTip',
          x: event.offsetX,
          y: peer.getHeight() / 2,
        });
      });
    };
    const clearPeers = () => {
      peers?.forEach((peer) => {
        if (peer !== chart) peer.dispatchAction({ type: 'hideTip' });
      });
    };
    zr.on('mousemove', broadcast);
    zr.on('globalout', clearPeers);

    return () => {
      zr.off('click', handleClick);
      zr.off('mousemove', broadcast);
      zr.off('globalout', clearPeers);
      peers?.delete(chart);
      if (peers && !peers.size && groupId) groups.delete(groupId);
      obs.disconnect();
      chart.dispose();
      instRef.current = null;
    };
  }, [groupId]);

  const hasXLabels = Boolean(xFormatter);
  const hasYLabel = Boolean(yFormatter);
  const hasTooltip = Boolean(tooltipFormatter);

  React.useEffect(() => {
    const chart = instRef.current;
    if (!chart) return;

    const rows = data ?? [];
    const xs = rows.map((row) => row[xKey]);
    latest.current.rows = rows;
    latest.current.xs = xs;

    let scaledMax: number | undefined;
    if (yMaxRatio) {
      let peak = 0;
      rows.forEach((row) => {
        stableBands.forEach((band) => {
          const v = row[band.key];
          if (typeof v === 'number' && v > peak) peak = v;
        });
      });
      scaledMax = peak * yMaxRatio;
    }
    const axisMax = scaledMax ?? yMax ?? undefined;

    const cursor = latest.current.cursorTime;
    const cursorMarkLine = {
      silent: true,
      symbol: 'none' as const,
      animation: false,
      lineStyle: { color: cursorColor, width: 1, type: 'solid' as const },
      emphasis: { disabled: true },
      label: { show: false },
      data: cursor != null ? [{ xAxis: cursor }] : [],
    };

    const series: any[] = stableBands.map((band, i) => ({
      ...(i === 0 ? { id: CURSOR_SERIES_ID, markLine: cursorMarkLine } : {}),
      name: band.key,
      type: 'line',
      step: band.step ? 'start' : false,
      smooth: !band.step,
      // echarts' plain spline overshoots the samples; monotone does not.
      smoothMonotone: 'x',
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 6,
      // Null means "no sample", not zero — leave the gap.
      connectNulls: false,
      lineStyle: {
        width: band.strokeColor ? 1 : 0,
        color: band.strokeColor ?? band.color,
      },
      itemStyle: { color: band.strokeColor ?? band.color },
      areaStyle: band.line
        ? undefined
        : {
            opacity: AREA_FILL_OPACITY,
            color: band.gradient
              ? // Deliberately diagonal from one box-width left of the shape,
                // so most of the area sits past the 95% stop, at the light end.
                new echarts.graphic.LinearGradient(-1, 0, 0, 1, [
                  { offset: 0.05, color: withAlpha(band.color, 0.7) },
                  { offset: 0.95, color: withAlpha(band.color, 0.2) },
                ])
              : band.color,
          },
      data: rows.map((row) => [row[xKey], row[band.key] ?? null]),
    }));

    const yText = latest.current.yFormatter;
    chart.setOption(
      {
        animation: false,
        backgroundColor: 'transparent',
        grid: { left: 0, right: 0, top: 0, bottom: 0, containLabel: false },
        xAxis: {
          type: 'value',
          position: 'top',
          min: 0,
          max: xs.length ? Math.max(...xs) : undefined,
          // This line is what separates one strip from the next; onZero would
          // pin it to the y=0 gridline at the bottom instead of the top.
          axisLine: {
            show: true,
            onZero: false,
            lineStyle: { color: '#666', width: 1 },
          },
          splitLine: { show: false },
          axisTick: { show: false, customValues: ticks },
          axisLabel: hasXLabels
            ? {
                inside: true,
                margin: 4,
                fontSize: 12,
                fontFamily: FONT_FAMILY,
                color: '#333',
                customValues: ticks,
                formatter: (v: number) => latest.current.xFormatter?.(v) ?? '',
              }
            : { show: false },
        },
        yAxis: {
          type: 'value',
          min: yMin,
          max: axisMax,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          // A live axis label makes echarts reserve half its height at the top
          // of the grid, pushing the strip down and striking the text through
          // with the axis line — the top reading is a `graphic` below instead.
          axisLabel: { show: false },
        },
        tooltip: hasTooltip
          ? {
              trigger: 'axis',
              // Every strip in the group shows its tooltip at once; confining
              // keeps each inside its own strip rather than over its neighbour.
              confine: true,
              axisPointer: {
                type: 'line',
                lineStyle: { color: '#ccc', width: 1, type: 'solid' },
              },
              // The formatter returns its own styled wrapper; echarts would
              // otherwise paint a second box around it.
              backgroundColor: 'transparent',
              borderWidth: 0,
              padding: 0,
              extraCssText: 'box-shadow: none;',
              formatter: (params: any) => {
                const first = Array.isArray(params) ? params[0] : params;
                const idx = first?.dataIndex;
                const fmt = latest.current.tooltipFormatter;
                if (idx == null || !fmt) return '';
                return fmt(latest.current.rows[idx], idx) ?? '';
              },
            }
          : { show: false },
        graphic: [
          {
            type: 'text',
            right: 6,
            top: 3,
            silent: true,
            style: {
              text: label,
              fontSize: 14,
              fontFamily: FONT_FAMILY,
              fill: 'var(--color-gray-darkest)',
            },
          },
          ...(yText && axisMax != null
            ? [
                {
                  type: 'text',
                  left: 5,
                  top: 1,
                  silent: true,
                  style: {
                    text: yText(axisMax),
                    fontSize: 14,
                    fontFamily: FONT_FAMILY,
                    fill: '#666',
                  },
                },
              ]
            : []),
        ],
        series,
      },
      { notMerge: true },
    );
  }, [
    data,
    stableBands,
    label,
    xKey,
    yMin,
    yMax,
    yMaxRatio,
    ticks,
    cursorColor,
    groupId,
    hasXLabels,
    hasYLabel,
    hasTooltip,
  ]);

  // Moves every frame during playback — patch just that series.
  React.useEffect(() => {
    const chart = instRef.current;
    if (!chart) return;
    chart.setOption({
      series: [
        {
          id: CURSOR_SERIES_ID,
          markLine: {
            data: cursorTime != null ? [{ xAxis: cursorTime }] : [],
          },
        },
      ],
    });
  }, [cursorTime]);

  return <div ref={chartRef} style={{ width: '100%', height }} />;
}

export default PerformanceAreaChart;
