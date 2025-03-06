import React, { useEffect, useRef } from 'react';
import { PieChart as EchartsPieChart } from 'echarts/charts';
import { echarts, defaultOptions } from './init';
import {
  buildPieData,
  pieTooltipFormatter,
  pickColorByIndex,
} from './pieUtils';

echarts.use([EchartsPieChart]);

interface DataItem {
  time: string;
  timestamp: number;
  [seriesName: string]: number | string;
}

interface PieChartProps {
  data: {
    chart: DataItem[];
    namesMap: string[];
  };
  label?: string;
  inGrid?: boolean;
  onSeriesFocus?: (seriesName: string) => void;
}

function PieChart(props: PieChartProps) {
  const { data, label, onClick = () => {}, inGrid = false } = props;
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!data.chart || data.chart.length === 0) {
      chartRef.current.innerHTML =
        '<div style="text-align:center;padding:20px;">No data available</div>';
      return;
    }

    const chartInstance = echarts.init(chartRef.current);

    const pieData = buildPieData(data.chart, data.namesMap);
    if (!pieData.length) {
      chartRef.current.innerHTML =
        '<div style="text-align:center;padding:20px;">No data available</div>';
      return;
    }

    // const largestSlice = pieData.reduce((acc, curr) =>
    //   curr.value > acc.value ? curr : acc
    // );
    // const largestVal = largestSlice.value || 1; // avoid divide-by-zero

    const option = {
      ...defaultOptions,
      tooltip: {
        ...defaultOptions.tooltip,
        trigger: 'item',
        formatter: pieTooltipFormatter,
      },
      grid: {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10,
      },
      toolbox: {
        feature: {
          saveAsImage: { show: false },
        },
      },
      legend: {
        ...defaultOptions.legend,
        type: 'plain',
        show: true,
        top: inGrid ? undefined : 0,
      },
      series: [
        {
          type: 'pie',
          name: label ?? 'Data',
          radius: [50, 100],
          center: ['50%', '55%'],
          data: pieData.map((d, idx) => ({
            name: d.name,
            value: d.value,
            label: {
              show: false, // d.value / largestVal >= 0.03,
              position: 'outside',
              formatter: (params: any) => params.value,
            },
            labelLine: {
              show: false, // d.value / largestVal >= 0.03,
              length: 10,
              length2: 20,
              lineStyle: { color: '#3EAAAF' },
            },
            itemStyle: {
              color: pickColorByIndex(idx),
            },
          })),
          emphasis: {
            scale: true,
            scaleSize: 4,
          },
        },
      ],
    };

    chartInstance.setOption(option);
    const obs = new ResizeObserver(() => chartInstance.resize());
    obs.observe(chartRef.current);

    chartInstance.on('click', (params) => {
      const focusedSeriesName = params.name;
      props.onSeriesFocus?.(focusedSeriesName);
    });

    return () => {
      chartInstance.dispose();
      obs.disconnect();
    };
  }, [data, label, onClick, inGrid]);

  return (
    <div
      style={{ width: '100%', height: 240, position: 'relative' }}
      ref={chartRef}
    />
  );
}

export default PieChart;
