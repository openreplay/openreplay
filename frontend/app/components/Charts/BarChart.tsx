import React from 'react';
import { BarChart } from 'echarts/charts';
import { DataProps, buildCategories, customTooltipFormatter } from './utils';
import { buildBarDatasetsAndSeries } from './barUtils';
import { defaultOptions, echarts, initWindowStorages } from './init';

echarts.use([BarChart]);

interface BarChartProps extends DataProps {
  label?: string;
  onClick?: (event: any) => void;
  onSeriesFocus?: (event: any) => void;
}

function ORBarChart(props: BarChartProps) {
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
    const { datasets, series } = buildBarDatasetsAndSeries(props);

    initWindowStorages(
      chartUuid.current,
      categories,
      props.data.chart,
      props.compData?.chart ?? [],
    );
    series.forEach((s: any) => {
      (window as any).__seriesColorMap[chartUuid.current][s.name] =
        s.itemStyle?.color ?? '#999';
      const ds = datasets.find((d) => d.id === s.datasetId);
      if (!ds) return;
      const yDim = s.encode.y;
      const yDimIndex = ds.dimensions.indexOf(yDim);
      if (yDimIndex < 0) return;

      (window as any).__seriesValueMap[chartUuid.current][s.name] = {};
      ds.source.forEach((row: any[]) => {
        const rowIdx = row[0]; // 'idx'
        (window as any).__seriesValueMap[chartUuid.current][s.name][rowIdx] =
          row[yDimIndex];
      });
    });

    const xAxis: any = {
      type: 'category',
      data: categories,
    };
    const yAxis: any = {
      type: 'value',
      data: undefined,
      name: props.label ?? 'Number of Sessions',
      nameLocation: 'center',
      nameGap: 45,
    };

    chart.setOption({
      ...defaultOptions,
      legend: {
        ...defaultOptions.legend,
        data: series
          .filter((s: any) => !s._hideInLegend)
          .map((s: any) => s.name),
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
      xAxis,
      yAxis,
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

export default ORBarChart;
