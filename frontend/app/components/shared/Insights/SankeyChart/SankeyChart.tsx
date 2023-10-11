import React, { useEffect } from 'react';
import { Sankey, ResponsiveContainer } from 'recharts';
import CustomLink from './CustomLink';
import CustomNode from './CustomNode';
import { NoContent } from 'UI';

interface Node {
  name: string;
  eventType: string;
}

interface Link {
  eventType: string;
  value: number;
  avgTimeFromPervious: number | null;
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
}


function SankeyChart(props: Props) {
  const { data, nodeWidth = 10 } = props;
  const [activeLink, setActiveLink] = React.useState<any>(null);

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
      <ResponsiveContainer height={500} width='100%'>
        <Sankey
          data={data}
          node={<CustomNode />}
          // nodePadding={10}
          nodeWidth={nodeWidth}
          sort={false}
          // linkCurvature={0.5}
          // iterations={128}
          margin={{
            left: 0,
            right: 200,
            top: 40,
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
          {/* <Tooltip content={<CustomTooltip />} /> */}
        </Sankey>
      </ResponsiveContainer>
    </NoContent>
  );
}

export default SankeyChart;
