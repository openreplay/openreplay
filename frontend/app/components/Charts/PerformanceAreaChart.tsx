import { LineChart } from 'echarts/charts';
import { MarkLineComponent } from 'echarts/components';
import React from 'react';

import { echarts } from './init';

// MarkLineComponent is not part of the shared registration in ./init, and in a
// tree-shaken echarts build an unregistered component renders nothing at all —
// silently, which is how the playback cursor came out invisible.
echarts.use([LineChart, MarkLineComponent]);

export interface PerfBand {
  /** Key to read out of each row. */
  key: string;
  color: string;
  strokeColor?: string;
  /** Renders as a step line — recharts' type="stepBefore". */
  step?: boolean;
  /** Fade the fill, as the old <Gradient> defs did. */
  gradient?: boolean;
  /** Stroke only, no fill — recharts' <Line> rather than <Area>. */
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
  /** Explicit time-axis tick positions, as the old XAxis `ticks` prop gave. */
  ticks?: number[];
  /** Playback position; draws the cursor line. */
  cursorTime?: number;
  cursorColor?: string;
  height: number | string;
  /** Charts sharing a group id sync their axis pointer, like recharts syncId. */
  groupId?: string;
  onPointClick?: (index: number) => void;
  /** Return null to suppress the tooltip for that row. */
  tooltipFormatter?: (row: any, index: number) => string | null;
}

/* The cursor rides on the first data series: a markLine on a series with no
   data has no coordinate system to resolve against and renders nothing. */
const CURSOR_SERIES_ID = '__band0';

/* recharts' <Area> painted every fill at fillOpacity 0.6 by default, on top of
   whatever alpha the gradient stops carried. Both charts have to apply it or
   the fills come out roughly twice as dark as they used to. */
const AREA_FILL_OPACITY = 0.6;

/* echarts stamps sans-serif on its own text; the old SVG inherited the app's. */
const FONT_FAMILY = 'Roboto, sans-serif';

/* Charts that move their pointer together, standing in for recharts' syncId.
   echarts.connect() forwards the source chart's seriesIndex, so a strip whose
   series is null at that index — FPS while the tab was hidden, which is exactly
   when its tooltip has something to say — silently shows nothing. Broadcasting
   a pixel position instead lets each strip resolve the row for itself. */
const groups = new Map<string, Set<any>>();

function withAlpha(color: string, alpha: number): string {
  const hex = color.trim();
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  // eslint-disable-next-line no-bitwise
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * The stacked strips in the session player's performance panel. Each one is an
 * area chart over session time with a playback cursor, click-to-seek, and a
 * pointer synced across the sibling charts.
 *
 * Replaces the recharts AreaChart/ComposedChart these were built from; the
 * mirrored axes there map onto echarts' `inside` axis labels.
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

  React.useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
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
    obs.observe(chartRef.current);

    const rows = data ?? [];
    const xs = rows.map((row) => row[xKey]);

    // recharts took domain={[0, max => max * 1.2]} on the heap/nodes axes.
    let scaledMax: number | undefined;
    if (yMaxRatio) {
      let peak = 0;
      rows.forEach((row) => {
        bands.forEach((band) => {
          const v = row[band.key];
          if (typeof v === 'number' && v > peak) peak = v;
        });
      });
      scaledMax = peak * yMaxRatio;
    }
    const axisMax = scaledMax ?? yMax ?? undefined;

    const cursorMarkLine = {
      silent: true,
      symbol: 'none' as const,
      animation: false,
      lineStyle: { color: cursorColor, width: 1, type: 'solid' as const },
      emphasis: { disabled: true },
      label: { show: false },
      data: cursorTime != null ? [{ xAxis: cursorTime }] : [],
    };

    const series: any[] = bands.map((band, i) => ({
      ...(i === 0 ? { id: CURSOR_SERIES_ID, markLine: cursorMarkLine } : {}),
      name: band.key,
      type: 'line',
      step: band.step ? 'start' : false,
      smooth: !band.step,
      // recharts' type="monotone" never overshoots; echarts' plain spline does.
      smoothMonotone: 'x',
      showSymbol: false,
      // Only drawn on hover, standing in for recharts' activeDot.
      symbol: 'circle',
      symbolSize: 6,
      // Nulls mean "no sample", not zero — don't bridge them.
      connectNulls: false,
      lineStyle: {
        // recharts' default Area/Line strokeWidth was 1; markers drew stroke="none".
        width: band.strokeColor ? 1 : 0,
        color: band.strokeColor ?? band.color,
      },
      itemStyle: { color: band.strokeColor ?? band.color },
      areaStyle: band.line
        ? undefined
        : {
            opacity: AREA_FILL_OPACITY,
            color: band.gradient
              ? // Same vector the old <Gradient> used: it runs diagonally from
                // one box-width left of the shape, so most of the area sits past
                // the 95% stop and renders at the lighter end of the ramp.
                new echarts.graphic.LinearGradient(-1, 0, 0, 1, [
                  { offset: 0.05, color: withAlpha(band.color, 0.7) },
                  { offset: 0.95, color: withAlpha(band.color, 0.2) },
                ])
              : band.color,
          },
      data: rows.map((row) => [row[xKey], row[band.key] ?? null]),
    }));

    chart.setOption({
      animation: false,
      backgroundColor: 'transparent',
      grid: { left: 0, right: 0, top: 0, bottom: 0, containLabel: false },
      xAxis: {
        type: 'value',
        position: 'top',
        min: 0,
        max: xs.length ? Math.max(...xs) : undefined,
        // recharts drew the time axis line by default (CartesianAxis stroke #666);
        // it is what separates one strip from the next.
        // onZero would pin it to the y=0 gridline at the bottom of the strip.
        axisLine: {
          show: true,
          onZero: false,
          lineStyle: { color: '#666', width: 1 },
        },
        splitLine: { show: false },
        axisTick: { show: false, customValues: ticks },
        axisLabel: xFormatter
          ? {
              inside: true,
              margin: 4,
              fontSize: 12,
              fontFamily: FONT_FAMILY,
              color: '#333',
              customValues: ticks,
              formatter: (v: number) => xFormatter(v),
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
        // The top reading is drawn as a graphic below instead: a live axis label
        // makes echarts reserve half its height at the top of the grid, which
        // pushes the strip down and puts the axis line through the text.
        axisLabel: { show: false },
      },
      tooltip: tooltipFormatter
        ? {
            trigger: 'axis',
            // Every strip in the group shows its tooltip at once (recharts did
            // the same through syncId); confining keeps each one inside its own
            // strip instead of spilling over the chart below.
            confine: true,
            // recharts drew a plain solid grey cursor, not echarts' dashed one.
            axisPointer: {
              type: 'line',
              lineStyle: { color: '#ccc', width: 1, type: 'solid' },
            },
            // The formatter returns a styled wrapper of its own; without this
            // echarts paints a second box around it, which reads as a dark
            // frame around a white card in dark mode.
            backgroundColor: 'transparent',
            borderWidth: 0,
            padding: 0,
            extraCssText: 'box-shadow: none;',
            formatter: (params: any) => {
              const first = Array.isArray(params) ? params[0] : params;
              const idx = first?.dataIndex;
              if (idx == null) return '';
              return tooltipFormatter(rows[idx], idx) ?? '';
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
        // recharts showed a single value-axis reading, pinned to the top-left
        // (YAxis mirror + minTickGap: MAX_SAFE_INTEGER).
        ...(yFormatter && axisMax != null
          ? [
              {
                type: 'text',
                left: 5,
                top: 1,
                silent: true,
                style: {
                  text: yFormatter(axisMax),
                  fontSize: 14,
                  fontFamily: FONT_FAMILY,
                  fill: '#666',
                },
              },
            ]
          : []),
      ],
      series,
    });

    // recharts seeked from a click anywhere on the plot, not just on a point,
    // so map the click's x pixel back to the nearest sample.
    const zr = chart.getZr();
    const handleClick = (event: any) => {
      if (!onPointClick || !rows.length) return;
      const point = [event.offsetX, event.offsetY];
      // convertFromPixel returns a tuple for a grid finder but a bare number
      // for a single-axis one — destructuring the latter silently yields
      // undefined, which is why seeking did nothing.
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
      onPointClick(nearest);
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
  }, [data, bands, label, xKey, yMin, yMax, yMaxRatio, groupId, ticks]);

  // Cursor moves every frame during playback — patch just that series.
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
