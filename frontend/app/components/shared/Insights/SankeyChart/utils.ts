interface Link {
  eventType: 'string';
  sessionsCount: number;
  value: number;
  avgTimeFromPrevious: any;
  /**
   * index in array of nodes
   * */
  source: number;
  /**
   * index in array of nodes
   * */
  target: number;
  id: string;
}
interface DataNode {
  name: string;
  eventType: 'string';
  avgTimeFromPrevious: any;
  id: string;
}

interface DataType {
  links: Link[];
  nodes: DataNode[];
}
export function filterMinorPaths(
  data: DataType,
  startNode: number = 0,
): DataType {
  if (!data.nodes.length || !data.links.length) {
    return data;
  }
  const original: DataType = JSON.parse(JSON.stringify(data));
  const { eventType } = data.nodes[startNode];
  const sourceLinks: Map<number, Link[]> = new Map();
  for (const link of original.links) {
    if (!sourceLinks.has(link.source)) {
      sourceLinks.set(link.source, []);
    }
    sourceLinks.get(link.source)!.push(link);
  }

  const visited: Set<number> = new Set([startNode]);
  const queue: number[] = [startNode];

  const newNodes: Node[] = [];
  const oldToNewMap: Map<number, number> = new Map();
  const otherIndexMap: Map<number, number> = new Map();

  function getNewIndexForNode(oldIndex: number): number {
    if (oldToNewMap.has(oldIndex)) {
      return oldToNewMap.get(oldIndex)!;
    }
    const oldNode = original.nodes[oldIndex];
    const newIndex = newNodes.length;
    newNodes.push({ ...oldNode });
    oldToNewMap.set(oldIndex, newIndex);
    return newIndex;
  }

  function getOtherIndexForNode(oldIndex: number): number {
    if (otherIndexMap.has(oldIndex)) {
      return otherIndexMap.get(oldIndex)!;
    }
    const newIndex = newNodes.length;
    newNodes.push({
      name: 'Dropoff',
      eventType,
      avgTimeFromPrevious: null,
      idd: `other_${oldIndex}`,
    });
    otherIndexMap.set(oldIndex, newIndex);
    return newIndex;
  }

  const newLinks: Link[] = [];

  while (queue.length) {
    const current = queue.shift()!;

    const outLinks = sourceLinks.get(current) || [];
    if (!outLinks.length) continue;

    const majorLink = outLinks.reduce(
      (prev, curr) => (curr.value > prev.value ? curr : prev),
      outLinks[0],
    );

    const minorSessionsSum = outLinks.reduce(
      (sum, link) =>
        link !== majorLink ? sum + (link.sessionsCount || 0) : sum,
      0,
    );
    const minorValueSum = outLinks.reduce(
      (sum, link) => (link !== majorLink ? sum + (link.value || 0) : sum),
      0,
    );

    if (majorLink) {
      const newSource = getNewIndexForNode(majorLink.source);
      const newTarget = getNewIndexForNode(majorLink.target);

      newLinks.push({
        ...majorLink,
        source: newSource,
        target: newTarget,
      });

      if (!visited.has(majorLink.target)) {
        visited.add(majorLink.target);
        queue.push(majorLink.target);
      }
    }

    if (minorValueSum > 0) {
      const newSource = getNewIndexForNode(current);
      const newTarget = getOtherIndexForNode(current);

      newLinks.push({
        eventType,
        sessionsCount: minorSessionsSum,
        value: minorValueSum,
        avgTimeFromPrevious: null,
        source: newSource,
        target: newTarget,
        id: `other-${current}`,
      });
    }
  }

  const dropoffIndices: number[] = [];
  const normalIndices: number[] = [];
  for (let i = 0; i < newNodes.length; i++) {
    if (newNodes[i].name === 'Dropoff') {
      dropoffIndices.push(i);
    } else {
      normalIndices.push(i);
    }
  }
  const finalOrder = normalIndices.concat(dropoffIndices);

  const indexMap: Map<number, number> = new Map();
  finalOrder.forEach((oldIndex, sortedPos) => {
    indexMap.set(oldIndex, sortedPos);
  });

  const sortedNodes = finalOrder.map((idx) => newNodes[idx]);

  for (const link of newLinks) {
    link.source = indexMap.get(link.source)!;
    link.target = indexMap.get(link.target)!;
  }

  return {
    ...original,
    nodes: sortedNodes,
    links: newLinks,
  };
}
