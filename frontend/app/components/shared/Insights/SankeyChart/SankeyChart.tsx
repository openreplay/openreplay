import React, { useState } from 'react';
import { Sankey, ResponsiveContainer } from 'recharts';
import { NoContent, Icon } from 'UI';
import CustomLink from './CustomLink';
import CustomNode from './CustomNode';
import { useTranslation } from 'react-i18next';

interface Node {
  idd: string;
  name: string;
  eventType: string;
  avgTimeFromPrevious: number | null;
}

interface Link {
  id: string;
  eventType: string;
  value: number;
  source: string;
  target: string;
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
  onChartClick,
}: Props) => {
  const { t } = useTranslation();
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
    const link: any = data.links.find((link) => link.id === payload.id);
    const previousLinks: any = findPreviousLinks(link.source).reverse();
    previousLinks.push({ id: payload.id });
    setHoveredLinks(previousLinks.map((link: any) => link.id));
  };

  const clickHandler = () => {
    setHighlightedLinks(hoveredLinks);

    const firstLink =
      data.links.find((link) => link.id === hoveredLinks[0]) || null;
    const lastLink =
      data.links.find(
        (link) => link.id === hoveredLinks[hoveredLinks.length - 1],
      ) || null;

    const firstNode = data.nodes[firstLink?.source];
    const lastNode = data.nodes[lastLink?.target];

    const filters = [];

    if (firstNode) {
      filters.push({
        operator: 'is',
        type: firstNode.eventType,
        value: [firstNode.name],
        isEvent: true,
      });
    }

    if (lastNode) {
      filters.push({
        operator: 'is',
        type: lastNode.eventType,
        value: [lastNode.name],
        isEvent: true,
      });
    }

    onChartClick?.(filters);
  };

  // const processedData = processData(data);

  return (
    <NoContent
      style={{ paddingTop: '80px' }}
      show={!data.nodes.length || !data.links.length}
      title={
        <div className="flex items-center">
          <Icon name="info-circle" className="mr-2" size="14" />
          {t('No data available for the selected period.')}
        </div>
      }
    >
      <ResponsiveContainer height={height} width="100%">
        <Sankey
          data={data}
          node={<CustomNode />}
          nodePadding={20}
          sort
          nodeWidth={4}
          // linkCurvature={0.9}
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
          margin={{ right: 130, bottom: 50 }}
        >
          <defs>
            <linearGradient id="linkGradient">
              <stop offset="0%" stopColor="rgba(57, 78, 255, 0.2)" />
              <stop offset="100%" stopColor="rgba(57, 78, 255, 0.2)" />
            </linearGradient>
          </defs>
        </Sankey>
      </ResponsiveContainer>
    </NoContent>
  );
};

export default SankeyChart;
