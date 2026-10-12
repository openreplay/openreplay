import { FilterKey } from '@/types/filter/filterType';
import { useChartTheme } from '@/ui/data/chart';
import { NoContent } from '@/ui/feedback/NoContent';
import { SankeyChart } from 'echarts/charts';
import { Info } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { defaultOptions, echarts } from './init';
import {
  SankeyLink,
  SankeyNode,
  getConnectedChain,
  getEventPriority,
  getIcon,
  getNodeName,
  linkIconStyles,
  sankeyTooltip,
} from './sankeyUtils';

echarts.use([SankeyChart]);

const NODE_W = 40;
const ICON_W = 16;
let measurer: CanvasRenderingContext2D | null = null;
/** Fits `text` into `px` at `font`, cutting the middle so a URL keeps its end. */
function fitMiddle(text: string, px: number, font: string) {
  measurer ??= document.createElement('canvas').getContext('2d');
  if (!measurer) return text;
  measurer.font = font;
  const fits = (s: string) => measurer!.measureText(s).width <= px;
  if (fits(text)) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const keep = Math.ceil((lo + hi) / 2);
    const cut = `${text.slice(0, Math.ceil(keep / 2))}…${text.slice(text.length - Math.floor(keep / 2))}`;
    if (fits(cut)) lo = keep;
    else hi = keep - 1;
  }
  return `${text.slice(0, Math.ceil(lo / 2))}…${text.slice(text.length - Math.floor(lo / 2))}`;
}

export interface Data {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface Props {
  data: Data;
  height?: number;
  onChartClick?: (filters: any[]) => void;
  isUngrouped?: boolean;
  inGrid?: boolean;
  startUrl: string;
  getFilter: (name: string) => Record<string, any>;
  drilldownFilter?: any[];
}

const nodeToFilter = {
  LOCATION: FilterKey.LOCATION,
  INPUT: FilterKey.INPUT,
  CLICK: FilterKey.CLICK,
  ISSUE: FilterKey.ISSUE,
  TAG_TRIGGER: FilterKey.TAGGED_ELEMENT,
};

const subFilters = {
  INPUT: 'label',
  CLICK: 'label',
  LOCATION: 'urlPath',
  ISSUE: 'issue_type',
  TAG_TRIGGER: 'tag_id',
};
type tHighlightedLink = { id: number; shape: 'link' | 'node' };

const EChartsSankey = (props: Props) => {
  const { t } = useTranslation();
  const theme = useChartTheme();
  const highlightOn = props.drilldownFilter?.some((f) =>
    f.filters.find((subf: any) => subf.name === 'url_path'),
  );
  const [highlightedLink, setHighlightedLink] =
    React.useState<tHighlightedLink | null>(null);
  const [savedOriginalLinks, setOriginalLinks] = React.useState<any[]>([]);
  const [savedOriginalNodes, setOriginalNodes] = React.useState<any[]>([]);
  const {
    data,
    height: propHeight,
    onChartClick,
    isUngrouped,
    getFilter,
    inGrid,
  } = props;
  const height = propHeight || inGrid ? 540 : 240;
  const chartRef = React.useRef<HTMLDivElement>(null);

  const [finalNodeCount, setFinalNodeCount] = React.useState(data.nodes.length);

  React.useEffect(() => {
    if (!chartRef.current || data.nodes.length === 0 || data.links.length === 0)
      return;

    const finalNodes = data.nodes;
    const finalLinks = data.links;

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
    const columns = Math.max(
      1,
      ...filteredNodes.map((n) => (n.depth ?? 0) + 1),
    );
    // a label sits over its node and runs right to the next column: every
    // column gets the same lane, the last one's taken from the right margin
    const layoutOf = (w: number) => {
      const lane = Math.max(
        48,
        Math.min(240, Math.floor((w - 4) / columns) - 12),
      );
      return { lane, right: Math.max(8, lane - NODE_W + 8) };
    };
    let { lane, right } = layoutOf(chart.getWidth());
    const labelFont = `600 12px ${theme.font || 'sans-serif'}`;
    const nodeValues: Record<string, number> = {};
    const echartNodes = filteredNodes
      .map((n, i) => {
        let computedName = getNodeName(n.eventType || 'Minor Paths', n.name);
        if (computedName === 'Other') {
          computedName = 'Others';
        }
        if (n.id) {
          nodeValues[n.id] = 0;
        } else {
          nodeValues[i] = 0;
        }
        const itemColor =
          computedName === 'Others'
            ? theme.series[1]
            : n.eventType === 'DROP'
              ? theme.grid
              : theme.series[0];

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
          return (
            getEventPriority(a.type || '') - getEventPriority(b.type || '')
          );
        }
        return (a.depth as number) - (b.depth as number);
      });

    const echartLinks = filteredLinks.map((l) => ({
      ...filteredLinks,
      source: echartNodes.findIndex((n) => n.id === l.source),
      target: echartNodes.findIndex((n) => n.id === l.target),
      value: l.sessionsCount,
      percentage: l.value,
      lineStyle: { opacity: 0.1 },
    }));

    if (echartNodes.length === 0) return;

    const startingNodes = echartNodes.filter((n) => n.startingNode);
    const mainNodeLinks = startingNodes.map((n) =>
      echartNodes.findIndex((node) => node.id === n.id),
    );

    const fromEnd =
      startingNodes.length && startingNodes[0].depth
        ? startingNodes[0].depth > 0
        : false;

    const startNodeValue = echartLinks
      .filter((link) =>
        mainNodeLinks.includes(fromEnd ? link.target : link.source),
      )
      .reduce((sum, link) => sum + link.value, 0);

    Object.keys(nodeValues).forEach((nodeId) => {
      const intId = parseInt(nodeId as string);
      const outgoingValues = echartLinks
        .filter((l) => l.source === intId)
        .reduce((p, c) => p + c.value, 0);
      const incomingValues = echartLinks
        .filter((l) => l.target === intId)
        .reduce((p, c) => p + c.value, 0);
      nodeValues[nodeId] = Math.max(outgoingValues, incomingValues);
    });

    const option = {
      ...defaultOptions,
      yAxis: undefined,
      tooltip: {
        trigger: 'item',
        appendTo: 'body',
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
            focus: 'trajectory',
            lineStyle: {
              opacity: 0.5,
            },
          },
          top: 40,
          left: 8,
          right,
          label: {
            show: true,
            position: 'top',
            textShadowColor: 'transparent',
            textBorderColor: 'transparent',
            align: 'left',
            fontFamily: theme.font || undefined,
            width: lane,
            overflow: 'truncate',
            distance: 3,
            offset: [-20, 0],
            formatter(params: any) {
              const nodeVal = params.value;
              const percentage = startNodeValue
                ? `${((nodeVal / startNodeValue) * 100).toFixed(1)}%`
                : '0%';

              const safeName = fitMiddle(
                params.name,
                lane - ICON_W - 4,
                labelFont,
              );
              const nodeType = params.data.type;

              const icon = getIcon(nodeType);
              return (
                `${icon}{header| ${safeName}}\n` +
                `{body|}{percentage|${percentage}}  {sessions|${nodeVal}}`
              );
            },
            rich: {
              ...linkIconStyles,
              header: { ...linkIconStyles.header, color: theme.text },
              body: { ...linkIconStyles.body, color: theme.text },
              percentage: {
                ...linkIconStyles.percentage,
                color: theme.textMuted,
              },
              sessions: { ...linkIconStyles.sessions, color: theme.textMuted },
            },
          },
          tooltip: {
            formatter: sankeyTooltip(echartNodes, nodeValues),
            backgroundColor: theme.raised,
            borderColor: theme.border,
            textStyle: { color: theme.text },
          },
          nodeAlign: 'left',
          nodeWidth: NODE_W,
          nodeGap: 40,
          lineStyle: {
            color: 'source',
            curveness: 0.6,
            opacity: 0.1,
          },
          itemStyle: {
            color: theme.series[0],
            borderRadius: 7,
          },
        },
      ],
    };

    try {
      chart.setOption(option);
    } catch (e) {
      console.error(e, option);
    }

    setOriginalNodes([...echartNodes]);
    setOriginalLinks([...echartLinks]);

    chart.on('click', (params: any) => {
      if (!onChartClick) return;
      const unsupported = ['other', 'drop'];

      const constructFilters = (nodes: { type: string; name: string }[]) => {
        const filters: any = [];
        nodes.forEach((node) => {
          const type = node.type.toLowerCase();
          const filterName =
            nodeToFilter[node.type as keyof typeof nodeToFilter];
          const subFilterName =
            subFilters[node.type as keyof typeof subFilters];
          if (unsupported.includes(type) || !filterName || !subFilterName) {
            return;
          }
          const filter = getFilter(filterName);
          const subFilter = getFilter(subFilterName);
          if (filter && subFilter) {
            subFilter.operator = 'is';
            subFilter.value = [node.name];
            filter.filters.push(subFilter);
            filters.push(filter);
          }
        });
        return filters;
      };
      if (params.dataType === 'node') {
        const node = params.data;
        if (node && node.type) {
          const filters = constructFilters([node]);
          const index = params.dataIndex;
          onChartClick?.(filters);
          setHighlightedLink({ id: index, shape: 'node' });
        }
      } else if (params.dataType === 'edge') {
        const linkIndex = params.dataIndex;
        const link = filteredLinks[linkIndex];

        const firstNode = data.nodes.find((n) => n.id === link.source);
        const lastNode = data.nodes.find((n) => n.id === link.target);
        if (firstNode && lastNode) {
          const filters = constructFilters([
            // @ts-ignore
            { ...firstNode, type: firstNode.eventType },
            // @ts-ignore
            { ...lastNode, type: lastNode.eventType },
          ]);
          onChartClick?.(filters);
          setHighlightedLink({ id: linkIndex, shape: 'link' });
        }
      }
    });

    const ro = new ResizeObserver(() => {
      chart.resize();
      const next = layoutOf(chart.getWidth());
      if (next.lane === lane) return;
      ({ lane, right } = next);
      chart.setOption({ series: [{ right, label: { width: lane } }] });
    });
    ro.observe(chartRef.current);

    return () => {
      chart.dispose();
      ro.disconnect();
    };
  }, [data, height, onChartClick, theme]);

  React.useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.getInstanceByDom(chartRef.current);
    if (!chart) return;
    if (highlightedLink && !highlightOn) {
      chart.setOption({
        series: [
          {
            data: savedOriginalNodes,
            links: savedOriginalLinks,
          },
        ],
      });
    }
    if (highlightedLink && highlightOn) {
      if (highlightedLink.shape === 'node') {
        const nodeIndex = highlightedLink.id;

        const hoveredIndex = nodeIndex;
        // @ts-ignore
        const connectedChain = getConnectedChain(
          hoveredIndex,
          savedOriginalLinks,
        );

        const updatedNodes = savedOriginalNodes.map((node, idx) => {
          const baseOpacity = connectedChain.has(idx) ? 1 : 0.35;
          const extraStyle =
            idx === hoveredIndex
              ? {
                  borderColor: theme.text,
                  borderWidth: 1,
                  borderType: 'dotted',
                }
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

        const updatedLinks = savedOriginalLinks.map((link) => ({
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
      } else if (highlightedLink.shape === 'link') {
        const linkIndex = highlightedLink.id;

        chart.setOption({
          series: [
            {
              data: savedOriginalNodes,
              links: savedOriginalLinks.map((link, index) => {
                if (index === linkIndex) {
                  return {
                    ...link,
                    lineStyle: {
                      ...link.lineStyle,
                      opacity: 0.65,
                    },
                  };
                }
                return link;
              }),
            },
          ],
        });
      }
    }
  }, [highlightedLink, highlightOn]);

  if (data.nodes.length === 0 || data.links.length === 0) {
    return (
      <NoContent
        style={{ minHeight: height }}
        title={
          <div className="flex items-center relative">
            <Info size={13} className="hidden md:inline-block mr-1" />
            {t(
              'Set a start or end point to visualize the journey. If set, try adjusting filters or time range.',
            )}
          </div>
        }
        show={true}
      />
    );
  }
  let containerStyle: React.CSSProperties;
  if (isUngrouped) {
    const dynamicMinHeight = finalNodeCount * 15;
    containerStyle = {
      width: '100%',
      minHeight: Math.max(550, dynamicMinHeight),
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
    <div
      style={{
        maxHeight: 620,
        overflow: 'auto',
        maxWidth: 1240,
        minHeight: 240,
      }}
    >
      <div ref={chartRef} style={containerStyle} className="min-w-150" />
    </div>
  );
};

export default EChartsSankey;
