import type { SankeyLink, SankeyNode } from './sankeyUtils';

export type TidyNode = SankeyNode & {
  /** pages folded into this step; for Other, the steps it took in */
  variants?: number;
  /** a folded page filters the sessions by the part all its pages share */
  match?: { operator: 'startsWith' | 'contains'; value: string };
};

export interface TidyJourney {
  nodes: TidyNode[];
  links: SankeyLink[];
  /** the leading path every page shares, left out of the labels */
  head: string;
}

/** steps a column draws before the rest join its Other paths */
export const STEPS_PER_COLUMN = { ungrouped: 10, grouped: 5 } as const;

// six or more digits, a long hex run, a UUID
const ID_SEGMENT =
  /^(\d{6,}|[0-9a-f]{16,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const isPage = (n: SankeyNode) => n.eventType === 'LOCATION' && !!n.name;
const isStep = (n: SankeyNode) =>
  n.eventType !== 'DROP' && n.eventType !== 'OTHER';

export const foldIds = (path: string) =>
  path
    .split('/')
    .map((s) => (ID_SEGMENT.test(s) ? ':id' : s))
    .join('/');

/** a short number folds too, when it is all that tells two pages apart */
function foldShortNumbers(paths: string[]): Map<string, string> {
  const groups = new Map<string, Set<string>>();
  for (const p of paths) {
    const folded = p
      .split('/')
      .map((s) => (/^\d+$/.test(s) ? ':id' : s))
      .join('/');
    if (!groups.has(folded)) groups.set(folded, new Set());
    groups.get(folded)!.add(p);
  }
  const out = new Map<string, string>();
  for (const [folded, pages] of groups)
    for (const p of pages) out.set(p, pages.size > 1 ? folded : p);
  return out;
}

function sharedHead(paths: string[]): string {
  if (paths.length < 2) return '';
  const split = paths.map((p) => p.split('/'));
  let n = 0;
  const shortest = Math.min(...split.map((s) => s.length));
  // the head never takes a whole path: every label keeps a segment
  while (n < shortest - 1 && split.every((s) => s[n] === split[0][n])) n += 1;
  const head = split[0].slice(0, n).join('/');
  return head === '' || head === '/' ? '' : head;
}

function mergeLinks(
  links: SankeyLink[],
  idOf: (id: number) => number,
): SankeyLink[] {
  const byPair = new Map<string, SankeyLink>();
  for (const l of links) {
    const source = idOf(l.source);
    const target = idOf(l.target);
    if (source === target) continue;
    const key = `${source}>${target}`;
    const had = byPair.get(key);
    if (had) {
      had.sessionsCount += l.sessionsCount;
      had.value += l.value;
    } else byPair.set(key, { ...l, source, target });
  }
  return [...byPair.values()];
}

/**
 * A journey as it should be read: id segments folded (`/3679/session/:id`,
 * one node for 111 pages), each column capped with the rest in its Other
 * paths, and the path head every page shares named once.
 */
export function tidyJourney(
  data: { nodes: SankeyNode[]; links: SankeyLink[] },
  perColumn: number,
): TidyJourney {
  const depthOf = (n: SankeyNode) => n.depth ?? 0;
  const depths = [...new Set(data.nodes.map(depthOf))];

  // 1. names, folded per column
  const nameOf = new Map<SankeyNode, string>();
  for (const d of depths) {
    const pages = data.nodes.filter((n) => depthOf(n) === d && isPage(n));
    const long = pages.map((n) => foldIds(n.name!));
    const short = foldShortNumbers([...new Set(long)]);
    pages.forEach((n, i) => nameOf.set(n, short.get(long[i]) ?? long[i]));
  }

  // 2. pages that fold to one name are one node
  const folded = new Map<string, TidyNode>();
  const idMap = new Map<number, number>();
  const nodes: TidyNode[] = [];
  for (const n of data.nodes) {
    const name = nameOf.get(n);
    if (name == null) {
      nodes.push({ ...n });
      continue;
    }
    const key = `${depthOf(n)}|${name}`;
    const into = folded.get(key);
    if (into) {
      into.variants = (into.variants ?? 1) + 1;
      into.startingNode = into.startingNode || n.startingNode;
      idMap.set(n.id!, into.id!);
      continue;
    }
    const node: TidyNode = { ...n, name };
    if (name !== n.name) {
      const [before, after = ''] = name.split(':id');
      node.match =
        before.length > 1
          ? { operator: 'startsWith', value: before }
          : { operator: 'contains', value: after.split(':id')[0] };
    }
    folded.set(key, node);
    nodes.push(node);
  }
  let links = mergeLinks(data.links, (id) => idMap.get(id) ?? id);

  // 3. each column keeps its biggest steps; the rest join its Other paths
  // a step's sessions are what arrived or what left, whichever is more
  const inOf = new Map<number, number>();
  const outOf = new Map<number, number>();
  for (const l of links) {
    outOf.set(l.source, (outOf.get(l.source) ?? 0) + l.sessionsCount);
    inOf.set(l.target, (inOf.get(l.target) ?? 0) + l.sessionsCount);
  }
  const valueOf = {
    get: (id: number) => Math.max(inOf.get(id) ?? 0, outOf.get(id) ?? 0),
  };
  let nextId = Math.max(0, ...nodes.map((n) => n.id ?? 0)) + 1;
  const capMap = new Map<number, number>();
  const kept: TidyNode[] = [];
  for (const d of depths) {
    const column = nodes.filter((n) => depthOf(n) === d);
    const steps = column
      .filter(isStep)
      .sort((a, b) => (valueOf.get(b.id!) ?? 0) - (valueOf.get(a.id!) ?? 0));
    const over = steps.slice(perColumn).filter((n) => !n.startingNode);
    kept.push(...column.filter((n) => !over.includes(n)));
    if (!over.length) continue;
    let other = column.find((n) => n.eventType === 'OTHER');
    if (!other) {
      other = { id: nextId++, name: null, eventType: 'OTHER', depth: d };
      kept.push(other);
    }
    other.variants = (other.variants ?? 0) + over.length;
    for (const n of over) capMap.set(n.id!, other.id!);
  }
  links = mergeLinks(links, (id) => capMap.get(id) ?? id);

  const head = sharedHead(kept.filter(isPage).map((n) => n.name!));
  return { nodes: kept, links, head };
}
