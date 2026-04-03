import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import {
  LineChart,
  BarChart,
  PieChart,
} from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
  SVGRenderer,
]);

interface ChartViewProps {
  data: any;
}

interface ChartData {
  chart: Array<{
    time: string;
    timestamp: number;
    [key: string]: number | string;
  }>;
  namesMap: string[];
}

// OpenReplay color palette
const colors = [
  '#394EFF',
  '#3EAAAF',
  '#9276da',
  '#ceba64',
  '#bc6f9d',
  '#966fbc',
  '#64ce86',
  '#e06da3',
  '#6dabe0',
  '#6D7DFF',
  '#6AD7D3',
  '#B9A4F3',
  '#E7D890',
  '#DFA0B9',
  '#B896D6',
  '#8FE5A9',
  '#F19DC2',
  '#9DC6F0',
];

function ChartView({ data }: ChartViewProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !data) return;

    const chart = echarts.init(chartRef.current);
    const obs = new ResizeObserver(() => chart.resize());
    obs.observe(chartRef.current);

    try {
      const chartData = detectChartData(data);

      if (!chartData) {
        console.error('Unable to parse chart data:', data);
        return;
      }

      const options = buildChartOptions(chartData);
      chart.setOption(options);
    } catch (error) {
      console.error('Failed to render chart:', error);
    }

    return () => {
      chart.dispose();
      obs.disconnect();
    };
  }, [data]);

  return (
    <div>
      <div className="view-header">
        <span className="view-title">
          {data?.title || 'Chart Data'}
          {data?.startDate && data?.endDate && (
            <span className="view-title-date">{data.startDate} — {data.endDate}</span>
          )}
        </span>
      </div>

      <div className="chart-container">
        <div ref={chartRef} style={{ width: '100%', height: 400 }} />
      </div>

      <details className="view-debug">
        <summary>Raw Data</summary>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  );
}

function detectChartData(data: any): ChartData | null {
  if (data.chart && Array.isArray(data.chart)) {
    return {
      chart: data.chart,
      namesMap: data.namesMap || extractSeriesNames(data.chart),
    };
  }

  if (Array.isArray(data) && data.length > 0) {
    return {
      chart: data,
      namesMap: extractSeriesNames(data),
    };
  }

  if (data.data?.chart) {
    return {
      chart: data.data.chart,
      namesMap: data.data.namesMap || extractSeriesNames(data.data.chart),
    };
  }

  // New API series format: { data: { series: { name: { ts: val } } } } or top-level
  const seriesObj = data.data?.series || data.series;
  if (seriesObj && typeof seriesObj === 'object' && !Array.isArray(seriesObj)) {
    const seriesKeys = Object.keys(seriesObj);
    const tsSet = new Set<string>();

    for (const key of seriesKeys) {
      const content = seriesObj[key];
      if (content && typeof content === 'object') {
        for (const ts of Object.keys(content)) {
          if (ts !== '$overall') tsSet.add(ts);
        }
      }
    }

    const timestamps = Array.from(tsSet).sort((a, b) => Number(a) - Number(b));
    const chart = timestamps.map(ts => {
      const point: any = { timestamp: Number(ts), time: '' };
      for (const key of seriesKeys) {
        point[key] = seriesObj[key]?.[ts] ?? 0;
      }
      return point;
    });

    return {
      chart,
      namesMap: seriesKeys,
    };
  }

  return null;
}

function extractSeriesNames(chart: any[]): string[] {
  if (chart.length === 0) return [];

  const firstItem = chart[0];
  const keys = Object.keys(firstItem).filter(
    (key) => key !== 'time' && key !== 'timestamp'
  );

  return keys;
}

function buildChartOptions(chartData: ChartData): any {
  const categories = chartData.chart.map((item) => item.time);

  const dimensions = ['idx', ...chartData.namesMap];
  const source = chartData.chart.map((item, idx) => {
    const row: (number | undefined)[] = [idx];
    chartData.namesMap.forEach((name) => {
      const val =
        typeof item[name] === 'number' ? (item[name] as number) : undefined;
      row.push(val);
    });
    return row;
  });

  const series = chartData.namesMap.map((name, idx) => ({
    name,
    type: 'line',
    datasetId: 'main',
    encode: { x: 'idx', y: name },
    itemStyle: {
      color: colors[idx % colors.length],
    },
    lineStyle: {
      color: colors[idx % colors.length],
    },
    showSymbol: chartData.chart.length === 1,
    smooth: true,
  }));

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    legend: {
      type: 'plain',
      show: true,
      top: 0,
      data: chartData.namesMap,
    },
    grid: {
      left: '3%',
      right: '5%',
      bottom: '5%',
      top: '13%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: categories,
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
    },
    dataset: {
      id: 'main',
      dimensions,
      source,
    },
    series,
  };
}

export default ChartView;
