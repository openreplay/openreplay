import { colors } from '../utils'
import type { Data } from '../SankeyChart'
import { toJS } from 'mobx'

export interface SunburstChild {
  name: string;
  value: number;
  children?: SunburstChild[]
  itemStyle?: any;
}

const colorMap = new Map();

export function convertSankeyToSunburst(data: Data): { tree: SunburstChild, colors: Map<string, string> } {
  const nodesCopy: any = data.nodes.map(node => ({
    ...node,
    children: [],
    childrenIds: new Set(),
    value: 0
  }));

  const nodesById: Record<number, typeof nodesCopy[number]> = {};
  nodesCopy.forEach((node) => {
    nodesById[node.id as number] = node;
  });

  data.links.forEach(link => {
    const sourceNode = nodesById[link.source as number];
    const targetNode = nodesById[link.target as number];
    if (sourceNode && targetNode) {
      if ((targetNode.depth) === (sourceNode.depth) + 1 && !sourceNode.childrenIds.has(targetNode.id)) {
        const specificId = `${link.source}${link.target}`
        const fakeNode = {
         ...targetNode, id: specificId, value: link.sessionsCount
        }
        sourceNode.children.push(fakeNode);
        sourceNode.childrenIds.add(specificId);
      }
    }
  });

  const rootNode = nodesById[0];

  function buildSunburstNode(node: SunburstChild): SunburstChild | null {
    if (!node) return null;
    if (!node.name) {
      // eventType = DROP
      return null
    }
    let color = colorMap.get(node.name)
    if (!color) {
      color = randomColor(colorMap.size)
      colorMap.set(node.name, color)
    }
    const result: SunburstChild = {
      name: node.name,
      value: node.value || 0,
      itemStyle: {
        color,
      }
    };

    if (node.children && node.children.length > 0) {
      result.children = node.children.map(child => buildSunburstNode(child)).filter(Boolean) as SunburstChild[];
    }

    return result;
  }

  return { tree: buildSunburstNode(rootNode) as SunburstChild, colors: colorMap }
}

function randomColor(mapSize: number) {
  const pointer = mapSize
  if (pointer > colors.length) {
    colors.push(`#${Math.floor(Math.random() * 16777215).toString(16)}`);
  }
  return colors[pointer];
}

export function sunburstTooltip(colorMap: Map<string, string>) {
  return (params: any) => {
    if ('name' in params.data) {
      const color = colorMap.get(params.data.name);
      return `
      <div class="flex flex-col bg-white p-2 rounded shadow border">
        <div class="font-semibold text-sm flex gap-1 items-center">
        <span class="text-base" style="color:${color}; font-family: sans-serif;">&#9632;&#xFE0E;</span>
        ${params.data.name}
        </div>
        <div class="text-black text-sm">${params.value} <span class="text-disabled-text">Sessions</span></div>
      </div>
      `;
    }
  }
}
