import { SankeyChart } from 'echarts/charts';
import React from 'react';

import { echarts } from 'Components/Charts/init';

import ExCard from './ExCard';

echarts.use([SankeyChart]);

/* Static preview for the "user path" card in the new-dashboard modal. */
const NODES = ['Home', 'Google', 'Facebook', 'Search', 'Product', 'Chart'];
const LINKS = [
  { source: 'Home', target: 'Search', value: 40 },
  { source: 'Home', target: 'Product', value: 60 },
  { source: 'Google', target: 'Search', value: 100 },
  { source: 'Facebook', target: 'Search', value: 100 },
  { source: 'Search', target: 'Product', value: 50 },
  { source: 'Search', target: 'Chart', value: 50 },
  { source: 'Product', target: 'Chart', value: 15 },
];

function ExamplePath(props: any) {
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    const obs = new ResizeObserver(() => chart.resize());
    obs.observe(chartRef.current);

    chart.setOption({
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { show: false },
      series: [
        {
          type: 'sankey',
          nodeWidth: 6,
          nodeGap: 10,
          layoutIterations: 128,
          left: 8,
          right: 60,
          top: 8,
          bottom: 8,
          data: NODES.map((name) => ({
            name,
            itemStyle: { color: '#394EFF', borderColor: '#394EFF' },
          })),
          links: LINKS,
          label: { fontSize: 11, color: 'var(--color-gray-darkest)' },
          lineStyle: { color: 'rgba(57, 78, 255, 0.2)', curveness: 0.5 },
          emphasis: { disabled: true },
        },
      ],
    });

    return () => {
      chart.dispose();
      obs.disconnect();
    };
  }, []);

  return (
    <ExCard {...props}>
      <div ref={chartRef} style={{ width: '100%', height: 230 }} />
    </ExCard>
  );
}

export default ExamplePath;
