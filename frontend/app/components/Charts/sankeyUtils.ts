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

      const safeSourceName = shortenString(sourceName);
      const safeTargetName = shortenString(targetName);
      return `
      <div class="flex gap-2 w-fit px-2 bg-white items-center rounded-xl">
        <div class="flex flex-col">
          <div class="flex flex-col text-sm">
            <div class="font-semibold">
            <span class="text-base" style="color:#394eff">&#8592;</span> ${safeSourceName}
            </div>
            <div class="text-black">
              ${sourceValue} <span class="text-disabled-text">Sessions</span>
            </div>
            <div class="font-semibold mt-2">
              <span class="text-base" style="color:#394eff">&#8594;</span> ${safeTargetName}
            </div>
            <div class="flex items-baseline gap-2 text-black">
              <span>${params.data.value} (${params.data.percentage.toFixed(
                2,
              )}%)</span>
              <span class="text-disabled-text">Sessions</span>
            </div>
          </div>
        </div>
      </div>
      `;
    }
    if ('name' in params.data) {
      return `
      <div class="flex flex-col">
        <div class="font-semibold text-sm flex gap-1 items-center"><span class="text-base" style="color:#394eff; font-family: sans-serif;">&#9632;&#xFE0E;</span> ${params.data.name}</div>
        <div class="text-black text-sm">${params.value} <span class="text-disabled-text">Sessions</span></div>
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
  clickIcon: {
    backgroundColor: {
      image:
        'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20class%3D%22lucide%20lucide-pointer%22%3E%3Cpath%20d%3D%22M22%2014a8%208%200%200%201-8%208%22%2F%3E%3Cpath%20d%3D%22M18%2011v-1a2%202%200%200%200-2-2a2%202%200%200%200-2%202%22%2F%3E%3Cpath%20d%3D%22M14%2010V9a2%202%200%200%200-2-2a2%202%200%200%200-2%202v1%22%2F%3E%3Cpath%20d%3D%22M10%209.5V4a2%202%200%200%200-2-2a2%202%200%200%200-2%202v10%22%2F%3E%3Cpath%20d%3D%22M18%2011a2%202%200%201%201%204%200v3a8%208%200%200%201-8%208h-2c-2.8%200-4.5-.86-5.99-2.34l-3.6-3.6a2%202%200%200%201%202.83-2.82L7%2015%22%2F%3E%3C%2Fsvg%3E',
    },
    height: 20,
    width: 14,
  },
  locationIcon: {
    backgroundColor: {
      image:
        'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20class%3D%22lucide%20lucide-navigation%22%3E%3Cpolygon%20points%3D%223%2011%2022%202%2013%2021%2011%2013%203%2011%22%2F%3E%3C%2Fsvg%3E',
    },
    height: 20,
    width: 14,
  },
  inputIcon: {
    backgroundColor: {
      image:
        'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20class%3D%22lucide%20lucide-rectangle-ellipsis%22%3E%3Crect%20width%3D%2220%22%20height%3D%2212%22%20x%3D%222%22%20y%3D%226%22%20rx%3D%222%22%2F%3E%3Cpath%20d%3D%22M12%2012h.01%22%2F%3E%3Cpath%20d%3D%22M17%2012h.01%22%2F%3E%3Cpath%20d%3D%22M7%2012h.01%22%2F%3E%3C%2Fsvg%3E',
    },
    height: 20,
    width: 14,
  },
  customEventIcon: {
    backgroundColor: {
      image:
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWNvZGUiPjxwb2x5bGluZSBwb2ludHM9IjE2IDE4IDIyIDEyIDE2IDYiLz48cG9seWxpbmUgcG9pbnRzPSI4IDYgMiAxMiA4IDE4Ii8+PC9zdmc+',
    },
    height: 20,
    width: 14,
  },
  dropEventIcon: {
    backgroundColor: {
      image:
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWNpcmNsZS1hcnJvdy1kb3duIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxwYXRoIGQ9Ik0xMiA4djgiLz48cGF0aCBkPSJtOCAxMiA0IDQgNC00Ii8+PC9zdmc+',
    },
    height: 20,
    width: 14,
  },
  groupIcon: {
    backgroundColor: {
      image:
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWNvbXBvbmVudCI+PHBhdGggZD0iTTE1LjUzNiAxMS4yOTNhMSAxIDAgMCAwIDAgMS40MTRsMi4zNzYgMi4zNzdhMSAxIDAgMCAwIDEuNDE0IDBsMi4zNzctMi4zNzdhMSAxIDAgMCAwIDAtMS40MTRsLTIuMzc3LTIuMzc3YTEgMSAwIDAgMC0xLjQxNCAweiIvPjxwYXRoIGQ9Ik0yLjI5NyAxMS4yOTNhMSAxIDAgMCAwIDAgMS40MTRsMi4zNzcgMi4zNzdhMSAxIDAgMCAwIDEuNDE0IDBsMi4zNzctMi4zNzdhMSAxIDAgMCAwIDAtMS40MTRMNi4wODggOC45MTZhMSAxIDAgMCAwLTEuNDE0IDB6Ii8+PHBhdGggZD0iTTguOTE2IDE3LjkxMmExIDEgMCAwIDAgMCAxLjQxNWwyLjM3NyAyLjM3NmExIDEgMCAwIDAgMS40MTQgMGwyLjM3Ny0yLjM3NmExIDEgMCAwIDAgMC0xLjQxNWwtMi4zNzctMi4zNzZhMSAxIDAgMCAwLTEuNDE0IDB6Ii8+PHBhdGggZD0iTTguOTE2IDQuNjc0YTEgMSAwIDAgMCAwIDEuNDE0bDIuMzc3IDIuMzc2YTEgMSAwIDAgMCAxLjQxNCAwbDIuMzc3LTIuMzc2YTEgMSAwIDAgMCAwLTEuNDE0bC0yLjM3Ny0yLjM3N2ExIDEgMCAwIDAtMS40MTQgMHoiLz48L3N2Zz4=',
    },
    height: 20,
    width: 14,
  },
};
