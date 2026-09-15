import { BarChart, LineChart } from 'echarts/charts';
import React from 'react';

import { echarts } from './init';

echarts.use([BarChart, LineChart]);

interface Props {
  data: Record<string, any>[];
  valueKey: string;
  type?: 'bar' | 'area';
  color?: string;
  /** Vertical fill, top -> bottom. Ignored for `bar`. */
  gradient?: [string, string];
  height?: number;
  width?: number | string;
  name?: string;
  /** Omit for no tooltip. */
  tooltipFormatter?: (row: Record<string, any>) => string;
  baseValue?: number;
  /** 0, the default, draws the fill without a stroke. */
  strokeWidth?: number;
  strokeColor?: string;
  strokeOpacity?: number;
}

/**
 * Axis-less inline chart for the small trend/preview graphs — error list rows,
 * the errors trend block, the session performance strip.
 */
function Sparkline(props: Props) {
  const {
    data,
    valueKey,
    type = 'bar',
    color = '#3EAAAF',
    gradient,
    height = 40,
    width = '100%',
    name,
    tooltipFormatter,
    baseValue,
    strokeWidth = 0,
    strokeColor,
    strokeOpacity = 1,
  } = props;

  const chartRef = React.useRef<HTMLDivElement>(null);
  const instRef = React.useRef<any>(null);
  const latest = React.useRef({ rows: data ?? [], tooltipFormatter });
  React.useEffect(() => {
    latest.current.tooltipFormatter = tooltipFormatter;
  });

  // Callers write `gradient={[...]}` inline; compare by value.
  const gradientKey = gradient ? gradient.join('|') : '';
  const stableGradient = React.useMemo(() => gradient, [gradientKey]);
  const hasTooltip = Boolean(tooltipFormatter);

  React.useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const chart = echarts.init(el);
    instRef.current = chart;
    const obs = new ResizeObserver(() => chart.resize());
    obs.observe(el);
    return () => {
      obs.disconnect();
      chart.dispose();
      instRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const chart = instRef.current;
    if (!chart) return;
    const rows = data ?? [];
    latest.current.rows = rows;

    const fill =
      type === 'area' && stableGradient
        ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: stableGradient[0] },
            { offset: 1, color: stableGradient[1] },
          ])
        : color;

    chart.setOption(
      {
        animation: false,
        backgroundColor: 'transparent',
        grid: { left: 0, right: 0, top: 2, bottom: 0, containLabel: false },
        xAxis: {
          type: 'category',
          show: false,
          boundaryGap: type === 'bar',
          data: rows.map((_, i) => i),
        },
        yAxis: {
          type: 'value',
          show: false,
          min: baseValue ?? 0,
        },
        tooltip: hasTooltip
          ? {
              trigger: 'axis',
              backgroundColor: 'var(--color-white)',
              borderColor: 'var(--color-gray-light)',
              borderWidth: 1,
              extraCssText: 'box-shadow: 0 2px 8px rgba(0,0,0,.12);',
              textStyle: { color: 'var(--color-gray-darkest)' },
              axisPointer: { type: type === 'bar' ? 'shadow' : 'line' },
              formatter: (params: any) => {
                const idx = Array.isArray(params)
                  ? params[0]?.dataIndex
                  : params?.dataIndex;
                const row = latest.current.rows[idx];
                const fmt = latest.current.tooltipFormatter;
                return row && fmt ? fmt(row) : '';
              },
            }
          : { show: false },
        series: [
          {
            name,
            type: type === 'area' ? 'line' : 'bar',
            data: rows.map((row) => row[valueKey] ?? 0),
            showSymbol: false,
            smooth: type === 'area',
            lineStyle:
              type === 'area'
                ? {
                    width: strokeWidth,
                    color: strokeColor ?? color,
                    opacity: strokeOpacity,
                  }
                : undefined,
            areaStyle:
              type === 'area' ? { color: fill, opacity: 1 } : undefined,
            itemStyle: { color: type === 'area' ? color : fill },
          },
        ],
      },
      { notMerge: true },
    );
  }, [
    data,
    valueKey,
    type,
    color,
    stableGradient,
    name,
    baseValue,
    strokeWidth,
    strokeColor,
    strokeOpacity,
    hasTooltip,
  ]);

  return <div ref={chartRef} style={{ width, height }} />;
}

export default Sparkline;
