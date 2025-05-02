import React from 'react';
import { SunburstChart } from 'echarts/charts';
import { NoContent } from 'App/components/ui';
import { InfoCircleOutlined } from '@ant-design/icons';
import { echarts, defaultOptions } from '../init';

echarts.use([SunburstChart]);

interface SunburstNode {
  name: string | null;
  eventType?: string;
  depth?: number;
  id?: string | number;
}

interface SunburstLink {
  source: number | string;
  target: number | string;
  value: number;
  sessionsCount: number;
  eventType?: string;
}

interface Data {
  nodes: SunburstNode[];
  links: SunburstLink[];
}

interface DropoffPage {
  url: string;
  percentage: number;
  sessions: number;
}

interface Props {
  data: Data;
  height?: number;
  onChartClick?: (filters: any[]) => void;
  isUngrouped?: boolean;
  inGrid?: boolean;
}

const EChartsSunburst: React.FC<Props> = (props) => {
  const { data, height = 500, onChartClick, isUngrouped } = props;
  const chartRef = React.useRef<HTMLDivElement>(null);
  const dropoffContainerRef = React.useRef<HTMLDivElement>(null);

  const [tooltipVisible, setTooltipVisible] = React.useState(false);
  const [tooltipContent, setTooltipContent] = React.useState('');
  const [tooltipPosition, setTooltipPosition] = React.useState({ x: 0, y: 0 });
  const [dropoffPages, setDropoffPages] = React.useState<DropoffPage[]>([]);

  // Generate a consistent color for each URL
  const colorMap = React.useRef(new Map<string, string>());
  const generateColor = (url: string): string => {
    if (!url) return '#cccccc'; // Default for null/empty

    if (colorMap.current.has(url)) {
      return colorMap.current.get(url)!;
    }

    // Generate a pastel-ish color that's visually distinct
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 20); // 70-90%
    const lightness = 50 + Math.floor(Math.random() * 10); // 50-60%

    // Convert HSL to RGB
    const hslToRgb = (h: number, s: number, l: number): number[] => {
      h /= 360;
      s /= 100;
      l /= 100;
      let r, g, b;

      if (s === 0) {
        r = g = b = l; // achromatic
      } else {
        const hue2rgb = (p: number, q: number, t: number): number => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }

      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };

    const color = `rgb(${hslToRgb(hue, saturation, lightness).join(',')})`;
    colorMap.current.set(url, color);
    return color;
  };

  // Process data for sunburst chart
  const processData = React.useCallback(() => {
    if (!data || !data.nodes || !data.links || data.nodes.length === 0 || data.links.length === 0) {
      return { sunburstData: null, dropoffData: [] };
    }

    // Find entry points (depth 0)
    const entryNodes = data.nodes.filter(node => node.depth === 0);
    if (entryNodes.length === 0) return { sunburstData: null, dropoffData: [] };

    const hasMultipleStartPoints = entryNodes.length > 1;

    // Create nodes map for quick access
    const nodesMap = new Map<number | string, SunburstNode>();
    data.nodes.forEach(node => {
      nodesMap.set(node.id!, node);
    });

    // Calculate total sessions
    const totalSessions = data.links.reduce(
      (sum, link) => sum + link.sessionsCount,
      0
    );

    // Root for sunburst
    const root = {
      name: 'root',
      children: [],
      value: 0,
      itemStyle: { color: 'rgba(255, 255, 255, 0)' }  // Transparent center
    };

    // Create hierarchical structure for sunburst
    const processedPaths = new Set<string>();
    const skipEventTypes = ['OTHER'];

    // First pass: extract all paths
    const allPaths: { path: any[], value: number }[] = [];

    data.links.forEach(link => {
      const sourceNode = nodesMap.get(link.source);
      const targetNode = nodesMap.get(link.target);

      // Skip if nodes don't exist or if target eventType should be skipped
      if (!sourceNode || !targetNode || skipEventTypes.includes(targetNode.eventType || '')) {
        return;
      }

      // Skip dropoff -> dropoff chains
      if (sourceNode.eventType === 'DROP' && targetNode.eventType === 'DROP') {
        return;
      }

      // Create path segment
      const pathSegment = [];

      // If single start point with depth 0, we hide it in the center
      if (!hasMultipleStartPoints && sourceNode.depth === 0) {
        // Start from the target for single start point
        if (targetNode.eventType !== 'DROP' && targetNode.name) {
          pathSegment.push({
            name: targetNode.name || 'Unknown',
            originId: targetNode.id,
            eventType: targetNode.eventType,
            itemStyle: {
              color: targetNode.name ? generateColor(targetNode.name) : '#cccccc'
            }
          });
        }
      } else {
        // Include source and target for multiple start points
        if (sourceNode.eventType !== 'DROP' && sourceNode.name) {
          pathSegment.push({
            name: sourceNode.name || 'Unknown',
            originId: sourceNode.id,
            eventType: sourceNode.eventType,
            itemStyle: {
              color: sourceNode.name ? generateColor(sourceNode.name) : '#cccccc'
            }
          });
        }

        if (targetNode.eventType !== 'DROP' && targetNode.name) {
          pathSegment.push({
            name: targetNode.name || 'Unknown',
            originId: targetNode.id,
            eventType: targetNode.eventType,
            itemStyle: {
              color: targetNode.name ? generateColor(targetNode.name) : '#cccccc'
            }
          });
        }
      }

      if (pathSegment.length > 0) {
        allPaths.push({
          path: pathSegment,
          value: link.sessionsCount
        });
      }
    });

    // Find longer paths by following connections
    const extendedPaths: { path: any[], value: number }[] = [];
    allPaths.forEach(initialPath => {
      if (initialPath.path.length === 0) return;

      // Current working path
      let currentPath = [...initialPath.path];
      let currentValue = initialPath.value;
      let lastNode = currentPath[currentPath.length - 1];

      // Try to extend the path
      let keepExtending = true;
      let maxDepth = 5; // Prevent infinite loops

      while (keepExtending && maxDepth > 0) {
        keepExtending = false;
        maxDepth--;

        // Find links from last node
        const continuationLinks = data.links.filter(link => {
          const sourceId = link.source;
          return sourceId === lastNode.originId;
        });

        if (continuationLinks.length === 1) {
          // Found a single continuation - extend the path
          const nextLink = continuationLinks[0];
          const nextNode = nodesMap.get(nextLink.target);

          if (nextNode && nextNode.eventType !== 'DROP' && !skipEventTypes.includes(nextNode.eventType || '') && nextNode.name) {
            const nextNodeData = {
              name: nextNode.name || 'Unknown',
              originId: nextNode.id,
              eventType: nextNode.eventType,
              itemStyle: {
                color: nextNode.name ? generateColor(nextNode.name) : '#cccccc'
              }
            };

            currentPath.push(nextNodeData);
            currentValue = nextLink.sessionsCount; // Update value based on link
            lastNode = nextNodeData;
            keepExtending = true;
          }
        }
      }

      // Only add paths that have been extended
      if (currentPath.length > initialPath.path.length) {
        extendedPaths.push({
          path: currentPath,
          value: currentValue
        });
      } else {
        extendedPaths.push(initialPath);
      }
    });

    // Build the final sunburst structure
    extendedPaths.forEach(pathData => {
      const { path, value } = pathData;

      // Skip empty paths
      if (path.length === 0) return;

      // Generate unique path ID to prevent duplicates
      const pathId = path.map(p => p.name).join('|');
      if (processedPaths.has(pathId)) return;
      processedPaths.add(pathId);

      // Add path to sunburst
      let current = root;
      path.forEach(item => {
        const existing = current.children.find((child: any) => child.name === item.name);

        if (existing) {
          // Node already exists, add to value
          existing.value += value;
          current = existing;
        } else {
          // Create new node
          const newNode = {
            name: item.name,
            value: value,
            eventType: item.eventType,
            itemStyle: item.itemStyle,
            children: [] as any[]
          };
          current.children.push(newNode);
          current = newNode;
        }
      });
    });

    // Process dropoff data
    const dropoffData: DropoffPage[] = [];
    data.links.forEach(link => {
      const sourceNode = nodesMap.get(link.source);
      const targetNode = nodesMap.get(link.target);

      if (targetNode && targetNode.eventType === 'DROP' && sourceNode &&
          sourceNode.eventType !== 'DROP' && sourceNode.name) {
        dropoffData.push({
          url: sourceNode.name,
          percentage: (link.sessionsCount / totalSessions) * 100,
          sessions: link.sessionsCount
        });
      }
    });

    // Sort by highest exit percentage
    dropoffData.sort((a, b) => b.percentage - a.percentage);

    return { sunburstData: root, dropoffData };
  }, [data]);

  React.useEffect(() => {
    if (!chartRef.current) return;

    const { sunburstData, dropoffData } = processData();
    setDropoffPages(dropoffData);

    if (!sunburstData || sunburstData.children.length === 0) {
      return;
    }

    const chart = echarts.init(chartRef.current);

    const option = {
      ...defaultOptions,
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          // Skip the root node
          if (params.name === 'root') return '';

          const value = params.value || 0;
          // Calculate total from entry node or use a fallback
          const entryNode = data.nodes.find(node => node.depth === 0);
          let totalSessions = 0;

          if (entryNode) {
            data.links.forEach(link => {
              if (link.source === entryNode.id) {
                totalSessions += link.sessionsCount;
              }
            });
          }

          if (totalSessions === 0) {
            totalSessions = data.links.reduce((sum, link) => sum + link.sessionsCount, 0);
          }

          const percentage = totalSessions > 0 ? ((value / totalSessions) * 100).toFixed(1) : '0.0';

          return `<div style="padding: 3px;">
            <div style="font-weight: bold;">${params.name}</div>
            <div>Sessions: ${value}</div>
            <div>${percentage}% of total</div>
          </div>`;
        }
      },
      series: {
        type: 'sunburst',
        highlightPolicy: 'ancestor',
        data: [sunburstData],
        radius: ['25%', '90%'],
        sort: null,
        emphasis: {
          focus: 'ancestor'
        },
        levels: [
          {},
          {
            r0: '25%',
            r: '45%',
            itemStyle: {
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.5)'
            },
            label: {
              rotate: 'tangential',
              minAngle: 10,
              fontSize: 11
            }
          },
          {
            r0: '45%',
            r: '65%',
            label: {
              align: 'left',
              rotate: 'tangential',
              fontSize: 10
            }
          },
          {
            r0: '65%',
            r: '80%',
            label: {
              rotate: 'tangential',
              fontSize: 9
            }
          },
          {
            r0: '80%',
            r: '90%',
            label: {
              position: 'outside',
              padding: 3,
              silent: false,
              fontSize: 8
            },
            itemStyle: {
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.5)'
            }
          }
        ],
        animation: true,
      }
    };

    chart.setOption(option);

    // Handle chart click events
    if (onChartClick) {
      chart.on('click', (params: any) => {
        if (params.name === 'root') return;

        const filters = [];
        if (params.data && params.data.eventType) {
          const unsupported = ['other', 'drop'];
          const type = params.data.eventType.toLowerCase();

          if (unsupported.includes(type)) {
            return;
          }

          filters.push({
            operator: 'is',
            type,
            value: [params.name],
            isEvent: true,
          });

          onChartClick(filters);
        }
      });
    }

    // Handle resize
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(chartRef.current);

    return () => {
      chart.dispose();
      ro.disconnect();
    };
  }, [data, height, onChartClick, processData]);

  // Handle tooltip for dropoff list
  const handleMouseEnter = (e: React.MouseEvent, url: string) => {
    setTooltipContent(url);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
    setTooltipVisible(true);
  };

  const handleMouseLeave = () => {
    setTooltipVisible(false);
  };

  // Truncate URL for display
  const truncateUrl = (url: string, maxLength = 30) => {
    if (!url) return 'Unknown';
    if (url.length <= maxLength) return url;
    const start = url.substring(0, maxLength/2 - 3);
    const end = url.substring(url.length - maxLength/2 + 3);
    return `${start}...${end}`;
  };

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

  let containerStyle: React.CSSProperties = {
    width: '100%',
    height,
    position: 'relative',
    minHeight: 240,
  };

  if (isUngrouped) {
    containerStyle = {
      ...containerStyle,
      minHeight: 550,
      height: '100%',
    };
  }

  return (
    <div className="flex flex-col lg:flex-row w-full gap-4">
      <div className="w-full lg:w-3/4">
        <div
          ref={chartRef}
          style={containerStyle}
          className="min-w-[500px]"
        />
      </div>

      <div className="w-full lg:w-1/4">
        <div ref={dropoffContainerRef} className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-3">Dropoff Pages</h3>
          <div className="overflow-auto max-h-96">
            {dropoffPages.map((page, index) => (
              <div
                key={index}
                className="border-b border-gray-100 py-2"
                onMouseEnter={(e) => handleMouseEnter(e, page.url)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="text-sm font-medium">{truncateUrl(page.url)}</div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{page.percentage.toFixed(1)}%</span>
                  <span>{page.sessions} sessions</span>
                </div>
              </div>
            ))}
            {dropoffPages.length === 0 && (
              <div className="text-sm text-gray-500 py-2">No dropoff data available</div>
            )}
          </div>
        </div>
      </div>

      {tooltipVisible && (
        <div
          className="fixed bg-gray-900 text-white p-2 rounded text-sm z-50 pointer-events-none"
          style={{
            left: `${tooltipPosition.x + 10}px`,
            top: `${tooltipPosition.y + 10}px`,
          }}
        >
          {tooltipContent}
        </div>
      )}
    </div>
  );
};

export default EChartsSunburst;
