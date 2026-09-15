import { BarChart, LineChart } from 'echarts/charts';
import React from 'react';

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
  /** Show every Nth category label. */
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

  React.useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    const obs = new ResizeObserver(() => chart.resize());
    obs.observe(chartRef.current);

    const categories = (data ?? []).map((row) => row[xKey]);

    chart.setOption({
      ...defaultOptions,
      backgroundColor: 'transparent',
      grid: { ...defaultOptions.grid, left: 50, right: 20, top: 30, bottom: 24 },
      legend: showLegend
        ? { ...defaultOptions.legend, data: series.map((s) => s.name) }
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
      },
      toolbox: { feature: { saveAsImage: { show: false } } },
      xAxis: {
        type: 'category',
        boundaryGap: type === 'bar',
        data: categories,
        axisLabel:
          xInterval && xInterval > 0
            ? { interval: Math.max(0, Math.round(xInterval) - 1) }
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
        axisLabel: valueFormatter
          ? { formatter: (v: number) => valueFormatter(v) }
          : {},
      },
      series: series.map((s) => ({
        name: s.name,
        type,
        stack: stack ? 'total' : undefined,
        showSymbol: false,
        smooth: type === 'line',
        lineStyle: type === 'line' ? { width: 2 } : undefined,
        areaStyle: type === 'line' && area ? { opacity: 0.2 } : undefined,
        itemStyle: { color: s.color },
        data: (data ?? []).map((row) => row[s.key] ?? 0),
      })),
    });

    return () => {
      chart.dispose();
      obs.disconnect();
    };
  }, [data, series, type, stack, area, xKey, yLabel, showLegend, xInterval]);

  return <div ref={chartRef} style={{ width: '100%', height }} />;
}

export default TimeseriesChart;
