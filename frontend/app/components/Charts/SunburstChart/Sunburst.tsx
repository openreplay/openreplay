import React from 'react';
import { SunburstChart } from 'echarts/charts';
import { echarts, defaultOptions } from '../init';
import DroppedSessionsList from './DroppedSessions';
import {
  convertSankeyToSunburst,
  sunburstTooltip,
  grayOutTree,
  applyColorMap,
} from './sunburstUtils';

echarts.use([SunburstChart]);

interface Props {
  data: Record<string, any>;
  height?: number;
  inGrid?: boolean;
}

const EChartsSunburst = (props: Props) => {
  const { data, height = 240, inGrid } = props;
  const chartRef = React.useRef<HTMLDListElement>(null);
  const [chartColors, setColors] = React.useState<Map<string, string>>(
    new Map(),
  );
  const [chartInst, setChartInst] = React.useState<echarts.ECharts | null>(
    null,
  );
  const [dropsByUrl, setDropsByUrl] = React.useState<any>(null);
  const [chartData, setChartData] = React.useState<Record<string, any>>(null);
  const [legend, setLegend] = React.useState<Record<string, any>>({});

  React.useEffect(() => {
    if (!chartRef.current || !Array.isArray(data) || data.length === 0) return;
    const { tree, colors, dropsByUrl, legendMap } = convertSankeyToSunburst(
      data[0],
    );

    const options = {
      ...defaultOptions,
      yAxis: undefined,
      series: {
        type: 'sunburst',
        data: [tree],
        sort: 'desc',
        radius: [inGrid ? 10 : 90, '80%'],
        itemStyle: {
          borderRadius: 6,
          borderWidth: 3,
          borderColor: 'var(--color-white)',
        },
        center: [inGrid ? '25%' : '50%', '50%'],
        clockwise: true,
        label: {
          show: false,
        },
        tooltip: {
          formatter: sunburstTooltip(colors),
        },
      },
    };
    setColors(colors);
    setDropsByUrl(dropsByUrl);
    setChartData(options);
    setLegend(legendMap);

    return () => {
      setDropsByUrl(null);
    };
  }, [data, height]);

  React.useEffect(() => {
    if (!chartRef.current || !chartData) return;
    const chart = echarts.init(chartRef.current);
    chart.setOption(chartData);
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(chartRef.current);
    setChartInst(chart);

    return () => {
      chart.dispose();
      ro.disconnect();
      setChartInst(null);
    };
  }, [chartData]);

  const onHover = (dataIndex: any[]) => {
    // traverse tree and change colors to highlight node
    if (!chartInst || !dataIndex || dataIndex.length === 0) return;
    const grayedTree = grayOutTree(chartData.series.data[0], dataIndex);
    chartInst.setOption({
      ...chartData,
      series: {
        ...chartData.series,
        data: [grayedTree],
      },
    });
    chartInst?.resize();
  };

  const onLeave = () => {
    const coloredTree = applyColorMap(chartData.series.data[0], chartColors);
    chartInst?.setOption({
      ...chartData,
      series: {
        ...chartData.series,
        data: [coloredTree],
      },
    });
    chartInst?.resize();
  };

  return (
    <div
      style={{
        maxHeight: 620,
        overflow: 'auto',
        maxWidth: 1240,
        minHeight: 240,
        display: 'flex',
        gap: '0.5rem',
        margin: '0 auto',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <div
        ref={chartRef}
        style={{ height, flex: 1 }}
        className="w-full relative"
      />
      <DroppedSessionsList
        dropsByUrl={dropsByUrl}
        onHover={onHover}
        onLeave={onLeave}
        colorMap={chartColors}
        legend={legend}
      />
    </div>
  );
};

export default EChartsSunburst;
