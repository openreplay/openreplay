import React from 'react';
import { echarts, defaultOptions } from './init';
import { SankeyChart } from 'echarts/charts';
import { sankeyTooltip, getEventPriority, getNodeName } from './sankeyUtils';
import { NoContent } from 'App/components/ui';
import { InfoCircleOutlined } from '@ant-design/icons';

echarts.use([SankeyChart]);

interface SankeyNode {
  name: string | null;
  eventType?: string;
  depth?: number;
  id?: string | number;
}

interface SankeyLink {
  source: number | string;
  target: number | string;
  value: number;
  sessionsCount: number;
  eventType?: string;
}

interface Data {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface Props {
  data: Data;
  height?: number;
  onChartClick?: (filters: any[]) => void;
  isUngrouped?: boolean;
  inGrid?: boolean;
}

function buildSubgraph(
  startNodeId: string | number,
  nodes: SankeyNode[],
  links: SankeyLink[]
) {
  const visited = new Set<string | number>();
  const queue = [startNodeId];
  visited.add(startNodeId);

  const adjacency: Record<string | number, Array<string | number>> = {};
  links.forEach((link) => {
    if (!adjacency[link.source]) {
      adjacency[link.source] = [];
    }
    adjacency[link.source].push(link.target);
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency[current] || [];
    neighbors.forEach((nbr) => {
      if (!visited.has(nbr)) {
        visited.add(nbr);
        queue.push(nbr);
      }
    });
  }

  const subNodes = nodes.filter((n) => visited.has(n.id));
  const subLinks = links.filter(
    (l) => visited.has(l.source) && visited.has(l.target)
  );

  return { subNodes, subLinks };
}

const EChartsSankey: React.FC<Props> = (props) => {
  const { data, height = 240, onChartClick, isUngrouped } = props;
  const chartRef = React.useRef<HTMLDivElement>(null);

  if (data.nodes.length === 0 || data.links.length === 0) {
    return (
      <NoContent
        style={{ minHeight: height }}
        title={
          <div className="flex items-center relative">
            <InfoCircleOutlined className="hidden md:inline-block mr-1" />
            Set a start or end point to visualize the journey. If set, try
            adjusting filters.
          </div>
        }
        show={true}
      />
    );
  }

  const [finalNodeCount, setFinalNodeCount] = React.useState(data.nodes.length);

  React.useEffect(() => {
    if (!chartRef.current) return;

    const startNodes = data.nodes.filter((n) => n.depth === 0);
    let finalNodes = data.nodes;
    let finalLinks = data.links;

    if (startNodes.length > 1) {
      const chosenStartNode = startNodes[0];
      const { subNodes, subLinks } = buildSubgraph(
        chosenStartNode.id!,
        data.nodes,
        data.links
      );
      finalNodes = subNodes;
      finalLinks = subLinks;
    }

    const chart = echarts.init(chartRef.current);

    const maxDepth = 4;
    const filteredNodes = finalNodes.filter((n) => (n.depth ?? 0) <= maxDepth);
    const filteredLinks = finalLinks.filter((l) => {
      const sourceNode = finalNodes.find((n) => n.id === l.source);
      const targetNode = finalNodes.find((n) => n.id === l.target);
      return (
        (sourceNode?.depth ?? 0) <= maxDepth &&
        (targetNode?.depth ?? 0) <= maxDepth
      );
    });

    setFinalNodeCount(filteredNodes.length);

    const echartNodes = filteredNodes
      .map((n) => {
        let computedName = getNodeName(n.eventType || 'Minor Paths', n.name);
        if (computedName === 'Other') {
          computedName = 'Others';
        }
        const itemColor =
          computedName === 'Others'
            ? 'rgba(34,44,154,.9)'
            : n.eventType === 'DROP'
            ? '#B5B7C8'
            : '#394eff';

        return {
          name: computedName,
          depth: n.depth,
          type: n.eventType,
          id: n.id,
          draggable: false,
          itemStyle: { color: itemColor },
        };
      })
      .sort((a, b) => {
        if (a.depth === b.depth) {
          return (
            getEventPriority(a.type || '') - getEventPriority(b.type || '')
          );
        } else {
          return (a.depth as number) - (b.depth as number);
        }
      });

    const echartLinks = filteredLinks.map((l) => ({
      source: echartNodes.findIndex((n) => n.id === l.source),
      target: echartNodes.findIndex((n) => n.id === l.target),
      value: l.sessionsCount,
      percentage: l.value,
      lineStyle: { opacity: 0.1 },
    }));

    if (echartNodes.length === 0) return;

    const startNodeValue = echartLinks
      .filter((link) => link.source === 0)
      .reduce((sum, link) => sum + link.value, 0);

    const option = {
      ...defaultOptions,
      tooltip: {
        trigger: 'item',
      },
      toolbox: {
        feature: {
          saveAsImage: { show: false },
        },
      },
      series: [
        {
          animation: false,
          layoutIterations: 0,
          type: 'sankey',
          data: echartNodes,
          links: echartLinks,
          emphasis: {
            focus: 'none',
            lineStyle: {
              opacity: 0.5,
            },
          },
          top: 40,
          label: {
            show: true,
            position: 'top',
            textShadowColor: 'transparent',
            textBorderColor: 'transparent',
            align: 'left',
            overflow: 'truncate',
            maxWidth: 30,
            distance: 3,
            offset: [-20, 0],
            formatter: function (params: any) {
              const nodeVal = params.value;
              const percentage = startNodeValue
                ? ((nodeVal / startNodeValue) * 100).toFixed(1) + '%'
                : '0%';

              const maxLen = 20;
              const safeName =
                params.name.length > maxLen
                  ? params.name.slice(0, maxLen / 2 - 2) +
                    '...' +
                    params.name.slice(-(maxLen / 2 - 2))
                  : params.name;
              const nodeType = params.data.type;
              
              const icon = getIcon(nodeType)
              return (
                `${icon}{header|${safeName}}\n` +
                `{body|}{percentage|${percentage}}  {sessions|${nodeVal}}`
              );
            },
            rich: {
              container: {
                height: 20,
                width: 14,
              },
              header: {
                fontWeight: '600',
                fontSize: 12,
                color: '#333',
                overflow: 'truncate',
                paddingBottom: '.5rem',
                paddingLeft: '14px',
                position: 'relative',
              },
              body: {
                fontSize: 12,
                color: '#000',
              },
              percentage: {
                fontSize: 12,
                color: '#454545',
              },
              sessions: {
                fontSize: 12,
                fontFamily: "mono, 'monospace', sans-serif",
                color: '#999999',
              },
              clickIcon: {
                backgroundColor: {
                  image: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20class%3D%22lucide%20lucide-pointer%22%3E%3Cpath%20d%3D%22M22%2014a8%208%200%200%201-8%208%22%2F%3E%3Cpath%20d%3D%22M18%2011v-1a2%202%200%200%200-2-2a2%202%200%200%200-2%202%22%2F%3E%3Cpath%20d%3D%22M14%2010V9a2%202%200%200%200-2-2a2%202%200%200%200-2%202v1%22%2F%3E%3Cpath%20d%3D%22M10%209.5V4a2%202%200%200%200-2-2a2%202%200%200%200-2%202v10%22%2F%3E%3Cpath%20d%3D%22M18%2011a2%202%200%201%201%204%200v3a8%208%200%200%201-8%208h-2c-2.8%200-4.5-.86-5.99-2.34l-3.6-3.6a2%202%200%200%201%202.83-2.82L7%2015%22%2F%3E%3C%2Fsvg%3E',
                },
                height: 20,
                width: 14,
              },
              locationIcon: {
                backgroundColor: {
                  image: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20class%3D%22lucide%20lucide-navigation%22%3E%3Cpolygon%20points%3D%223%2011%2022%202%2013%2021%2011%2013%203%2011%22%2F%3E%3C%2Fsvg%3E',
                },
                height: 20,
                width: 14,
              },
              inputIcon: {
                backgroundColor: {
                  image: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20class%3D%22lucide%20lucide-rectangle-ellipsis%22%3E%3Crect%20width%3D%2220%22%20height%3D%2212%22%20x%3D%222%22%20y%3D%226%22%20rx%3D%222%22%2F%3E%3Cpath%20d%3D%22M12%2012h.01%22%2F%3E%3Cpath%20d%3D%22M17%2012h.01%22%2F%3E%3Cpath%20d%3D%22M7%2012h.01%22%2F%3E%3C%2Fsvg%3E',
                },
                height: 20,
                width: 14,
              },
              customEventIcon: {
                backgroundColor: {
                  image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWNvZGUiPjxwb2x5bGluZSBwb2ludHM9IjE2IDE4IDIyIDEyIDE2IDYiLz48cG9seWxpbmUgcG9pbnRzPSI4IDYgMiAxMiA4IDE4Ii8+PC9zdmc+'
                },
                height: 20,
                width: 14,
              }
            },
          },
          tooltip: {
            formatter: sankeyTooltip(echartNodes, []),
          },
          nodeAlign: 'left',
          nodeWidth: 40,
          nodeGap: 40,
          lineStyle: {
            color: 'source',
            curveness: 0.6,
            opacity: 0.1,
          },
          itemStyle: {
            color: '#394eff',
            borderRadius: 7,
          },
        },
      ],
    };

    chart.setOption(option);

    function getUpstreamNodes(nodeIdx: number, visited = new Set<number>()) {
      if (visited.has(nodeIdx)) return;
      visited.add(nodeIdx);
      echartLinks.forEach((link) => {
        if (link.target === nodeIdx && !visited.has(link.source)) {
          getUpstreamNodes(link.source, visited);
        }
      });
      return visited;
    }

    function getDownstreamNodes(nodeIdx: number, visited = new Set<number>()) {
      if (visited.has(nodeIdx)) return;
      visited.add(nodeIdx);
      echartLinks.forEach((link) => {
        if (link.source === nodeIdx && !visited.has(link.target)) {
          getDownstreamNodes(link.target, visited);
        }
      });
      return visited;
    }

    function getConnectedChain(nodeIdx: number): Set<number> {
      const upstream = getUpstreamNodes(nodeIdx) || new Set<number>();
      const downstream = getDownstreamNodes(nodeIdx) || new Set<number>();
      return new Set<number>([...upstream, ...downstream]);
    }

    const originalNodes = [...echartNodes];
    const originalLinks = [...echartLinks];

    chart.on('mouseover', function (params: any) {
      if (params.dataType === 'node') {
        const hoveredIndex = params.dataIndex;
        const connectedChain = getConnectedChain(hoveredIndex);

        const updatedNodes = echartNodes.map((node, idx) => {
          const baseOpacity = connectedChain.has(idx) ? 1 : 0.35;
          const extraStyle =
            idx === hoveredIndex
              ? { borderColor: '#000', borderWidth: 1, borderType: 'dotted' }
              : {};
          return {
            ...node,
            itemStyle: {
              ...node.itemStyle,
              opacity: baseOpacity,
              ...extraStyle,
            },
          };
        });

        const updatedLinks = echartLinks.map((link) => ({
          ...link,
          lineStyle: {
            ...link.lineStyle,
            opacity:
              connectedChain.has(link.source) && connectedChain.has(link.target)
                ? 0.5
                : 0.1,
          },
        }));

        chart.setOption({
          series: [
            {
              data: updatedNodes,
              links: updatedLinks,
            },
          ],
        });
      }
    });

    chart.on('mouseout', function (params: any) {
      if (params.dataType === 'node') {
        chart.setOption({
          series: [
            {
              data: originalNodes,
              links: originalLinks,
            },
          ],
        });
      }
    });

    chart.on('click', function (params: any) {
      if (!onChartClick) return;
      const unsupported = ['other', 'drop'];

      if (params.dataType === 'node') {
        const node = params.data;
        const filters = [];
        if (node && node.type) {
          const type = node.type.toLowerCase();
          if (unsupported.includes(type)) {
            return;
          }
          filters.push({
            operator: 'is',
            type: type,
            value: [node.name],
            isEvent: true,
          });
        }
        onChartClick?.(filters);
      } else if (params.dataType === 'edge') {
        const linkIndex = params.dataIndex;
        const link = filteredLinks[linkIndex];

        const firstNode = data.nodes.find((n) => n.id === link.source);
        const lastNode = data.nodes.find((n) => n.id === link.target);
        const firstNodeType = firstNode?.eventType?.toLowerCase() ?? 'location';
        const lastNodeType = lastNode?.eventType?.toLowerCase() ?? 'location';
        if (
          unsupported.includes(firstNodeType) ||
          unsupported.includes(lastNodeType)
        ) {
          return;
        }
        const filters = [];
        if (firstNode) {
          filters.push({
            operator: 'is',
            type: firstNodeType,
            value: [firstNode.name],
            isEvent: true,
          });
        }

        if (lastNode) {
          filters.push({
            operator: 'is',
            type: lastNodeType,
            value: [lastNode.name],
            isEvent: true,
          });
        }

        onChartClick?.(filters);
      }
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(chartRef.current);

    return () => {
      chart.dispose();
      ro.disconnect();
    };
  }, [data, height, onChartClick]);

  let containerStyle: React.CSSProperties;
  if (isUngrouped) {
    const dynamicMinHeight = finalNodeCount * 15;
    containerStyle = {
      width: '100%',
      minHeight: dynamicMinHeight,
      height: '100%',
      overflowY: 'auto',
    };
  } else {
    containerStyle = {
      width: '100%',
      height,
    };
  }

  return (
    <div style={{ maxHeight: 620, overflow: 'auto', maxWidth: 1240, }}>
      <div
        ref={chartRef}
        style={containerStyle}
        className="min-w-[600px]"
      />
    </div>
  );
};

function getIcon(type: string) {
  if (type === 'LOCATION') {
    return '{locationIcon|}'
  }
  if (type === 'INPUT') {
    return '{inputIcon|}'
  }
  if (type === 'CUSTOM_EVENT') {
    return '{customEventIcon|}'
  }
  if (type === 'CLICK') {
    return '{clickIcon|}';
  }
  return ''
}

export default EChartsSankey;
