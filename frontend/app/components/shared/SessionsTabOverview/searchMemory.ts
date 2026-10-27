import { useSyncExternalStore } from 'react';

import type { CatalogueEntry } from 'Shared/FilterEditor/types';

/** Per user and project, in this browser: the last search with complete
    rules, the last segment used or saved, and how often each entry was added. */
export interface SearchMemory {
  last: { filters: any[]; eventsOrder: string } | null;
  lastSegmentId: string | null;
  uses: Record<string, number>;
}

const EMPTY: SearchMemory = { last: null, lastSegmentId: null, uses: {} };
const cache = new Map<string, SearchMemory>();
const listeners = new Set<() => void>();
const storageKey = (scope: string) => `__or_search_memory:${scope}`;

function read(scope: string): SearchMemory {
  const hit = cache.get(scope);
  if (hit) return hit;
  let m = EMPTY;
  try {
    const raw = localStorage.getItem(storageKey(scope));
    if (raw) m = { ...EMPTY, ...JSON.parse(raw) };
  } catch {}
  cache.set(scope, m);
  return m;
}

function write(scope: string, patch: Partial<SearchMemory>) {
  const next = { ...read(scope), ...patch };
  cache.set(scope, next);
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useSearchMemory(scope: string): SearchMemory {
  return useSyncExternalStore(subscribe, () => read(scope));
}

export function rememberSearch(
  scope: string,
  filters: any[],
  eventsOrder: string,
) {
  if (!filters.length) return;
  const last = { filters, eventsOrder };
  if (JSON.stringify(last) === JSON.stringify(read(scope).last)) return;
  write(scope, { last });
}

export function rememberSegment(scope: string, id: string) {
  if (read(scope).lastSegmentId !== id) write(scope, { lastSegmentId: id });
}

export function countUse(scope: string, entryId: string) {
  const { uses } = read(scope);
  write(scope, { uses: { ...uses, [entryId]: (uses[entryId] ?? 0) + 1 } });
}

const DEFAULT_USUAL: ((e: CatalogueEntry) => boolean)[] = [
  (e) => !e.isEvent && e.name === 'userId',
  (e) => e.category === 'metadata',
  (e) => e.isEvent && e.name === 'LOCATION',
];

/** The entries this person adds most, topped up with User ID, the first
    metadata key and Page. */
export function usualEntries(
  m: SearchMemory,
  entries: readonly CatalogueEntry[],
  n = 3,
): CatalogueEntry[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const mine = Object.entries(m.uses)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId.get(id))
    .filter((e): e is CatalogueEntry => e != null);
  const defaults = DEFAULT_USUAL.map((is) => entries.find(is)).filter(
    (e): e is CatalogueEntry => e != null,
  );
  return [...new Set([...mine, ...defaults])].slice(0, n);
}
