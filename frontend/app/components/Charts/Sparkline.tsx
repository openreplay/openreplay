import { BarChart, LineChart } from 'echarts/charts';
import React from 'react';

import { echarts } from './init';

echarts.use([BarChart, LineChart]);

interface Props {
  data: Record<string, any>[];
  /** Key holding the value to plot. */
  valueKey: string;
  type?: 'bar' | 'area';
  color?: string;
  /** Vertical gradient fill, top -> bottom. Ignored for `bar`. */
  gradient?: [string, string];
  height?: number;
  width?: number | string;
  name?: string;
  /** Rendered inside the tooltip for the hovered row; no tooltip when omitted. */
  tooltipFormatter?: (row: Record<string, any>) => string;
  /** Lower bound of the value axis — recharts' `baseValue`. */
  baseValue?: number;
  /** Stroke on top of an area fill. 0 (the default) draws fill only. */
  strokeWidth?: number;
  strokeColor?: string;
  strokeOpacity?: number;
}

/**
 * Axis-less inline chart for the small trend/preview graphs (error list rows,
 * the errors trend block, the session performance strip). These used recharts
 * with every axis hidden, so nothing here needs a grid, legend or axis labels.
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

  React.useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    const obs = new ResizeObserver(() => chart.resize());
    obs.observe(chartRef.current);

    const fill =
      type === 'area' && gradient
        ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: gradient[0] },
            { offset: 1, color: gradient[1] },
          ])
        : color;

    chart.setOption({
      animation: false,
      backgroundColor: 'transparent',
      // The whole point is an axis-less strip: no gutters at all.
      grid: { left: 0, right: 0, top: 2, bottom: 0, containLabel: false },
      xAxis: {
        type: 'category',
        show: false,
        boundaryGap: type === 'bar',
        data: (data ?? []).map((_, i) => i),
      },
      yAxis: {
        type: 'value',
        show: false,
        min: baseValue ?? 0,
      },
      tooltip: tooltipFormatter
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
              const row = (data ?? [])[idx];
              return row ? tooltipFormatter(row) : '';
            },
          }
        : { show: false },
      series: [
        {
          name,
          type: type === 'area' ? 'line' : 'bar',
          data: (data ?? []).map((row) => row[valueKey] ?? 0),
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
          areaStyle: type === 'area' ? { color: fill, opacity: 1 } : undefined,
          itemStyle: { color: type === 'area' ? color : fill },
        },
      ],
    });

    return () => {
      chart.dispose();
      obs.disconnect();
    };
  }, [
    data,
    valueKey,
    type,
    color,
    gradient,
    name,
    baseValue,
    strokeWidth,
    strokeColor,
    strokeOpacity,
  ]);

  return <div ref={chartRef} style={{ width, height }} />;
}

export default Sparkline;
