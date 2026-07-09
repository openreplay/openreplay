import { filterStore } from 'App/mstore';
import { filterPool, MOCK_SESSION_POOL } from 'App/dev/mockSessions';
import type { SegmentFilterSeed } from 'App/mstore/issuesStore';

/* Shared segment helpers — used by the create/edit drawer (Issues + Data
   Management) and the "Add segment" picker (fresh estimate on enable). */

// how much the agent samples per day, project-wide (Mehdi: ~100 of ~2,000)
export const DAILY_TRAFFIC = 2000;

/** serialize the live omni-search filters into a plain, re-hydratable shape */
export function serialize(filters: any[]): SegmentFilterSeed[] {
  return filters.map((f) => ({
    name: f.name,
    isEvent: !!f.isEvent,
    autoCaptured: f.autoCaptured,
    operator: f.operator,
    value: [...(f.value ?? [])].filter((v) => v != null),
  }));
}

/** rebuild real catalog filters from seeds (the mockBootstrap findEvent pattern) */
export function hydrate(seeds: SegmentFilterSeed[]): any[] {
  return seeds
    .map((s) => {
      const found = filterStore.findEvent({
        name: s.name,
        isEvent: s.isEvent,
        autoCaptured: s.autoCaptured,
      });
      if (!found) return null;
      return {
        ...found,
        value: [...s.value],
        operator: s.operator ?? found.operator,
        filters: [],
      };
    })
    .filter(Boolean);
}

/** one-line human summary of the query, for popover rows and DM tooltips */
export function summarize(filters: any[]): string {
  if (!filters.length) return 'All traffic';
  return filters
    .map((f) => {
      const label = f.displayName || f.label || f.name;
      const vals = (f.value ?? []).filter((v: any) => v !== '' && v != null);
      return vals.length
        ? `${label} ${f.operator ?? '='} ${vals.join(', ')}`
        : label;
    })
    .join(' · ');
}

/** traffic share + sessions/day for a query, over the shared mock pool —
    seeds carry exactly the fields filterPool's matcher reads, so they can be
    evaluated directly, no hydration */
export function estimateFromSeeds(seeds: SegmentFilterSeed[]): {
  pct: number;
  perDay: number;
} {
  const { total } = filterPool({ filters: seeds, page: 1, limit: 1 });
  const poolSize = MOCK_SESSION_POOL.length || 1;
  const pct = Math.max(total > 0 ? 1 : 0, Math.round((total / poolSize) * 100));
  const perDay = Math.round((DAILY_TRAFFIC * total) / poolSize);
  return { pct, perDay };
}
