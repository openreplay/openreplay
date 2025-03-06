import React from 'react';
import { BarChart } from 'echarts/charts';
import { defaultOptions, echarts } from './init';
import { customTooltipFormatter } from './utils';
import { buildColumnChart } from './barUtils';

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
  onSeriesFocus?: (name: string) => void;
}

function ColumnChart(props: ColumnChartProps) {
  const { data, compData, label } = props;
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartUuid = React.useRef<string>(
    Math.random().toString(36).substring(7),
  );

  React.useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    (window as any).__seriesValueMap = (window as any).__seriesValueMap ?? {};
    (window as any).__seriesValueMap[chartUuid.current] = {};
    (window as any).__seriesColorMap = (window as any).__seriesColorMap ?? {};
    (window as any).__seriesColorMap[chartUuid.current] = {};
    (window as any).__yAxisData = (window as any).__yAxisData ?? {};

    const { yAxisData, series } = buildColumnChart(
      chartUuid.current,
      data,
      compData,
    );
    (window as any).__yAxisData[chartUuid.current] = yAxisData;

    chart.setOption({
      ...defaultOptions,
      tooltip: {
        ...defaultOptions.tooltip,
        formatter: customTooltipFormatter(chartUuid.current),
      },
      legend: {
        ...defaultOptions.legend,
        data: series
          .filter((s: any) => !s._hideInLegend)
          .map((s: any) => s.name),
      },
      toolbox: {
        feature: {
          saveAsImage: { show: false },
        },
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
        name: label ?? 'Total',
        nameLocation: 'center',
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
    chart.on('click', (event) => {
      const focusedSeriesName = event.name;
      props.onSeriesFocus?.(focusedSeriesName);
    });

    return () => {
      chart.dispose();
      obs.disconnect();
      delete (window as any).__seriesValueMap[chartUuid.current];
      delete (window as any).__seriesColorMap[chartUuid.current];
      delete (window as any).__yAxisData[chartUuid.current];
    };
  }, [data, compData, label]);

  return <div ref={chartRef} style={{ width: '100%', height: 240 }} />;
}

export default ColumnChart;
