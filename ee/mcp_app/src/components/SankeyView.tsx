import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { SankeyChart } from 'echarts/charts';
import {
  TooltipComponent,
  GridComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([SankeyChart, TooltipComponent, GridComponent, SVGRenderer]);

interface SankeyNode {
  name: string | null;
  eventType: string;
  depth: number;
  id: number;
  startingNode: boolean;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
  sessionsCount: number;
  eventType: string;
}

interface SankeyViewProps {
  data: {
    nodes: SankeyNode[];
    links: SankeyLink[];
    summary?: any;
    startPoint?: string | null;
  };
}

const MAX_DEPTH = 4;

function getEventPriority(type: string): number {
  switch (type) {
    case 'DROP': return 3;
    case 'OTHER': return 2;
    default: return 1;
  }
}

function getNodeName(eventType: string, nodeName: string | null): string {
  if (!nodeName) {
    return eventType.charAt(0) + eventType.slice(1).toLowerCase();
  }
  return nodeName;
}

function shortenString(str: string, limit = 60): string {
  if (str.length <= limit) return str;
  const left = Math.floor(limit / 2) - 2;
  const right = Math.floor(limit / 2) - 2;
  return `${str.slice(0, left)}...${str.slice(-right)}`;
}

function SankeyView({ data }: SankeyViewProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [nodeCount, setNodeCount] = useState(0);

  useEffect(() => {
    if (!chartRef.current || !data.nodes?.length || !data.links?.length) return;

    const chart = echarts.init(chartRef.current);

    const filteredNodes = data.nodes.filter(n => (n.depth ?? 0) <= MAX_DEPTH);
    const filteredLinks = data.links.filter(l => {
      const sourceNode = data.nodes.find(n => n.id === l.source);
      const targetNode = data.nodes.find(n => n.id === l.target);
      return (sourceNode?.depth ?? 0) <= MAX_DEPTH && (targetNode?.depth ?? 0) <= MAX_DEPTH;
    });

    setNodeCount(filteredNodes.length);

    // Map nodes to ECharts format
    const echartNodes = filteredNodes
      .map(n => {
        let computedName = getNodeName(n.eventType || 'Minor Paths', n.name);
        if (computedName === 'Other') computedName = 'Others';

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
          startingNode: n.startingNode,
        };
      })
      .sort((a, b) => {
        if (a.depth === b.depth) {
          return getEventPriority(a.type || '') - getEventPriority(b.type || '');
        }
        return (a.depth as number) - (b.depth as number);
      });

    // Map links — resolve to ECharts indices
    const echartLinks = filteredLinks.map(l => ({
      source: echartNodes.findIndex(n => n.id === l.source),
      target: echartNodes.findIndex(n => n.id === l.target),
      value: l.sessionsCount,
      percentage: l.value,
      lineStyle: { opacity: 0.1 },
    }));

    if (echartNodes.length === 0) return;

    // Compute node values for tooltips
    const nodeValues: Record<number, number> = {};
    echartNodes.forEach((_, idx) => { nodeValues[idx] = 0; });
    echartLinks.forEach(l => {
      nodeValues[l.source] = (nodeValues[l.source] || 0) + l.value;
      nodeValues[l.target] = Math.max(nodeValues[l.target] || 0,
        echartLinks.filter(el => el.target === l.target).reduce((s, el) => s + el.value, 0));
    });
    // Recalculate properly like original
    Object.keys(nodeValues).forEach(nodeId => {
      const idx = parseInt(nodeId);
      const outgoing = echartLinks.filter(l => l.source === idx).reduce((s, l) => s + l.value, 0);
      const incoming = echartLinks.filter(l => l.target === idx).reduce((s, l) => s + l.value, 0);
      nodeValues[idx] = Math.max(outgoing, incoming);
    });

    // Find start node value for percentage calculation
    const startingNodes = echartNodes.filter(n => n.startingNode);
    const mainNodeIndices = startingNodes.map(n => echartNodes.findIndex(en => en.id === n.id));
    const startNodeValue = echartLinks
      .filter(l => mainNodeIndices.includes(l.source))
      .reduce((sum, l) => sum + l.value, 0);

    const option: any = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if ('source' in params.data && 'target' in params.data) {
            const sourceName = shortenString(echartNodes[params.data.source]?.name || '');
            const targetName = shortenString(echartNodes[params.data.target]?.name || '');
            const sourceVal = nodeValues[params.data.source] || 0;
            return `<div style="font-size:13px;max-width:300px">
              <div style="font-weight:600;color:#394eff">&larr; ${sourceName}</div>
              <div>${sourceVal} sessions</div>
              <div style="font-weight:600;color:#394eff;margin-top:6px">&rarr; ${targetName}</div>
              <div>${params.data.value} (${params.data.percentage?.toFixed(1)}%) sessions</div>
            </div>`;
          }
          if ('name' in params.data) {
            return `<div style="font-size:13px">
              <div style="font-weight:600">${params.data.name}</div>
              <div>${params.value} sessions</div>
            </div>`;
          }
        },
        backgroundColor: 'var(--color-background-primary, #fff)',
        borderColor: 'var(--color-border-primary, #e5e7eb)',
        textStyle: { color: 'var(--color-text-primary, #000)' },
      },
      series: [
        {
          animation: false,
          layoutIterations: 0,
          type: 'sankey',
          data: echartNodes,
          links: echartLinks,
          emphasis: {
            focus: 'trajectory',
            lineStyle: { opacity: 0.5 },
          },
          top: 40,
          label: {
            show: true,
            position: 'top',
            textShadowColor: 'transparent',
            textBorderColor: 'transparent',
            align: 'left',
            overflow: 'truncate',
            maxWidth: 120,
            distance: 3,
            formatter(params: any) {
              const nodeVal = params.value;
              const percentage = startNodeValue
                ? `${((nodeVal / startNodeValue) * 100).toFixed(1)}%`
                : '0%';
              const maxLen = 24;
              const safeName = params.name.length > maxLen
                ? `${params.name.slice(0, maxLen / 2 - 1)}...${params.name.slice(-(maxLen / 2 - 1))}`
                : params.name;
              return `{header|${safeName}}\n{percentage|${percentage}}  {sessions|${nodeVal}}`;
            },
            rich: {
              header: {
                fontWeight: '600',
                fontSize: 11,
                color: 'var(--color-text-primary, #333)',
              },
              percentage: {
                fontSize: 11,
                color: 'var(--color-text-secondary, #666)',
              },
              sessions: {
                fontSize: 11,
                fontFamily: "monospace",
                color: 'var(--color-text-secondary, #666)',
              },
            },
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

    try {
      chart.setOption(option);
    } catch (e) {
      console.error('Sankey render error:', e);
    }

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(chartRef.current);

    return () => {
      chart.dispose();
      ro.disconnect();
    };
  }, [data]);

  if (!data.nodes?.length || !data.links?.length) {
    return (
      <div>
        <div className="view-header">
          <span className="view-title">User Journey</span>
        </div>
        <div className="view-empty">
          <div className="view-empty-title">No journey data</div>
          <div className="view-empty-text">Try adjusting the time range or start point.</div>
        </div>
      </div>
    );
  }

  const dynamicMinHeight = Math.max(450, nodeCount * 15);

  return (
    <div>
      <div className="view-header">
        <span className="view-title">
          User Journey
          {data.startPoint && (
            <span className="view-title-date">from {data.startPoint}</span>
          )}
        </span>
      </div>
      <div className="sankey-container">
        <div
          ref={chartRef}
          style={{ width: '100%', minHeight: dynamicMinHeight, height: '100%' }}
        />
      </div>
    </div>
  );
}

export default SankeyView;
