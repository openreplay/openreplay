import { escapeHtml } from 'App/utils';

export interface SankeyNode {
  name: string | null;
  eventType?: string;
  depth?: number;
  id?: number;
  startingNode?: boolean;
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
  sessionsCount: number;
  eventType?: string;
}

export function sankeyTooltip(
  echartNodes: any[],
  nodeValues: Record<string, number>,
) {
  return (params: any) => {
    if ('source' in params.data && 'target' in params.data) {
      const sourceName = echartNodes[params.data.source].name;
      const targetName = echartNodes[params.data.target].name;
      const sourceValue = nodeValues[params.data.source];

      const safeSourceName = escapeHtml(shortenString(sourceName));
      const safeTargetName = escapeHtml(shortenString(targetName));
      return `
      <div class="flex gap-2 w-fit px-2 items-center">
        <div class="flex flex-col">
          <div class="flex flex-col text-sm">
            <div class="font-semibold">
            <span class="text-base" style="color:var(--m-chart-1)">&#8592;</span> ${safeSourceName}
            </div>
            <div style="color:var(--m-content-primary)">
              ${sourceValue} <span style="color:var(--m-content-muted)">Sessions</span>
            </div>
            <div class="font-semibold mt-2">
              <span class="text-base" style="color:var(--m-chart-1)">&#8594;</span> ${safeTargetName}
            </div>
            <div class="flex items-baseline gap-2" style="color:var(--m-content-primary)">
              <span>${params.data.value} (${params.data.percentage.toFixed(
                2,
              )}%)</span>
              <span style="color:var(--m-content-muted)">Sessions</span>
            </div>
          </div>
        </div>
      </div>
      `;
    }
    if ('name' in params.data) {
      return `
      <div class="flex flex-col">
        <div class="font-semibold text-sm flex gap-1 items-center"><span class="text-base" style="color:var(--m-chart-1); font-family: sans-serif;">&#9632;&#xFE0E;</span> ${escapeHtml(params.data.name)}</div>
        <div class="text-sm" style="color:var(--m-content-primary)">${params.value} <span style="color:var(--m-content-muted)">Sessions</span></div>
      </div>
      `;
    }
  };
}

const shortenString = (str: string) => {
  const limit = 60;
  const leftPart = 25;
  const rightPart = 20;
  const safeStr =
    str.length > limit
      ? `${str.slice(0, leftPart)}...${str.slice(
          str.length - rightPart,
          str.length,
        )}`
      : str;

  return safeStr;
};

export const getEventPriority = (type: string): number => {
  switch (type) {
    case 'DROP':
      return 3;
    case 'OTHER':
      return 2;
    default:
      return 1;
  }
};

export const getNodeName = (
  eventType: string,
  nodeName: string | null,
): string => {
  if (!nodeName) {
    return eventType.charAt(0) + eventType.slice(1).toLowerCase();
  }
  return nodeName;
};

export function getUpstreamNodes(
  nodeIdx: number,
  visited = new Set<number>(),
  links: SankeyLink[],
) {
  if (visited.has(nodeIdx)) return;
  visited.add(nodeIdx);
  links.forEach((link) => {
    if (link.target === nodeIdx && !visited.has(link.source)) {
      getUpstreamNodes(link.source, visited, links);
    }
  });
  return visited;
}

export function getDownstreamNodes(
  nodeIdx: number,
  visited: Set<number>,
  links: SankeyLink[],
) {
  if (visited.has(nodeIdx)) return;
  visited.add(nodeIdx);
  links.forEach((link) => {
    if (link.source === nodeIdx && !visited.has(link.target)) {
      getDownstreamNodes(link.target, visited, links);
    }
  });
  return visited;
}

export function getConnectedChain(
  nodeIdx: number,
  links: SankeyLink[],
): Set<number> {
  const upstream =
    getUpstreamNodes(nodeIdx, new Set<number>(), links) || new Set<number>();
  const downstream =
    getDownstreamNodes(nodeIdx, new Set<number>(), links) || new Set<number>();
  return new Set<number>([...upstream, ...downstream]);
}

export function getIcon(type: string) {
  if (type === 'LOCATION') {
    return '{locationIcon|}';
  }
  if (type === 'INPUT') {
    return '{inputIcon|}';
  }
  if (type === 'CUSTOM_EVENT') {
    return '{customEventIcon|}';
  }
  if (type === 'CLICK') {
    return '{clickIcon|}';
  }
  if (type === 'DROP') {
    return '{dropEventIcon|}';
  }
  if (type === 'OTHER') {
    return '{groupIcon|}';
  }
  return '';
}

export const linkIconStyles = {
  container: {
    height: 20,
    width: 14,
  },
  header: {
    fontWeight: '600',
    fontSize: 12,
    color: 'var(--color-gray-darkest)',
    overflow: 'truncate',
    paddingBottom: '.5rem',
    paddingLeft: '14px',
    position: 'relative',
  },
  body: {
    fontSize: 12,
    color: 'var(--color-black)',
  },
  percentage: {
    fontSize: 12,
    color: 'var(--color-gray-dark)',
  },
  sessions: {
    fontSize: 12,
    fontFamily: "mono, 'monospace', sans-serif",
    color: 'var(--color-gray-dark)',
  },
};

// lucide glyphs; drawn as images, so the ink is baked into the SVG
const ICON_SHAPES: Record<string, string> = {
  clickIcon:
    '<path d="M22 14a8 8 0 0 1-8 8"/><path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1"/><path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
  locationIcon: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
  inputIcon:
    '<rect width="20" height="12" x="2" y="6" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/>',
  customEventIcon:
    '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  dropEventIcon:
    '<circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="m8 12 4 4 4-4"/>',
  groupIcon:
    '<path d="M15.536 11.293a1 1 0 0 0 0 1.414l2.376 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z"/><path d="M2.297 11.293a1 1 0 0 0 0 1.414l2.377 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414L6.088 8.916a1 1 0 0 0-1.414 0z"/><path d="M8.916 17.912a1 1 0 0 0 0 1.415l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.415l-2.377-2.376a1 1 0 0 0-1.414 0z"/><path d="M8.916 4.674a1 1 0 0 0 0 1.414l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z"/>',
};

const iconUrl = (shape: string, ink: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`,
  )}`;

/** Step glyphs in the label's ink: secondary for a step, muted for Drop and
    Others. */
export function journeyIconStyles(stepInk: string, quietInk: string) {
  return Object.fromEntries(
    Object.entries(ICON_SHAPES).map(([name, shape]) => [
      name,
      {
        backgroundColor: {
          image: iconUrl(
            shape,
            name === 'dropEventIcon' || name === 'groupIcon'
              ? quietInk
              : stepInk,
          ),
        },
        height: 20,
        width: 14,
      },
    ]),
  );
}
