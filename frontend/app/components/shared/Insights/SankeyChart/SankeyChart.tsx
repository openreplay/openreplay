import React, { useState } from 'react';
import { Sankey, ResponsiveContainer } from 'recharts';
import CustomLink from './CustomLink';
import CustomNode from './CustomNode';
import { NoContent } from 'UI';

interface Node {
  idd: number;
  name: string;
  eventType: string;
  avgTimeFromPrevious: number | null;
}

interface Link {
  id: string;
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
  nodeWidth?: number;
  height?: number;
  onChartClick?: (filters: any[]) => void;
}

const SankeyChart: React.FC<Props> = ({
                                        data,
                                        height = 240,
                                        onChartClick
                                      }: Props) => {
  const [highlightedLinks, setHighlightedLinks] = useState<string[]>([]);
  const [hoveredLinks, setHoveredLinks] = useState<string[]>([]);

  function findPreviousLinks(targetNodeIndex: number): Link[] {
    const previousLinks: Link[] = [];
    const visitedNodes: Set<number> = new Set();

    const findPreviousLinksRecursive = (nodeIndex: number) => {
      visitedNodes.add(nodeIndex);

      for (const link of data.links) {
        if (link.target === nodeIndex && !visitedNodes.has(link.source)) {
          previousLinks.push(link);
          findPreviousLinksRecursive(link.source);
        }
      }
    };

    findPreviousLinksRecursive(targetNodeIndex);

    return previousLinks;
  }

  const handleLinkMouseEnter = (linkData: any) => {
    const { payload } = linkData;
    const link: any = data.links.find(link => link.id === payload.id);
    const previousLinks: any = findPreviousLinks(link.source).reverse();
    previousLinks.push({ id: payload.id });
    setHoveredLinks(previousLinks.map((link: any) => link.id));
  };

  const clickHandler = () => {
    setHighlightedLinks(hoveredLinks);

    const firstLink = data.links.find(link => link.id === hoveredLinks[0]) || null;
    const lastLink = data.links.find(link => link.id === hoveredLinks[hoveredLinks.length - 1]) || null;

    const firstNode = data.nodes[firstLink?.source];
    const lastNode = data.nodes[lastLink.target];

    const filters = [];

    if (firstNode) {
      filters.push({
        operator: 'is',
        type: firstNode.eventType,
        value: [firstNode.name],
        isEvent: true
      });
    }

    if (lastNode) {
      filters.push({
        operator: 'is',
        type: lastNode.eventType,
        value: [lastNode.name],
        isEvent: true
      });
    }

    onChartClick?.(filters);
  };


  return (
    <NoContent
      style={{ paddingTop: '80px' }}
      show={!data.nodes.length || !data.links.length}
      title={'No data for the selected time period.'}
    >
      <ResponsiveContainer height={height} width='100%'>
        <Sankey
          data={data}
          iterations={128}
          node={<CustomNode />}
          sort={true}
          onClick={clickHandler}
          link={({ source, target, id, ...linkProps }, index) => (
            <CustomLink
              {...linkProps}
              hoveredLinks={hoveredLinks}
              activeLinks={highlightedLinks}
              strokeOpacity={highlightedLinks.includes(id) ? 0.8 : 0.2}
              onMouseEnter={() => handleLinkMouseEnter(linkProps)}
              onMouseLeave={() => setHoveredLinks([])}
            />
          )}
          margin={{ right: 200, bottom: 50 }}
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
};

export default SankeyChart;
