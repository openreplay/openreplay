import { colors } from '../utils';
import type { Data } from '../SankeyChart';

export interface SunburstChild {
  name: string;
  value: number;
  children?: SunburstChild[];
  itemStyle?: any;
  dataIndex: number;
}

const colorMap = new Map();

export function convertSankeyToSunburst(data: Data): {
  tree: SunburstChild;
  colors: Map<string, string>;
} {
  const dataLinks = data.links.filter((link) => {
    const sourceNode = data.nodes.find((node) => node.id === link.source);
    const targetNode = data.nodes.find((node) => node.id === link.target);
    return (
      sourceNode &&
      targetNode &&
      ![sourceNode.eventType, targetNode.eventType].includes('OTHER')
    );
  });
  const dataNodes = data.nodes.filter((node) => node.eventType !== 'OTHER');

  const nodesCopy: any = dataNodes.map((node) => ({
    ...node,
    children: [],
    childrenIds: new Set(),
    value: 0,
  }));

  const nodesById: Record<number, (typeof nodesCopy)[number]> = {};
  nodesCopy.forEach((node) => {
    nodesById[node.id as number] = node;
  });

  dataLinks.forEach((link) => {
    const sourceNode = nodesById[link.source as number];
    const targetNode = nodesById[link.target as number];
    if (link.source === 0) {
      if (sourceNode.value) {
        sourceNode.value += link.sessionsCount;
      } else {
        sourceNode.value = link.sessionsCount;
      }
    }
    if (sourceNode && targetNode) {
      if (
        targetNode.depth === sourceNode.depth + 1 &&
        !sourceNode.childrenIds.has(targetNode.id)
      ) {
        const specificId = `${link.source}_${link.target}`;
        const fakeNode = {
          ...targetNode,
          id: specificId,
          value: link.sessionsCount,
        };
        sourceNode.children.push(fakeNode);
        sourceNode.childrenIds.add(specificId);
      }
    }
  });

  const rootNode = nodesById[0];
  const nameCount: Record<string, number> = {};
  let dataIndex = 0;
  function buildSunburstNode(node: SunburstChild): SunburstChild | null {
    if (!node) return null;
    // eventType === DROP
    if (!node.name) {
      // node.name = `DROP`
      // colorMap.set('DROP', 'black')
      return null;
    }
    let color = colorMap.get(node.name);
    if (!color) {
      color = randomColor(colorMap.size);
      colorMap.set(node.name, color);
    }
    let nodeName;
    if (nameCount[node.name]) {
      nodeName = `${node.name}_$$$_${nameCount[node.name]++}`;
    } else {
      nodeName = node.name;
      nameCount[node.name] = 1;
    }
    const result: SunburstChild = {
      name: nodeName,
      value: node.value || 0,
      dataIndex: dataIndex++,
      itemStyle: {
        color,
      },
    };

    if (node.children && node.children.length > 0) {
      result.children = node.children
        .map((child) => buildSunburstNode(child))
        .filter(Boolean) as SunburstChild[];
    }

    return result;
  }

  return {
    tree: buildSunburstNode(rootNode) as SunburstChild,
    colors: colorMap,
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
        ? params.data.name.split('_$$$_')[0]
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
