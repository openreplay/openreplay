import { BarChart, LineChart } from 'echarts/charts';
import React from 'react';

import { numberWithCommas } from 'App/utils';

import { defaultOptions, echarts } from './init';

echarts.use([BarChart, LineChart]);

export interface TimeseriesSeries {
  key: string;
  name: string;
  color: string;
}

interface Props {
  data: Record<string, any>[];
  series: TimeseriesSeries[];
  /** 'line' takes an `area` flag; 'bar' honours `stack`. */
  type?: 'bar' | 'line';
  stack?: boolean;
  area?: boolean;
  xKey?: string;
  height?: number;
  yLabel?: string;
  showLegend?: boolean;
  /** Category labels to skip between shown ones; 0 shows all. */
  xInterval?: number;
  valueFormatter?: (value: number) => string;
}

/** Generic categorical timeseries for the predefined dashboard widgets. */
function TimeseriesChart(props: Props) {
  const {
    data,
    series,
    type = 'bar',
    stack = false,
    area = false,
    xKey = 'time',
    height = 240,
    yLabel,
    showLegend = true,
    xInterval,
    valueFormatter,
  } = props;

  const chartRef = React.useRef<HTMLDivElement>(null);
  const instRef = React.useRef<any>(null);
  const formatterRef = React.useRef(valueFormatter);
  React.useEffect(() => {
    formatterRef.current = valueFormatter;
  });

  // Callers write `series={[...]}` inline; compare by value.
  const seriesKey = JSON.stringify(series);
  const stableSeries = React.useMemo(() => series, [seriesKey]);
  const hasFormatter = Boolean(valueFormatter);

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

    chart.setOption(
      {
        ...defaultOptions,
        backgroundColor: 'transparent',
        grid: {
          ...defaultOptions.grid,
          left: 50,
          right: 20,
          top: 30,
          bottom: 24,
        },
        legend: showLegend
          ? { ...defaultOptions.legend, data: stableSeries.map((s) => s.name) }
          : { show: false },
        tooltip: {
          ...defaultOptions.tooltip,
          trigger: 'axis',
          backgroundColor: 'var(--color-white)',
          borderColor: 'var(--color-gray-light)',
          borderWidth: 1,
          extraCssText: 'box-shadow: 0 2px 8px rgba(0,0,0,.12);',
          textStyle: { color: 'var(--color-gray-darkest)' },
          axisPointer: { type: type === 'bar' ? 'shadow' : 'line' },
          valueFormatter: (v: number) => numberWithCommas(Math.round(v)),
        },
        toolbox: { feature: { saveAsImage: { show: false } } },
        xAxis: {
          type: 'category',
          boundaryGap: type === 'bar',
          data: rows.map((row) => row[xKey]),
          axisLabel:
            xInterval != null && xInterval >= 0
              ? { interval: Math.max(0, Math.round(xInterval)) }
              : {},
        },
        yAxis: {
          ...defaultOptions.yAxis,
          type: 'value',
          // These are all counts — no fractional ticks.
          minInterval: 1,
          name: yLabel,
          nameLocation: 'middle',
          nameGap: 36,
          axisLabel: hasFormatter
            ? { formatter: (v: number) => formatterRef.current?.(v) ?? '' }
            : {},
        },
        series: stableSeries.map((s) => ({
          name: s.name,
          type,
          stack: stack ? 'total' : undefined,
          showSymbol: false,
          smooth: type === 'line',
          lineStyle: type === 'line' ? { width: 2 } : undefined,
          areaStyle: type === 'line' && area ? { opacity: 0.2 } : undefined,
          itemStyle: { color: s.color },
          data: rows.map((row) => row[s.key] ?? 0),
        })),
      },
      { notMerge: true },
    );
  }, [
    data,
    stableSeries,
    type,
    stack,
    area,
    xKey,
    yLabel,
    showLegend,
    xInterval,
    hasFormatter,
  ]);

  return <div ref={chartRef} style={{ width: '100%', height }} />;
}

export default TimeseriesChart;
