import React from 'react';
import { SunburstChart } from 'echarts/charts';
import { echarts, defaultOptions } from '../init';
import type { Data } from '../SankeyChart';
import DroppedSessionsList from './DroppedSessions';
import { convertSankeyToSunburst, sunburstTooltip } from './sunburstUtils';

echarts.use([SunburstChart]);

interface Props {
  data: Data;
  height?: number;
}

const EChartsSunburst = (props: Props) => {
  const { data, height = 240 } = props;
  const chartRef = React.useRef<HTMLDListElement>(null);
  const [colors, setColors] = React.useState<Map<string, string>>(new Map());

  React.useEffect(() => {
    if (!chartRef.current || data.nodes.length === 0 || data.links.length === 0)
      return;

    const chart = echarts.init(chartRef.current);
    const { tree, colors } = convertSankeyToSunburst(data);
    const singleRoot =
      data.nodes.reduce((acc, node) => {
        if (node.depth === 0) {
          acc++;
        }
        return acc;
      }, 0) === 1;
    const options = {
      ...defaultOptions,
      series: {
        type: 'sunburst',
        data: singleRoot ? tree.children : [tree],
        radius: [30, '90%'],
        itemStyle: {
          borderRadius: 6,
          borderWidth: 2,
        },
        center: ['50%', '50%'],
        clockwise: true,
        label: {
          show: false,
        },
        tooltip: {
          formatter: sunburstTooltip(colors),
        },
      },
    };
    chart.setOption(options);
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(chartRef.current);
    setColors(colors);
    return () => {
      chart.dispose();
      ro.disconnect();
    };
  }, [data, height]);

  const containerStyle = {
    width: '100%',
    height,
    flex: 1,
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
      }}
    >
      <div
        ref={chartRef}
        style={containerStyle}
        className="min-w-[600px] relative"
      />
      <DroppedSessionsList colorMap={colors} data={data} />
    </div>
  );
};

export default EChartsSunburst;
