import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { useStore } from 'App/mstore';
import { getPropertyName, topValuesKey } from 'App/mstore/filterStore';
import type { Filter } from 'App/mstore/types/filterConstants';
import { searchService } from 'App/services';

import { entryFromFilter } from './catalogue';
import type { CatalogueEntry, SearchFilter } from './types';

/** The project whose catalogue, properties and values the editor offers;
    unset means the active one. */
export const FilterProjectContext = createContext<string | undefined>(
  undefined,
);

/** Values a host knows better than the project's top values (a journey's own
    pages): listed first, matched locally while typing. */
export const ValueHintsContext = createContext<
  ((filter: SearchFilter) => readonly string[] | undefined) | undefined
>(undefined);

/** A list that is not the sessions search answers its own values (Logs from
    its facets); `share` there is its own, named by `shareLabel`. */
export interface ValueSource {
  options: (
    filter: SearchFilter,
    query: string,
    signal: AbortSignal,
  ) => Promise<ValueOption[]>;
  shareLabel?: (pct: number) => string;
}
export const ValueSourceContext = createContext<ValueSource | undefined>(
  undefined,
);

/** The project catalogue as picker entries; call inside an observer. */
export function useCatalogue(scope?: string[]): CatalogueEntry[] {
  const { filterStore } = useStore();
  const projectId = useContext(FilterProjectContext);
  const raw = scope
    ? filterStore.getScopedCurrentProjectFilters(scope, projectId)
    : filterStore.getCurrentProjectFilters(projectId);
  return useMemo(() => raw.map(entryFromFilter), [raw]);
}

/** An event's own properties, loaded when `enabled` turns on. */
export function useEventProperties(
  entry: CatalogueEntry,
  enabled: boolean,
): { entries: CatalogueEntry[]; loading: boolean } {
  const { filterStore } = useStore();
  const projectId = useContext(FilterProjectContext);
  const [entries, setEntries] = useState<CatalogueEntry[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setLoading(true);
    filterStore
      .getEventFilters(entry.id, projectId)
      .then((props: Filter[] | undefined) => {
        if (alive) setEntries((props ?? []).map(entryFromFilter));
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [enabled, entry.id, projectId]);
  return { entries, loading };
}

export interface ValueOption {
  value: string;
  label: string;
  /** 0..1 of sessions, when the backend reports it. */
  share?: number;
}

const toOption = (v: any): ValueOption => ({
  value: String(v.value),
  label: String(v.label ?? v.name ?? v.value),
  share: v.rowPercentage != null ? Number(v.rowPercentage) / 100 : undefined,
});

/**
 * Closed sets filter locally; open ones show top values and search the
 * autocomplete endpoint while typing.
 */
export function useValueOptions(
  filter: SearchFilter,
  query: string,
  open: boolean,
  live = false,
): { options: ValueOption[]; loading: boolean } {
  const { filterStore } = useStore();
  const projectId = useContext(FilterProjectContext);
  const hints = useContext(ValueHintsContext)?.(filter);
  const source = useContext(ValueSourceContext);
  const { entry } = filter;
  const [found, setFound] = useState<ValueOption[] | null>(null);
  const [own, setOwn] = useState<ValueOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const q = query.trim();

  useEffect(() => {
    if (!open || entry.options || entry.isEvent || source) return;
    void filterStore.fetchTopValues(entry.id, live, projectId);
  }, [open, entry.id, live, projectId]);

  useEffect(() => {
    if (!open || entry.options || !source) return undefined;
    const ctl = new AbortController();
    setLoading(true);
    // typing narrows locally, so only the first open asks
    source
      .options(filter, '', ctl.signal)
      .then((list) => !ctl.signal.aborted && setOwn(list))
      .catch(() => !ctl.signal.aborted && setOwn([]))
      .finally(() => !ctl.signal.aborted && setLoading(false));
    return () => ctl.abort();
  }, [open, entry.id, source]);

  useEffect(() => {
    if (!open || entry.options || !q || source) {
      setFound(null);
      return;
    }
    let alive = true;
    setLoading(true);
    const handle = setTimeout(() => {
      const params: Record<string, any> = {
        q,
        ac: entry.autoCaptured,
        live,
        source: entry.category,
      };
      if (!entry.isEvent)
        params.propertyName = getPropertyName(entry.source, live);
      if (filter.eventName) params.eventName = filter.eventName;
      searchService
        .fetchAutoCompleteValues(params, projectId)
        .then((data: any) => {
          const list = Array.isArray(data) ? data : (data?.events ?? []);
          if (alive) setFound(list.map(toOption));
        })
        .catch(() => alive && setFound([]))
        .finally(() => alive && setLoading(false));
    }, 400);
    return () => {
      alive = false;
      clearTimeout(handle);
    };
  }, [open, q, entry.id, projectId]);

  if (entry.options) {
    const lower = q.toLowerCase();
    return {
      options: entry.options.filter(
        (o) =>
          !lower ||
          o.label.toLowerCase().includes(lower) ||
          o.value.toLowerCase().includes(lower),
      ),
      loading: false,
    };
  }
  if (source) {
    const lower = q.toLowerCase();
    return {
      options: (own ?? []).filter(
        (o) =>
          !lower ||
          o.label.toLowerCase().includes(lower) ||
          o.value.toLowerCase().includes(lower),
      ),
      loading,
    };
  }
  if (hints?.length) {
    const lower = q.toLowerCase();
    const own = hints
      .filter((v) => !lower || v.toLowerCase().includes(lower))
      .map((v) => ({ value: v, label: v }));
    const rest = (found ?? []).filter((o) => !hints.includes(o.value));
    return { options: [...own, ...rest], loading };
  }
  if (found) return { options: found, loading };
  const top = (filterStore.topValues[topValuesKey(entry.id, live, projectId)] ??
    []) as any[];
  return { options: top.map(toOption), loading };
}
