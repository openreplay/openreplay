import React from 'react';
import { LineChart } from 'echarts/charts';
import { echarts, defaultOptions, initWindowStorages } from './init';
import {
  customTooltipFormatter,
  buildCategories,
  buildDatasetsAndSeries,
} from './utils';
import type { DataProps } from './utils';

echarts.use([LineChart]);

interface Props extends DataProps {
  label?: string;
  inGrid?: boolean;
  isArea?: boolean;
  chartName?: string;
  onClick?: (event: any) => void;
  onSeriesFocus?: (event: any) => void;
}

function ORLineChart(props: Props) {
  const chartUuid = React.useRef<string>(
    Math.random().toString(36).substring(7),
  );
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    const obs = new ResizeObserver(() => chart.resize());
    obs.observe(chartRef.current);

    const categories = buildCategories(props.data);
    const { datasets, series } = buildDatasetsAndSeries(props);

    initWindowStorages(
      chartUuid.current,
      categories,
      props.data.chart,
      props.compData?.chart ?? [],
    );

    series.forEach((s: any) => {
      if (props.isArea) {
        s.areaStyle = {};
        s.stack = 'Total';
      } else {
        s.areaStyle = null;
      }
      (window as any).__seriesColorMap[chartUuid.current][s.name] =
        s.itemStyle?.color ?? '#999';
      const datasetId = s.datasetId || 'current';
      const ds = datasets.find((d) => d.id === datasetId);
      if (!ds) return;
      const yDim = s.encode.y;
      const yDimIndex = ds.dimensions.indexOf(yDim);
      if (yDimIndex < 0) return;

      (window as any).__seriesValueMap[chartUuid.current][s.name] = {};
      ds.source.forEach((row: any[]) => {
        const rowIdx = row[0];
        (window as any).__seriesValueMap[chartUuid.current][s.name][rowIdx] =
          row[yDimIndex];
      });
    });

    chart.setOption({
      ...defaultOptions,
      title: {
        text: props.chartName ?? 'Line Chart',
        show: false,
      },
      legend: {
        ...defaultOptions.legend,
        // Only show legend for “current” series
        data: series
          .filter((s: any) => !s._hideInLegend)
          .map((s: any) => s.name),
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: categories,
      },
      yAxis: {
        name: props.label ?? 'Number of Sessions',
        // nameLocation: 'center',
        // nameGap: 40,
        nameTextStyle: {
          padding: [0, 0, 0, 15],
        },
        minInterval: 1,
      },
      tooltip: {
        ...defaultOptions.tooltip,
        formatter: customTooltipFormatter(chartUuid.current),
      },
      toolbox: {
        feature: {
          saveAsImage: { show: false },
        },
      },
      dataset: datasets,
      series,
    });
    chart.on('click', (event) => {
      const index = event.dataIndex;
      const timestamp = (window as any).__timestampMap?.[chartUuid.current]?.[
        index
      ];
      props.onClick?.({ activePayload: [{ payload: { timestamp } }] });
      setTimeout(() => {
        props.onSeriesFocus?.(event.seriesName);
      }, 0);
    });

    return () => {
      chart.dispose();
      obs.disconnect();
      delete (window as any).__seriesValueMap[chartUuid.current];
      delete (window as any).__seriesColorMap[chartUuid.current];
      delete (window as any).__categoryMap[chartUuid.current];
      delete (window as any).__timestampMap[chartUuid.current];
      delete (window as any).__timestampCompMap[chartUuid.current];
    };
  }, [props.data, props.compData]);

  return <div ref={chartRef} style={{ width: '100%', height: 240 }} />;
}

export default ORLineChart;
