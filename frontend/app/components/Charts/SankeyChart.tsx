import React from 'react';
import { echarts, defaultOptions } from './init';
import { SankeyChart } from 'echarts/charts';
import { sankeyTooltip, getEventPriority, getNodeName } from './sankeyUtils';
import { NoContent } from 'App/components/ui';
import {InfoCircleOutlined} from '@ant-design/icons';
import { X } from 'lucide-react';
echarts.use([SankeyChart]);

interface SankeyNode {
  name: string | null;
  eventType?: string;
  depth?: number;
  id?: string | number;
}

interface SankeyLink {
  source: number;
  target: number;
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
            <InfoCircleOutlined className='hidden md:inline-block mr-1' />
            Set a start or end point to visualize the journey. If set, try adjusting filters.
          </div>
          
        }
        show={true}
      />
    );
  }

  React.useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    const maxDepth = 4;
    const filteredNodes = data.nodes.filter((n) => (n.depth ?? 0) <= maxDepth);
    const filteredLinks = data.links.filter((l) => {
      const sourceNode = data.nodes.find((n) => n.id === l.source);
      const targetNode = data.nodes.find((n) => n.id === l.target);
      return (sourceNode?.depth ?? 0) <= maxDepth && (targetNode?.depth ?? 0) <= maxDepth;
    });

    
    const nodeValues = new Array(filteredNodes.length).fill(0);

    
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
          return getEventPriority(a.type || '') - getEventPriority(b.type || '');
        } else {
          return (a.depth as number) - (b.depth as number);
        }
      });
      
      const distinctSteps = new Set(data.nodes.map(node => node.depth)).size;
      console.log('Number of steps returned by the backend:', distinctSteps);
    
    const echartLinks = filteredLinks.map((l) => ({
      source: echartNodes.findIndex((n) => n.id === l.source),
      target: echartNodes.findIndex((n) => n.id === l.target),
      value: l.sessionsCount,
      percentage: l.value,
      lineStyle: { opacity: 0.1 },
    }));

    
    nodeValues.forEach((v, i) => {
      const outgoingValues = echartLinks
        .filter((l) => l.source === i)
        .reduce((p, c) => p + c.value, 0);
      const incomingValues = echartLinks
        .filter((l) => l.target === i)
        .reduce((p, c) => p + c.value, 0);
      nodeValues[i] = Math.max(outgoingValues, incomingValues);
    });

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
          label: {
            show: true,
            position: 'top',
            textShadowColor: "transparent",
            textBorderColor: "transparent",
            align: 'left',
            overflow: "truncate",
            distance: 3,
            offset: [-20, 0],
            formatter: function(params: any) {
              const totalSessions = nodeValues.reduce((sum: number, v: number) => sum + v, 0);
              const percentage = totalSessions ? ((params.value / totalSessions) * 100).toFixed(1) + '%' : '0%';
              return `{header|${params.name}}\n{body|${percentage}  ${params.value} Sessions}`;
            },
            rich: {
              header: {
                fontWeight: 'bold',
                fontSize: 12,
                color: '#333'
              },
              body: {
                fontSize: 12,
                color: '#666'
              }
            }
          },
          tooltip: {
            formatter: sankeyTooltip(echartNodes, nodeValues),
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
              ? { borderColor: '#000000', borderWidth: 1, borderType: 'dotted' }
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
        // Restore original styles on mouseout.
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
      if (params.dataType === 'node') {
        const nodeIndex = params.dataIndex;
        // Use filteredNodes here.
        const node = filteredNodes[nodeIndex];
        onChartClick([{ node }]);
      } else if (params.dataType === 'edge') {
        const linkIndex = params.dataIndex;
        // Use filteredLinks here.
        const link = filteredLinks[linkIndex];
        onChartClick([{ link }]);
      }
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(chartRef.current);

    return () => {
      chart.dispose();
      ro.disconnect();
    };
  }, [data, height, onChartClick]);

  const containerStyle: React.CSSProperties = isUngrouped
    ? {width: '100%', minHeight: 500, height: '100%', overflowY: 'auto' }
    : { width: '100%', height };

    return <div ref={chartRef} style={containerStyle} />;
};

export default EChartsSankey;