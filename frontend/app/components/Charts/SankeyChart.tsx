// START GEN
import React from 'react';
import { echarts, defaultOptions } from './init';
import { SankeyChart } from 'echarts/charts';
import { sankeyTooltip, getEventPriority, getNodeName } from './sankeyUtils'
echarts.use([SankeyChart]);

interface SankeyNode {
  name: string | null; // e.g. "/en/deployment/", or null
  eventType?: string; // e.g. "LOCATION" (not strictly needed by ECharts)
}

interface SankeyLink {
  source: number; // index of source node
  target: number; // index of target node
  value: number; // percentage
  sessionsCount: number;
  eventType?: string; // optional
}

interface Data {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface Props {
  data: Data;
  height?: number;
  onChartClick?: (filters: any[]) => void;
}

// Not working properly
function findHighestContributors(nodeIndex: number, links: SankeyLink[]) {
  const contributors: SankeyLink[] = [];
  let currentNode = nodeIndex;

  while (true) {
    let maxContribution = -Infinity;
    let primaryLink: SankeyLink | null = null;

    for (const link of links) {
      if (link.target === currentNode) {
        if (link.value > maxContribution) {
          maxContribution = link.value;
          primaryLink = link;
        }
      }
    }

    if (primaryLink) {
      contributors.push(primaryLink);
      currentNode = primaryLink.source;
    } else {
      break;
    }
  }

  return contributors;
}

const EChartsSankey: React.FC<Props> = (props) => {
  const { data, height = 240, onChartClick } = props;
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    const nodeValues = new Array(data.nodes.length).fill(0);
    const echartNodes = data.nodes
      .map((n, i) => ({
        name: getNodeName(n.eventType || 'Other', n.name),
        depth: n.depth,
        type: n.eventType,
        id: n.id,
      }))
      .sort((a, b) => {
        if (a.depth === b.depth) {
          return getEventPriority(a.type || '') - getEventPriority(b.type || '')
        } else {
          return a.depth - b.depth;
        }
      });
    const echartLinks = data.links.map((l, i) => ({
      source: echartNodes.findIndex((n) => n.id === l.source),
      target: echartNodes.findIndex((n) => n.id === l.target),
      value: l.sessionsCount,
      percentage: l.value,
    }));
    nodeValues.forEach((v, i) => {
      const outgoingValues = echartLinks
        .filter((l) => l.source === i)
        .reduce((p, c) => p + c.value, 0);
      const incomingValues = echartLinks
        .filter((l) => l.target === i)
        .reduce((p, c) => p + c.value, 0);
      nodeValues[i] = Math.max(outgoingValues, incomingValues);
    })

    const option = {
      ...defaultOptions,
      tooltip: {
        trigger: 'item',
      },
      series: [
        {
          layoutIterations: 0,
          type: 'sankey',
          data: echartNodes,
          links: echartLinks,
          emphasis: {
            focus: 'adjacency',
            blurScope: 'global',
          },
          label: {
            formatter: '{b} - {c}'
          },
          tooltip: {
            formatter: sankeyTooltip(echartNodes, nodeValues)
          },
          nodeAlign: 'right',
          nodeWidth: 10,
          nodeGap: 8,
          lineStyle: {
            color: 'source',
            curveness: 0.5,
            opacity: 0.3,
          },
          itemStyle: {
            color: '#394eff',
            borderRadius: 4,
          },
        },
      ],
    };

    chart.setOption(option);

    const seriesIndex = 0;
    function highlightNode(nodeIdx: number) {
      chart.dispatchAction({
        type: 'highlight',
        seriesIndex,
        dataType: 'node',
        dataIndex: nodeIdx,
      });
    }
    function highlightLink(linkIdx: number) {
      chart.dispatchAction({
        type: 'highlight',
        seriesIndex,
        dataType: 'edge',
        dataIndex: linkIdx,
      });
    }
    function resetHighlight() {
      chart.dispatchAction({
        type: 'downplay',
        seriesIndex,
      });
    }

    chart.on('click', function (params) {
      if (!onChartClick) return;

      if (params.dataType === 'node') {
        const nodeIndex = params.dataIndex;
        const node = data.nodes[nodeIndex];
        onChartClick([{ node }]);
      } else if (params.dataType === 'edge') {
        const linkIndex = params.dataIndex;
        const link = data.links[linkIndex];
        onChartClick([{ link }]);
      }
    });

    // chart.on('mouseover', function (params) {
    //   if (params.seriesIndex !== seriesIndex) return; // ignore if not sankey
    //   resetHighlight(); // dim everything first
    //
    //   if (params.dataType === 'node') {
    //     const hoveredNodeIndex = params.dataIndex;
    //     // find outgoing links
    //     const outgoingLinks: number[] = [];
    //     data.links.forEach((link, linkIdx) => {
    //       if (link.source === hoveredNodeIndex) {
    //         outgoingLinks.push(linkIdx);
    //       }
    //     });
    //
    //     // find incoming highest contributors
    //     const highestContribLinks = findHighestContributors(hoveredNodeIndex, data.links);
    //
    //     // highlight outgoing links
    //     outgoingLinks.forEach((linkIdx) => highlightLink(linkIdx));
    //     // highlight the "highest path" of incoming links
    //     highestContribLinks.forEach((lk) => {
    //       // We need to find which link index in data.links => lk
    //       const linkIndex = data.links.indexOf(lk);
    //       if (linkIndex >= 0) {
    //         highlightLink(linkIndex);
    //       }
    //     });
    //
    //     // highlight the node itself
    //     highlightNode(hoveredNodeIndex);
    //
    //     // highlight the nodes that are "source/target" of the highlighted links
    //     const highlightNodeSet = new Set<number>();
    //     outgoingLinks.forEach((lIdx) => {
    //       highlightNodeSet.add(data.links[lIdx].target);
    //       highlightNodeSet.add(data.links[lIdx].source);
    //     });
    //     highestContribLinks.forEach((lk) => {
    //       highlightNodeSet.add(lk.source);
    //       highlightNodeSet.add(lk.target);
    //     });
    //     // also add the hovered node
    //     highlightNodeSet.add(hoveredNodeIndex);
    //
    //     // highlight those nodes
    //     highlightNodeSet.forEach((nIdx) => highlightNode(nIdx));
    //
    //   } else if (params.dataType === 'edge') {
    //     const hoveredLinkIndex = params.dataIndex;
    //     // highlight just that edge
    //     highlightLink(hoveredLinkIndex);
    //
    //     // highlight source & target node
    //     const link = data.links[hoveredLinkIndex];
    //     highlightNode(link.source);
    //     highlightNode(link.target);
    //   }
    // });
    //
    // chart.on('mouseout', function () {
    //   // revert to normal
    //   resetHighlight();
    // });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(chartRef.current);

    return () => {
      chart.dispose();
      ro.disconnect();
    };
  }, [data, height, onChartClick]);

  return <div ref={chartRef} style={{ width: '100%', height }} />;
};

export default EChartsSankey;
