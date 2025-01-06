import React from 'react';
import {
  DataProps,
  buildCategories,
  customTooltipFormatter
} from './utils';
import { buildBarDatasetsAndSeries } from './barUtils';
import { defaultOptions, echarts, initWindowStorages } from "./init";
import { BarChart } from 'echarts/charts';

echarts.use([BarChart]);

interface BarChartProps extends DataProps {
  label?: string;
  horizontal?: boolean;
}

function ORBarChart(props: BarChartProps) {
  const chartUuid = React.useRef<string>(Math.random().toString(36).substring(7));
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    const categories = buildCategories(props.data);
    const { datasets, series } = buildBarDatasetsAndSeries(props, props.horizontal ?? false);

    initWindowStorages(chartUuid.current, categories, props.data.chart, props.compData?.chart ?? []);
    series.forEach((s: any) => {
      (window as any).__seriesColorMap[chartUuid.current][s.name] = s.itemStyle?.color ?? '#999';
      const ds = datasets.find((d) => d.id === s.datasetId);
      if (!ds) return;
      const yDim = props.horizontal ? s.encode.x : s.encode.y;
      const yDimIndex = ds.dimensions.indexOf(yDim);
      if (yDimIndex < 0) return;

      (window as any).__seriesValueMap[chartUuid.current][s.name] = {};
      ds.source.forEach((row: any[]) => {
        const rowIdx = row[0]; // 'idx'
        (window as any).__seriesValueMap[chartUuid.current][s.name][rowIdx] = row[yDimIndex];
      });
    });


    const xAxis: any = {
      type: props.horizontal ? 'value' : 'category',
      data: props.horizontal ? undefined : categories,
    };
    const yAxis: any = {
      type: props.horizontal ? 'category' : 'value',
      data: props.horizontal ? categories : undefined,
      name: props.label ?? 'Number of Sessions',
      nameLocation: 'middle',
      nameGap: 35,
    };

    chart.setOption({
      ...defaultOptions,
      legend: {
        ...defaultOptions.legend,
        data: series.filter((s: any) => !s._hideInLegend).map((s: any) => s.name),
      },
      tooltip: {
        ...defaultOptions.tooltip,
        formatter: customTooltipFormatter(chartUuid.current),
      },
      xAxis,
      yAxis,
      dataset: datasets,
      series,
    });

    return () => {
      chart.dispose();
      delete (window as any).__seriesValueMap[chartUuid.current];
      delete (window as any).__seriesColorMap[chartUuid.current];
      delete (window as any).__categoryMap[chartUuid.current];
      delete (window as any).__timestampMap[chartUuid.current];
      delete (window as any).__timestampCompMap[chartUuid.current];
    };
  }, [props.data, props.compData, props.horizontal]);

  return <div ref={chartRef} style={{ width: '100%', height: 240 }} />;
}

export default ORBarChart;
