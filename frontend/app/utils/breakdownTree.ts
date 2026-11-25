/**
 * Shared helpers for working with nested breakdown data trees.
 *
 * Data shape (leaf = Record<string, number> of timestamp→value):
 *   { "US": { "New York": { "ts1": 100 }, "LA": { "ts1": 50 } } }
 */

export type NestedData = Record<string, number> | { [key: string]: NestedData };

/** True when every value is a number (i.e. a leaf / timestamp map). */
export function isLeaf(obj: Record<string, any>): boolean {
  const firstVal = Object.values(obj)[0];
  return typeof firstVal === 'number';
}

/** Return the nesting depth (0 for a leaf). */
export function getDepth(obj: NestedData): number {
  const firstVal = Object.values(obj)[0];
  if (firstVal == null || typeof firstVal === 'number') return 0;
  return 1 + getDepth(firstVal as NestedData);
}

/** Recursively collect all timestamp keys into `set`. */
export function collectTimestamps(obj: NestedData, set: Set<string>): void {
  if (isLeaf(obj)) {
    Object.keys(obj).forEach((k) => set.add(k));
    return;
  }
  Object.values(obj).forEach((child) => {
    if (typeof child === 'object' && child !== null) {
      collectTimestamps(child as NestedData, set);
    }
  });
}

/** Recursively sum every numeric value in the tree. */
export function sumAll(obj: NestedData): number {
  if (isLeaf(obj)) {
    return Object.values(obj).reduce((s: number, v) => s + (v as number), 0);
  }
  return Object.values(obj).reduce(
    (s, child) => s + sumAll(child as NestedData),
    0,
  );
}

/**
 * Sort the top-level children of a breakdown node by total descending.
 * Preserves $overall at the top if present.
 */
export function sortByTotal(obj: NestedData): NestedData {
  if (isLeaf(obj)) return obj;
  const entries = Object.entries(obj);
  const overall = entries.filter(([k]) => k === '$overall');
  const rest = entries
    .filter(([k]) => k !== '$overall')
    .sort(([, a], [, b]) => sumAll(b as NestedData) - sumAll(a as NestedData));
  return Object.fromEntries([...overall, ...rest]);
}

/**
 * Recursively strip $overall keys from breakdown data,
 * keeping only the non-$overall branches for the datatable.
 */
export function stripOverall(
  obj: Record<string, any>,
): Record<string, any> | null {
  if (isLeaf(obj)) return obj;

  const result: Record<string, any> = {};
  Object.entries(obj).forEach(([key, child]) => {
    if (key === '$overall') return;
    if (typeof child === 'object' && child !== null) {
      const stripped = stripOverall(child);
      if (stripped) result[key] = stripped;
    }
  });
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Remap timestamp keys in a NestedData tree using a mapping object.
 * Leaves get their keys replaced; non-leaves recurse deeper.
 */
export function remapTimestamps(
  obj: NestedData,
  tsMap: Record<string, string>,
): NestedData {
  if (isLeaf(obj)) {
    const result: Record<string, number> = {};
    Object.entries(obj).forEach(([ts, val]) => {
      const newTs = tsMap[ts] ?? ts;
      result[newTs] = (result[newTs] ?? 0) + (val as number);
    });
    return result;
  }
  const result: Record<string, NestedData> = {};
  Object.entries(obj).forEach(([key, child]) => {
    result[key] = remapTimestamps(child as NestedData, tsMap);
  });
  return result;
}

/** Recursively collect only leaf-level lines, skipping $overall at every level. */
export function collectLeafLines(
  obj: Record<string, any>,
  prefix: string,
): { name: string; data: Record<string, number> }[] {
  if (isLeaf(obj)) {
    return [{ name: prefix, data: obj }];
  }

  const lines: { name: string; data: Record<string, number> }[] = [];
  Object.entries(obj).forEach(([key, child]) => {
    if (key === '$overall' || typeof child !== 'object' || child === null)
      return;
    const childPath = prefix ? `${prefix} / ${key}` : key;
    lines.push(...collectLeafLines(child, childPath));
  });
  return lines;
}

/**
 * Collect chart lines from a series node.
 * When breakdowns exist, returns only leaf-level paths (e.g. "Series 1 / CN / Wenzhou").
 * When no breakdowns, uses $overall as the series line.
 */
export function collectChartLines(
  obj: Record<string, any>,
  prefix: string,
): { name: string; data: Record<string, number> }[] {
  if (isLeaf(obj)) {
    return [{ name: prefix, data: obj }];
  }

  const lines: { name: string; data: Record<string, number> }[] = [];
  const breakdownKeys = Object.keys(obj).filter((k) => k !== '$overall');
  const hasBreakdowns = breakdownKeys.length > 0;

  if (hasBreakdowns) {
    breakdownKeys.forEach((key) => {
      const child = obj[key];
      if (typeof child !== 'object' || child === null) return;
      const childPath = prefix ? `${prefix} / ${key}` : key;
      lines.push(...collectLeafLines(child, childPath));
    });
  } else if (obj.$overall) {
    lines.push({ name: prefix, data: obj.$overall });
  }

  return lines;
}

/**
 * Build a tree mapping parentPath → sorted children with totals.
 * Root path is '' (empty string) whose children are the level-0 breakdown values.
 * Deeper paths use ' / ' separator matching the namesMap format.
 */
export function buildLevelTree(
  data: Record<string, NestedData>,
): Map<string, { key: string; total: number }[]> {
  const raw = new Map<string, Map<string, number>>();

  function addChildren(node: NestedData, parentPath: string) {
    if (isLeaf(node)) return;
    if (!raw.has(parentPath)) raw.set(parentPath, new Map());
    const childMap = raw.get(parentPath)!;
    Object.entries(node as Record<string, NestedData>).forEach(([key, child]) => {
      childMap.set(key, (childMap.get(key) ?? 0) + sumAll(child as NestedData));
      const childPath = parentPath ? `${parentPath} / ${key}` : key;
      addChildren(child as NestedData, childPath);
    });
  }

  Object.values(data).forEach((seriesData) => {
    addChildren(seriesData as NestedData, '');
  });

  const result = new Map<string, { key: string; total: number }[]>();
  raw.forEach((childMap, parentPath) => {
    result.set(
      parentPath,
      Array.from(childMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([key, total]) => ({ key, total })),
    );
  });
  return result;
}

/**
 * A selection keeping the n heaviest leaf combinations (n <= 0: all of them).
 * Paths off those combinations stay unset, so checking one back selects all
 * under it.
 */
export function selectTopLeaves(
  levelTree: Map<string, { key: string; total: number }[]>,
  depth: number,
  n: number,
): Record<string, string[] | null> {
  const leaves: { path: string[]; total: number }[] = [];
  const walk = (parent: string, path: string[]) => {
    (levelTree.get(parent) ?? []).forEach((c) => {
      const next = [...path, c.key];
      const at = parent ? `${parent} / ${c.key}` : c.key;
      if (next.length >= depth || !levelTree.has(at))
        leaves.push({ path: next, total: c.total });
      else walk(at, next);
    });
  };
  walk('', []);
  if (n <= 0 || leaves.length <= n) return { '': null };

  const picked: Record<string, string[]> = {};
  leaves
    .sort((a, b) => b.total - a.total)
    .slice(0, n)
    .forEach(({ path }) =>
      path.forEach((key, i) => {
        const parent = path.slice(0, i).join(' / ');
        const keys = (picked[parent] ??= []);
        if (!keys.includes(key)) keys.push(key);
      }),
    );
  return picked;
}
