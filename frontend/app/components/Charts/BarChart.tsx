import React from 'react';
import {
  DataProps,
  buildCategories,
  customTooltipFormatter
} from './utils';
import { buildBarDatasetsAndSeries } from './barUtils';
import { defaultOptions, echarts } from './init';
import { BarChart } from 'echarts/charts';

echarts.use([BarChart]);

interface BarChartProps extends DataProps {
  label?: string;
  horizontal?: boolean;
}

function ORBarChart(props: BarChartProps) {
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    const categories = buildCategories(props.data);
    const { datasets, series } = buildBarDatasetsAndSeries(props, props.horizontal ?? false);

    (window as any).__seriesValueMap = {};
    (window as any).__seriesColorMap = {};
    (window as any).__timestampMap = props.data.chart.map((item) => item.timestamp);
    (window as any).__categoryMap = categories;

    series.forEach((s: any) => {
      (window as any).__seriesColorMap[s.name] = s.itemStyle?.color ?? '#999';
      const ds = datasets.find((d) => d.id === s.datasetId);
      if (!ds) return;
      const yDim = props.horizontal ? s.encode.x : s.encode.y;
      const yDimIndex = ds.dimensions.indexOf(yDim);
      if (yDimIndex < 0) return;

      (window as any).__seriesValueMap[s.name] = {};
      ds.source.forEach((row: any[]) => {
        const rowIdx = row[0]; // 'idx'
        (window as any).__seriesValueMap[s.name][rowIdx] = row[yDimIndex];
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
        formatter: customTooltipFormatter,
      },
      xAxis,
      yAxis,
      dataset: datasets,
      series,
    });

    return () => {
      chart.dispose();
      delete (window as any).__seriesValueMap;
      delete (window as any).__seriesColorMap;
      delete (window as any).__categoryMap;
      delete (window as any).__timestampMap;
    };
  }, [props.data, props.compData, props.horizontal]);

  return <div ref={chartRef} style={{ width: '100%', height: 240 }} />;
}

export default ORBarChart;
