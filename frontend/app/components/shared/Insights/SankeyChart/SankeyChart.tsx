import { active } from 'App/components/Alerts/alertItem.css';
import React from 'react';
import { Sankey, ResponsiveContainer } from 'recharts';
import CustomLink from './CustomLink';
import CustomNode from './CustomNode';

type Node = {
  name: string;
};

type Link = {
  source: number;
  target: number;
  value: number;
};

export interface SankeyChartData {
  links: Link[];
  nodes: Node[];
}
interface Props {
  data: SankeyChartData;
  nodePadding?: number;
  nodeWidth?: number;
}
function SankeyChart(props: Props) {
  const { data, nodePadding = 50, nodeWidth = 10 } = props;
  const [activeLink, setActiveLink] = React.useState<any>(null);

  return (data && data.nodes.length && data.links) ? (
    <ResponsiveContainer height={400} width="100%">
      <Sankey
        width={960}
        height={400}
        data={data}
        // node={{ stroke: '#77c878', strokeWidth: 0 }}
        node={<CustomNode />}
        nodePadding={nodePadding}
        nodeWidth={nodeWidth}
        linkCurvature={0.5}
        margin={{
          left: 0,
          right: 200,
          top: 40,
          bottom: 10,
        }}
        link={<CustomLink onClick={(props: any) => setActiveLink(props)} activeLink={activeLink} />}
      >
        <defs>
          <linearGradient id={'linkGradient'}>
            <stop offset="0%" stopColor="rgba(57, 78, 255, 0.2)" />
            <stop offset="100%" stopColor="rgba(57, 78, 255, 0.2)" />
          </linearGradient>
        </defs>
        {/* <Tooltip content={<CustomTooltip />} /> */}
      </Sankey>
    </ResponsiveContainer>
  ) : null;
}

export default SankeyChart;
