import React, { useEffect } from 'react';
import { Sankey, ResponsiveContainer } from 'recharts';
import CustomLink from './CustomLink';
import CustomNode from './CustomNode';
import { NoContent } from 'UI';

interface Node {
  name: string;
  eventType: string;
  avgTimeFromPrevious: number | null;
}

interface Link {
  eventType: string;
  value: number;
  source: number;
  target: number;
}

interface Data {
  nodes: Node[];
  links: Link[];
}

interface Props {
  data: Data;
  nodePadding?: number;
  nodeWidth?: number;
  onChartClick?: (data: any) => void;
  height?: number;
}


function SankeyChart(props: Props) {
  const { data, nodeWidth = 10, height = 240 } = props;
  const [activeLink, setActiveLink] = React.useState<any>(null);

  data.nodes = data.nodes.map((node: any) => {
    return {
      ...node,
      avgTimeFromPrevious: 200
    };
  });

  useEffect(() => {
    if (!activeLink) return;
    const { source, target } = activeLink.payload;
    const filters = [];
    if (source) {
      filters.push({
        operator: 'is',
        type: source.eventType,
        value: [source.name],
        isEvent: true
      });
    }

    if (target) {
      filters.push({
        operator: 'is',
        type: target.eventType,
        value: [target.name],
        isEvent: true
      });
    }

    props.onChartClick?.(filters);
  }, [activeLink]);

  return (
    <NoContent show={!(data && data.nodes && data.nodes.length && data.links)}>
      <ResponsiveContainer height={height} width='100%'>
        <Sankey
          data={data}
          node={<CustomNode />}
          nodeWidth={nodeWidth}
          sort={false}
          // linkCurvature={0.5}
          // iterations={128}
          margin={{
            left: 0,
            right: 200,
            top: 0,
            bottom: 10
          }}
          link={<CustomLink onClick={(props: any) => setActiveLink(props)} activeLink={activeLink} />}
        >
          <defs>
            <linearGradient id={'linkGradient'}>
              <stop offset='0%' stopColor='rgba(57, 78, 255, 0.2)' />
              <stop offset='100%' stopColor='rgba(57, 78, 255, 0.2)' />
            </linearGradient>
          </defs>
        </Sankey>
      </ResponsiveContainer>
    </NoContent>
  );
}

export default SankeyChart;
