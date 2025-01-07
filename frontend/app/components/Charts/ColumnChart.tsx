import React from 'react';
import { defaultOptions, echarts } from './init';
import { BarChart } from 'echarts/charts';
import { customTooltipFormatter } from './utils';
import { buildColumnChart } from './barUtils'

echarts.use([BarChart]);

interface DataItem {
  time: string;
  timestamp: number;
  [seriesName: string]: number | string;
}

export interface DataProps {
  data: {
    chart: DataItem[];
    namesMap: string[];
  };
  compData?: {
    chart: DataItem[];
    namesMap: string[];
  };
}

interface ColumnChartProps extends DataProps {
  label?: string;
}

function ColumnChart(props: ColumnChartProps) {
  const { data, compData, label } = props;
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartUuid = React.useRef<string>(
    Math.random().toString(36).substring(7)
  );

  React.useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    (window as any).__seriesValueMap = (window as any).__seriesValueMap ?? {};
    (window as any).__seriesValueMap[chartUuid.current] = {};
    (window as any).__seriesColorMap = (window as any).__seriesColorMap ?? {};
    (window as any).__seriesColorMap[chartUuid.current] = {};

    const { yAxisData, series } = buildColumnChart(chartUuid.current, data, compData);

    chart.setOption({
      ...defaultOptions,
      tooltip: {
        ...defaultOptions.tooltip,
        formatter: customTooltipFormatter(chartUuid.current),
      },
      legend: {
        data: series
          .filter((s: any) => !s._hideInLegend)
          .map((s: any) => s.name),
      },
      grid: {
        ...defaultOptions.grid,
        left: 40,
        right: 30,
        top: 40,
        bottom: 30,
      },
      xAxis: {
        type: 'value',
        boundaryGap: [0, 0.01],
        name: label ?? 'Total',
        nameLocation: 'middle',
        nameGap: 35,
      },
      yAxis: {
        type: 'category',
        data: yAxisData,
      },
      series,
    });

    const obs = new ResizeObserver(() => chart.resize());
    obs.observe(chartRef.current);

    return () => {
      chart.dispose();
      obs.disconnect();
      delete (window as any).__seriesValueMap[chartUuid.current];
      delete (window as any).__seriesColorMap[chartUuid.current];
    };
  }, [data, compData, label]);

  return <div ref={chartRef} style={{ width: '100%', height: 240 }} />;
}

export default ColumnChart;
