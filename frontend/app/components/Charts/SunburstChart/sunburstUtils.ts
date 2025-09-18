import { colors } from '../utils';

export interface SunburstChild {
  name: string;
  value: number;
  children?: SunburstChild[];
  itemStyle?: any;
  dataIndex: number;
}

interface DataNode {
  children?: DataNode[];
  depth: number;
  name: string;
  type: string;
  value: number;
}

const colorMap = new Map();

let globalIndex = 0;

export const typeToNameMap = {
  DROP: 'Dropped',
  OTHER: 'Others',
};

export function convertSankeyToSunburst(data: DataNode): {
  tree: SunburstChild;
  colors: Map<string, string>;
  dropsByUrl: Record<string, { drop: number; ids: number[] }>;
  legendMap: Record<string, { color: string; ids: number[] }>;
} {
  const dropsByUrl: Record<string, { drop: number; ids: number[] }> = {};
  const legendMap: Record<string, { color: string; ids: number[] }> = {};

  function buildSunburstNode(
    node: DataNode,
    parentName?: string,
    parentId?: number,
  ): SunburstChild | null {
    const nodeId = globalIndex++;

    if (
      node.type === 'DROP' &&
      parentName !== undefined &&
      parentId !== undefined
    ) {
      if (!dropsByUrl[parentName]) {
        dropsByUrl[parentName] = { drop: node.value, ids: [parentId] };
      } else {
        dropsByUrl[parentName].drop += node.value;
        if (!dropsByUrl[parentName].ids.includes(parentId)) {
          dropsByUrl[parentName].ids.push(parentId);
        }
      }
    }

    // @ts-ignore
    if (!node.name) node.name = typeToNameMap[node.type] ?? node.type;

    let color = colorMap.get(node.name);
    if (!color) {
      if (node.type === 'DROP') {
        color = '#999797';
      } else {
        color = randomColor(colorMap.size);
      }
      colorMap.set(node.name, color);
    }

    if (legendMap[node.name]) {
      legendMap[node.name].ids.push(nodeId);
    } else {
      legendMap[node.name] = { color, ids: [nodeId] };
    }

    const result: SunburstChild = {
      ...node,
      dataIndex: nodeId,
      itemStyle: { color },
    };

    if (node.children && node.children.length > 0) {
      const childNodes = node.children
        .map((child) => buildSunburstNode(child, node.name, nodeId))
        .filter(Boolean) as SunburstChild[];
      if (childNodes.length > 0) {
        result.children = childNodes;
      }
    }

    return result;
  }

  return {
    tree: buildSunburstNode(data)!,
    colors: colorMap,
    dropsByUrl,
    legendMap,
  };
}

function randomColor(mapSize: number) {
  const pointer = mapSize;
  if (pointer > colors.length) {
    colors.push(`#${Math.floor(Math.random() * 16777215).toString(16)}`);
  }
  return colors[pointer];
}

export function sunburstTooltip(colorMap: Map<string, string>) {
  return (params: any) => {
    if ('name' in params.data) {
      const color = colorMap.get(params.data.name);
      const clearName = params.data.name
        ? params.data.name.split('_OPENREPLAY_NODE_')[0]
        : 'Total';
      return `
      <div class="flex flex-col bg-white p-2 rounded shadow border">
        <div class="font-semibold text-sm flex gap-1 items-center">
        <span class="text-base" style="color:${color}; font-family: sans-serif;">&#9632;&#xFE0E;</span>
        ${clearName}
        </div>
        <div class="text-black text-sm">${params.value} <span class="text-disabled-text">Sessions</span></div>
      </div>
      `;
    }
  };
}

export function grayOutTree(
  root: SunburstChild,
  allowedIds: number[],
  gray = '#d3d3d3',
): SunburstChild {
  const rootCopy = { ...root };
  const keep = new Set<number>(allowedIds);
  const walk = (node: SunburstChild) => {
    if (!keep.has(node.dataIndex)) {
      node.itemStyle = { ...(node.itemStyle ?? {}), color: gray };
    }
    node.children?.forEach(walk);
  };
  walk(rootCopy);
  return rootCopy;
}

export function applyColorMap(
  root: SunburstChild,
  map: Map<string, string>,
): SunburstChild {
  const walk = (node: SunburstChild) => {
    const baseName = node.name?.split('_OPENREPLAY_NODE_')[0];
    const clr = map.get(baseName);
    if (clr) node.itemStyle = { ...(node.itemStyle ?? {}), color: clr };
    node.children?.forEach(walk);
  };
  walk(root);
  return root;
}
