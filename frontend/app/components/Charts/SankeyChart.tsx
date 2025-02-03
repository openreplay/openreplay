import React from 'react';
import { echarts, defaultOptions } from './init';
import { SankeyChart } from 'echarts/charts';
import { sankeyTooltip, getEventPriority, getNodeName } from './sankeyUtils';
import { boxShadow } from 'html2canvas/dist/types/css/property-descriptors/box-shadow';
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
}

const EChartsSankey: React.FC<Props> = (props) => {
  const { data, height = 240, onChartClick } = props;
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    
    const nodeValues = new Array(data.nodes.length).fill(0);

    
    const echartNodes = data.nodes.map((n) => {
      let computedName = getNodeName(n.eventType || 'Minor Paths', n.name);
      
      if (computedName === 'Other') {
        computedName = 'Minor Paths';
      }
      const itemColor =
        computedName === 'Minor Paths'
          ? '#222F99'
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

    
    const echartLinks = data.links.map((l) => ({
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
          saveAsImage: { show: false }
        }
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
            formatter: '{b} - {c}',
          },
          tooltip: {
            formatter: sankeyTooltip(echartNodes, nodeValues),
          },
          nodeAlign: 'right',
          nodeWidth: 40,
          nodeGap: 8,
          lineStyle: {
            color: 'source',
            curveness: 0.2,
            opacity: 0.1,
          },
          itemStyle: {
            color: '#394eff',
            borderRadius: 2,
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
          
          const extraStyle = idx === hoveredIndex
            ? {borderColor: '#000000', borderWidth:1, borderType: 'dotted' }
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
            opacity: (connectedChain.has(link.source) && connectedChain.has(link.target))
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
        const node = data.nodes[nodeIndex];
        onChartClick([{ node }]);
      } else if (params.dataType === 'edge') {
        const linkIndex = params.dataIndex;
        const link = data.links[linkIndex];
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

  return <div ref={chartRef} style={{ width: '100%', height }} />;
};

export default EChartsSankey;