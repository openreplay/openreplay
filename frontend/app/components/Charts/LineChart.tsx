import React from 'react';
import { echarts, defaultOptions } from './init';
import { customTooltipFormatter, buildCategories, buildDatasetsAndSeries } from './utils'
import type { DataProps } from './utils'
import { LineChart } from 'echarts/charts';

echarts.use([LineChart]);

interface Props extends DataProps {
  label?: string;
  inGrid?: boolean;
  isArea?: boolean;
  chartName?: string;
  onClick?: (event: any) => void;
}

function ORLineChart(props: Props) {
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const categories = buildCategories(props.data);
    const { datasets, series } = buildDatasetsAndSeries(props);

    // Create a quick map of name => dataIndex => value, for partner lookups
    // and a map for colors. We'll store them on window in this example for brevity.
    (window as any).__seriesValueMap = {};
    (window as any).__seriesColorMap = {};
    (window as any).__timestampMap = props.data.chart.map(item => item.timestamp);
    (window as any).__categoryMap = categories;

    series.forEach((s: any) => {
      if (props.isArea) {
        s.areaStyle = {};
        s.stack = 'Total'
        // s.emphasis = { focus: 'series' };
      } else {
        s.areaStyle = null;
      }
      (window as any).__seriesColorMap[s.name] = s.itemStyle?.color ?? '#999';
      const datasetId = s.datasetId || 'current';
      const ds = datasets.find((d) => d.id === datasetId);
      if (!ds) return;
      const yDim = s.encode.y;
      const yDimIndex = ds.dimensions.indexOf(yDim);
      if (yDimIndex < 0) return;

      (window as any).__seriesValueMap[s.name] = {};
      ds.source.forEach((row: any[]) => {
        const rowIdx = row[0];
        (window as any).__seriesValueMap[s.name][rowIdx] = row[yDimIndex];
      });
    });

    chart.setOption({
      ...defaultOptions,
      title: {
        text: props.chartName ?? "Line Chart",
        show: false,
      },
      legend: {
        ...defaultOptions.legend,
        // Only show legend for “current” series
        data: series.filter((s: any) => !s._hideInLegend).map((s: any) => s.name),
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: categories,
      },
      yAxis: {
        name: props.label ?? 'Number of Sessions',
        nameLocation: 'middle',
        nameGap: 35,
      },
      tooltip: {
        ...defaultOptions.tooltip,
        formatter: customTooltipFormatter,
      },
      dataset: datasets,
      series,
    });
    chart.on('click', (event) => {
      const index = event.dataIndex;
      const timestamp = (window as any).__timestampMap?.[index];
      props.onClick?.({ activePayload: [{ payload: { timestamp }}]})
    })

    return () => {
      chart.dispose();
      delete (window as any).__seriesValueMap;
      delete (window as any).__seriesColorMap;
      delete (window as any).__categoryMap;
      delete (window as any).__timestampMap;
    };
  }, [props.data, props.compData]);

  return <div ref={chartRef} style={{ width: '100%', height: 240 }} />;
}

export default ORLineChart;
