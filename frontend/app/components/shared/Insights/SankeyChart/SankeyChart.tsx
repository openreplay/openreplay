import React, { useState } from 'react';
import { Sankey, ResponsiveContainer } from 'recharts';
import CustomLink from './CustomLink';
import CustomNode from './CustomNode';
import { NoContent } from 'UI';

interface Node {
  id: number;  // Assuming you missed this from your interface
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
  nodeWidth?: number;
  height?: number;
  onChartClick?: (filters: any[]) => void;
}

const SankeyChart: React.FC<Props> = ({
                                        data,
                                        height = 240,
                                        onChartClick
                                      }: Props) => {
  const [highlightedLinks, setHighlightedLinks] = useState<number[]>([]);
  const [hoveredLinks, setHoveredLinks] = useState<number[]>([]);

  function buildReversedAdjacencyList(nodes, links) {
    const adjList = Array(nodes.length).fill(null).map(() => []);

    for (const link of links) {
      adjList[link.target].push(link.source);
    }

    return adjList;
  }

  function dfs(adjList, start, target, visited, path) {
    if (start === target) return [...path, start];

    if (visited[start]) return null;

    visited[start] = true;

    for (const neighbor of adjList[start]) {
      const newPath = dfs(adjList, neighbor, target, visited, [...path, start]);
      if (newPath) return newPath;
    }

    return null;
  }

  function findPathFromLinkId(linkId) {
    const startNodeIndex = data.links.findIndex(link => link.id === linkId);

    if (startNodeIndex === -1) {
      return null;
    }

    const adjList = buildReversedAdjacencyList(data.nodes, data.links);
    const visited = Array(data.nodes.length).fill(false);
    return dfs(adjList, startNodeIndex, 0, visited, []);
  }

  const handleLinkMouseEnter = (linkData: any) => {
    const { payload } = linkData;

    const pathFromLinkId = findPathFromLinkId(payload.id);
    setHoveredLinks(pathFromLinkId.reverse());


  };

  const clickHandler = () => {
    setHighlightedLinks(hoveredLinks);

    const targetLink = data.links[hoveredLinks[0]];
    const sourceLink = data.links[hoveredLinks[hoveredLinks.length - 1]];
    const targetNode = data.nodes[targetLink.source];
    const sourceNode = data.nodes[sourceLink.target];

    const filters = [];
    if (sourceNode) {
      filters.push({
        operator: 'is',
        type: sourceNode.eventType,
        value: [sourceNode.name],
        isEvent: true
      });
    }

    if (targetNode) {
      filters.push({
        operator: 'is',
        type: targetNode.eventType,
        value: [targetNode.name],
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
          node={<CustomNode activeNodes={highlightedLinks.map(index => data.nodes[data.links[index].target])} />}
          sort={true}
          onClick={clickHandler}
          link={({ source, target, ...linkProps }, index) => (
            <CustomLink
              {...linkProps}
              hoveredLinks={hoveredLinks.map(linkId => data.links[linkId].id)}
              activeLinks={highlightedLinks.map(linkId => data.links[linkId].id)}
              strokeOpacity={highlightedLinks.includes(index) ? 1 : 0.2}
              onMouseEnter={() => handleLinkMouseEnter(linkProps)}
              onMouseLeave={() => setHoveredLinks([])}
            />
          )}
          margin={{ right: 200 }}
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
