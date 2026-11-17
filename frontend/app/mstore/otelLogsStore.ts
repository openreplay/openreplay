import { getRowsPerPage } from '@/ui/layout/rows-per-page';
import {
  makeAutoObservable,
  observable,
  observableRef,
  runInAction,
} from 'mobx';

import {
  DEFAULT_LOG_PRESET,
  EXPORT_LIMIT,
  type LogRule,
  type LogWindow,
  logFilter,
  rulesToFilter,
  sameRules,
  windowBounds,
} from 'App/components/Observability/logs-logic';
import type { Filter } from 'App/mstore/types/filterConstants';
import { ingestKeysService, otelLogsService } from 'App/services';
import { IngestKey } from 'App/services/IngestKeysService';
import {
  OTEL_LOGS_LIMITS,
  OtelAttributeFilter,
  OtelAttributeScope,
  OtelFacetValuesResponse,
  OtelFacetsResponse,
  OtelHistogramResponse,
  OtelLog,
  OtelLogsFilter,
  OtelValueCount,
} from 'App/services/OtelLogsService';

/** Relative ranges are re-anchored to now on every fetch. */
export type OtelLogsRange =
  { durationMs: number } | { start: number; end: number };

export interface LogView {
  id: string;
  name: string;
  rules: LogRule[];
}

export type LogsDisplay = 'data' | 'drill';

const isAbort = (e: any) => e?.name === 'AbortError';
const ruleOf = (f: Filter): LogRule => ({
  name: f.name,
  operator: f.operator ?? 'is',
  value: (f.value ?? []).map(String),
});
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export default class OtelLogsStore {
  range: OtelLogsRange = { durationMs: 15 * 60 * 1000 };
  query = '';
  services: string[] = [];
  severities: string[] = [];
  attributes: OtelAttributeFilter[] = [];
  pageSize: number = OTEL_LOGS_LIMITS.defaultPageSize;

  logs: OtelLog[] = [];
  nextCursor: string | null = null;
  histogram: OtelHistogramResponse | null = null;
  facets: OtelFacetsResponse | null = null;
  /** what the shown results were queried with; paging and facet values reuse it */
  appliedFilter: OtelLogsFilter | null = null;

  loading = false;
  /** a quiet refetch is out: the list stays as it is, paging waits */
  refreshing = false;
  loadingMore = false;
  histogramLoading = false;
  facetsLoading = false;
  error: string | null = null;

  ingestKeys: IngestKey[] = [];
  ingestKeysLoading = false;

  /* ── the Logs page ─────────────────────────────────────────────────── */
  rules: Filter[] = [];
  window: LogWindow = { preset: DEFAULT_LOG_PRESET };
  zoomStack: LogWindow[] = [];
  page = 1;
  display: LogsDisplay = 'data';
  columns: string[] = [];
  /** keys put on the rail; null keeps the defaults */
  facetKeys: string[] | null = null;
  railOpen = true;
  railWidth = 232;
  refreshEvery: number | null = null;
  paused = false;
  openId: string | null = null;
  /** an open line from outside the list (a related line, a link) */
  openExtra: OtelLog | null = null;
  /** the last rules came from outside the bar (rail, legend, drawer) */
  restCollapsed = false;
  newCount = 0;
  /** counts fetches: what was asked of the last one is stale after it */
  fetchSeq = 0;
  views: LogView[] = [];
  viewId: string | null = null;
  /** top values per rail key, for the applied filter */
  facetValueCache = observable.map<
    string,
    { values: OtelValueCount[]; loading: boolean; generation: number }
  >();

  /** builds a rule's chip label; the page sets it with its translations */
  labelOf: (key: string) => string = (key) => key;

  private controller: AbortController | null = null;
  private viewsKey: string | null = null;
  private generation = 0;

  constructor() {
    makeAutoObservable<OtelLogsStore, 'controller' | 'viewsKey' | 'generation'>(
      this,
      {
        controller: false,
        viewsKey: false,
        generation: false,
        rules: observableRef,
        window: observableRef,
        labelOf: false,
      },
    );
  }

  setRange = (range: OtelLogsRange) => {
    this.range = range;
  };

  setQuery = (query: string) => {
    this.query = query;
  };

  setServices = (services: string[]) => {
    this.services = services;
  };

  setSeverities = (severities: string[]) => {
    this.severities = severities;
  };

  setAttributes = (attributes: OtelAttributeFilter[]) => {
    this.attributes = attributes;
  };

  setPageSize = (size: number) => {
    this.pageSize = Math.min(Math.max(size, 1), OTEL_LOGS_LIMITS.maxPageSize);
  };

  buildFilter = (now = Date.now()): OtelLogsFilter => {
    const { range } = this;
    const [startTime, endTime] =
      'durationMs' in range
        ? [now - range.durationMs, now]
        : [range.start, range.end];
    return {
      startTime,
      endTime,
      query: this.query.trim(),
      services: this.services.slice(),
      severities: this.severities.slice(),
      attributes: this.attributes.map((a) => ({
        ...a,
        values: a.values.slice(),
      })),
    };
  };

  /** Runs search, histogram and facets for the current filter; aborts any in-flight run.
      `quiet` keeps what is shown until the new results land (auto-refresh). */
  fetch = async (quiet = false) => {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const filter = this.buildFilter();
    const { signal } = controller;

    this.appliedFilter = filter;
    this.error = null;
    this.loading = !quiet;
    this.refreshing = quiet;
    this.newCount = 0;
    this.generation += 1;
    this.fetchSeq += 1;
    if (!quiet) {
      this.logs = [];
      this.nextCursor = null;
      this.histogramLoading = true;
      this.facetsLoading = true;
      this.facetValueCache.clear();
    }

    const current = () => this.controller === controller;
    const fail = (e: any) => {
      if (isAbort(e) || !current()) return;
      runInAction(() => {
        if (!this.error) this.error = e?.message ?? 'Failed to load logs';
      });
    };

    await Promise.all([
      otelLogsService
        .search({ ...filter, limit: this.pageSize }, signal)
        .then((r) => {
          if (!current()) return;
          runInAction(() => {
            this.logs = r.logs;
            this.nextCursor = r.nextCursor;
          });
        })
        .catch(fail)
        .finally(() => {
          if (current())
            runInAction(() => {
              this.loading = false;
              this.refreshing = false;
            });
        }),
      otelLogsService
        .histogram(filter, signal)
        .then((r) => {
          if (current()) runInAction(() => (this.histogram = r));
        })
        .catch(fail)
        .finally(() => {
          if (current()) runInAction(() => (this.histogramLoading = false));
        }),
      otelLogsService
        .facets(filter, signal)
        .then((r) => {
          if (current()) runInAction(() => (this.facets = r));
        })
        .catch(fail)
        .finally(() => {
          if (current()) runInAction(() => (this.facetsLoading = false));
        }),
    ]);
  };

  /** Next page of the applied filter; no-op while loading or at the end. */
  loadMore = async (limit: number = this.pageSize) => {
    const { appliedFilter, nextCursor, controller } = this;
    if (
      !appliedFilter ||
      !nextCursor ||
      !controller ||
      this.loading ||
      this.refreshing ||
      this.loadingMore
    ) {
      return;
    }
    this.loadingMore = true;
    try {
      const r = await otelLogsService.search(
        {
          ...appliedFilter,
          limit: Math.min(Math.max(limit, 1), OTEL_LOGS_LIMITS.maxPageSize),
          cursor: nextCursor,
        },
        controller.signal,
      );
      if (this.controller !== controller) return;
      runInAction(() => {
        this.logs = this.logs.concat(r.logs);
        this.nextCursor = r.nextCursor;
      });
    } catch (e: any) {
      if (isAbort(e) || this.controller !== controller) return;
      runInAction(() => {
        this.error = e?.message ?? 'Failed to load logs';
      });
    } finally {
      if (this.controller === controller) {
        runInAction(() => (this.loadingMore = false));
      }
    }
  };

  /** Loads pages until `count` lines are held (or the list ends). */
  ensure = async (count: number) => {
    const want = Math.min(count, EXPORT_LIMIT);
    const controller = this.controller;
    while (
      this.controller === controller &&
      this.logs.length < want &&
      this.nextCursor &&
      !this.error
    ) {
      if (this.loading || this.refreshing || this.loadingMore) {
        await new Promise((r) => setTimeout(r, 50));
        continue;
      }
      await this.loadMore(want - this.logs.length);
    }
  };

  /** For value pickers/autocomplete; scoped to the applied filter so counts match the list. */
  fetchFacetValues = (
    scope: OtelAttributeScope,
    key: string,
    signal?: AbortSignal,
  ): Promise<OtelFacetValuesResponse> =>
    otelLogsService.facetValues(
      this.appliedFilter ?? this.buildFilter(),
      scope,
      key,
      signal,
    );

  /** Drops results and filters, e.g. on project switch. */
  reset = () => {
    this.controller?.abort();
    this.controller = null;
    this.query = '';
    this.services = [];
    this.severities = [];
    this.attributes = [];
    this.logs = [];
    this.nextCursor = null;
    this.histogram = null;
    this.facets = null;
    this.appliedFilter = null;
    this.loading = false;
    this.refreshing = false;
    this.loadingMore = false;
    this.histogramLoading = false;
    this.facetsLoading = false;
    this.error = null;
    this.ingestKeys = [];
    this.rules = [];
    this.window = { preset: DEFAULT_LOG_PRESET };
    this.zoomStack = [];
    this.page = 1;
    this.openId = null;
    this.newCount = 0;
    this.viewId = null;
    this.views = [];
    this.viewsKey = null;
    this.facetKeys = null;
    this.facetValueCache.clear();
  };

  /* ── the Logs page: query ──────────────────────────────────────────── */

  get ruleList(): LogRule[] {
    return this.rules.map(ruleOf);
  }

  /** what a fetch depends on; the page refetches when it changes */
  get signature(): string {
    return JSON.stringify([this.window, this.ruleList]);
  }

  /** applies the rules and window, then fetches the first page */
  run = (now = Date.now(), quiet = false) => {
    const parts = rulesToFilter(this.ruleList);
    this.query = parts.query;
    this.services = parts.services;
    this.severities = parts.severities;
    this.attributes = parts.attributes;
    const b = windowBounds(this.window, now);
    this.range =
      'preset' in this.window
        ? { durationMs: b.to - b.from }
        : { start: b.from, end: b.to };
    this.page = 1;
    this.pageSize = Math.min(
      getRowsPerPage('logs'),
      OTEL_LOGS_LIMITS.maxPageSize,
    );
    return this.fetch(quiet);
  };

  setRules = (rules: Filter[], outside = false) => {
    this.rules = rules;
    this.restCollapsed = outside;
  };

  clearRules = () => {
    this.setRules([]);
    this.viewId = null;
  };

  setWindow = (w: LogWindow) => {
    this.zoomStack = [];
    this.window = w;
  };

  narrowWindow = (w: LogWindow) => {
    this.zoomStack = [...this.zoomStack, this.window];
    this.window = w;
  };

  zoomOut = () => {
    const prev = this.zoomStack[this.zoomStack.length - 1];
    if (!prev) return;
    this.zoomStack = this.zoomStack.slice(0, -1);
    this.window = prev;
  };

  get zoomBack(): LogWindow | null {
    return this.zoomStack[this.zoomStack.length - 1] ?? null;
  }

  private ruleFor = (key: string, operator = 'is') =>
    this.rules.find((r) => r.name === key && r.operator === operator);

  /** ticked values of a key: its `is` rule */
  valuesOn = (key: string): string[] =>
    (this.ruleFor(key)?.value ?? []).map(String);

  /** a rail tick or a legend click: adds or drops `value` in the key's `is` rule */
  toggleValue = (
    key: string,
    value: string,
    mode: 'toggle' | 'add' = 'toggle',
  ) => {
    const r = this.ruleFor(key);
    if (!r) {
      this.setRules(
        [
          ...this.rules,
          { ...logFilter(key, this.labelOf(key)), value: [value] },
        ],
        true,
      );
      return;
    }
    const vals = (r.value ?? []).map(String);
    const on = vals.some((v) => same(v, value));
    if (on && mode === 'add') return;
    const next = on ? vals.filter((v) => !same(v, value)) : [...vals, value];
    this.setRules(
      next.length
        ? this.rules.map((x) => (x === r ? { ...x, value: next } : x))
        : this.rules.filter((x) => x !== r),
      true,
    );
  };

  /** sets several values of a key's `is` rule at once (a legend level) */
  setValues = (key: string, values: string[]) => {
    const r = this.ruleFor(key);
    const rest = this.rules.filter((x) => x !== r);
    this.setRules(
      values.length
        ? r
          ? this.rules.map((x) => (x === r ? { ...x, value: values } : x))
          : [...rest, { ...logFilter(key, this.labelOf(key)), value: values }]
        : rest,
      true,
    );
  };

  clearFacet = (key: string) => {
    this.setRules(
      this.rules.filter((r) => !(r.name === key && r.operator === 'is')),
      true,
    );
  };

  /** Filter by / Exclude from the drawer and the drilldown; `is` and
      `isNot` of one value exclude each other */
  setTerm = (
    key: string,
    value: string,
    operator: 'is' | 'isNot',
    on: boolean,
  ) => {
    const without = (rs: Filter[], o: string) =>
      rs.flatMap((r) => {
        const vals = (r.value ?? []).map(String);
        if (
          r.name !== key ||
          r.operator !== o ||
          !vals.some((v) => same(v, value))
        )
          return [r];
        const rest = vals.filter((v) => !same(v, value));
        return rest.length ? [{ ...r, value: rest }] : [];
      });
    if (!on) {
      this.setRules(without(this.rules, operator), true);
      return;
    }
    const next = without(this.rules, operator === 'is' ? 'isNot' : 'is');
    const r = next.find((x) => x.name === key && x.operator === operator);
    if (!r) {
      this.setRules(
        [
          ...next,
          { ...logFilter(key, this.labelOf(key)), operator, value: [value] },
        ],
        true,
      );
      return;
    }
    const vals = (r.value ?? []).map(String);
    this.setRules(
      vals.some((v) => same(v, value))
        ? next
        : next.map((x) => (x === r ? { ...x, value: [...vals, value] } : x)),
      true,
    );
  };

  /** which way a value is in the search: 'in', 'out' or neither */
  termState = (key: string, value: string): 'in' | 'out' | undefined => {
    const has = (o: string) =>
      this.rules.some(
        (r) =>
          r.name === key &&
          r.operator === o &&
          (r.value ?? []).some((v) => same(String(v), value)),
      );
    return has('is') ? 'in' : has('isNot') ? 'out' : undefined;
  };

  /* ── the Logs page: list ───────────────────────────────────────────── */

  /** histogram sum; exact once the last page is in */
  get total(): number {
    if (!this.loading && !this.nextCursor) return this.logs.length;
    const sum = (this.histogram?.buckets ?? []).reduce(
      (s, b) => s + b.total,
      0,
    );
    return Math.max(sum, this.logs.length);
  }

  get pageRows(): OtelLog[] {
    const from = (this.page - 1) * this.pageSize;
    return this.logs.slice(from, from + this.pageSize);
  }

  setPage = (page: number) => {
    this.page = Math.max(1, page);
    void this.ensure(this.page * this.pageSize);
  };

  /** Fit or a rows choice changed the page size */
  resize = (size: number) => {
    const s = Math.min(Math.max(size, 1), OTEL_LOGS_LIMITS.maxPageSize);
    if (s === this.pageSize) return;
    // the first line on screen stays on the page shown
    const first = (this.page - 1) * this.pageSize;
    this.pageSize = s;
    this.page = Math.floor(first / s) + 1;
    void this.ensure(this.page * s);
  };

  setDisplay = (d: LogsDisplay) => {
    this.display = d;
  };

  toggleColumn = (key: string) => {
    this.columns = this.columns.includes(key)
      ? this.columns.filter((c) => c !== key)
      : [...this.columns, key];
  };

  resetColumns = () => {
    this.columns = [];
  };

  setRail = (open: boolean) => {
    this.railOpen = open;
  };

  setRailWidth = (w: number) => {
    this.railWidth = w;
  };

  setFacetKeys = (keys: string[]) => {
    this.facetKeys = keys;
  };

  /** top values of rail keys for the applied filter, once per fetch */
  loadFacetValues = (keys: readonly string[]) => {
    const generation = this.generation;
    for (const key of keys) {
      if (key === 'service' || key === 'level') continue;
      const held = this.facetValueCache.get(key);
      if (held?.generation === generation || !this.appliedFilter) continue;
      const scope: OtelAttributeScope | null = key.startsWith('attr.')
        ? 'log'
        : key.startsWith('res.')
          ? 'resource'
          : null;
      if (!scope) continue;
      // a quiet refresh keeps the last values on screen meanwhile
      this.facetValueCache.set(key, {
        values: held?.values ?? [],
        loading: !held,
        generation,
      });
      this.fetchFacetValues(scope, key.slice(scope === 'log' ? 5 : 4))
        .then((r) => {
          if (generation !== this.generation) return;
          runInAction(() =>
            this.facetValueCache.set(key, {
              values: r.values,
              loading: false,
              generation,
            }),
          );
        })
        .catch(() => {
          if (generation !== this.generation) return;
          runInAction(() =>
            this.facetValueCache.set(key, {
              values: held?.values ?? [],
              loading: false,
              generation,
            }),
          );
        });
    }
  };

  /** a key's values with counts: service and level from the facets */
  facetValuesOf = (
    key: string,
  ): { values: OtelValueCount[]; loading: boolean } => {
    if (key === 'service')
      return {
        values: this.facets?.services ?? [],
        loading: this.facetsLoading,
      };
    if (key === 'level') {
      const m = new Map<string, number>();
      for (const s of this.facets?.severities ?? []) {
        const v = s.value.toLowerCase();
        m.set(v, (m.get(v) ?? 0) + s.count);
      }
      return {
        values: [...m].map(([value, count]) => ({ value, count })),
        loading: this.facetsLoading,
      };
    }
    return this.facetValueCache.get(key) ?? { values: [], loading: false };
  };

  /* ── the Logs page: refresh ────────────────────────────────────────── */

  setRefresh = (every: number | null) => {
    this.refreshEvery = every;
    this.paused = false;
  };

  setPaused = (paused: boolean) => {
    this.paused = paused;
  };

  /** a tick: page one with nothing open refetches, anything else counts
      what arrived since and offers it */
  tick = () => {
    if (!('preset' in this.window)) return;
    if (this.page === 1 && !this.openId) {
      void this.run(Date.now(), true);
      return;
    }
    void this.countNew();
  };

  countNew = async () => {
    const applied = this.appliedFilter;
    if (!applied) return;
    try {
      const r = await otelLogsService.histogram({
        ...applied,
        startTime: applied.endTime,
        endTime: Date.now(),
      });
      if (this.appliedFilter !== applied) return;
      runInAction(() => {
        this.newCount = r.buckets.reduce((s, b) => s + b.total, 0);
      });
    } catch {
      /* the next tick asks again */
    }
  };

  showNew = () => {
    this.newCount = 0;
    this.openId = null;
    void this.run();
  };

  /* ── the Logs page: the open line ──────────────────────────────────── */

  get openLine(): OtelLog | null {
    if (!this.openId) return null;
    return (
      this.logs.find((l) => l.id === this.openId) ??
      (this.openExtra?.id === this.openId ? this.openExtra : null)
    );
  }

  get openIndex(): number {
    return this.openId ? this.logs.findIndex((l) => l.id === this.openId) : -1;
  }

  open = (id: string | null) => {
    this.openId = id;
  };

  openLog = (log: OtelLog) => {
    this.openExtra = this.logs.some((l) => l.id === log.id) ? null : log;
    this.openId = log.id;
  };

  /** steps through the list, loading the next page at its end */
  step = async (dir: 1 | -1) => {
    const i = this.openIndex;
    if (i < 0) return;
    if (dir === 1 && i === this.logs.length - 1) await this.loadMore();
    const next = this.logs[i + dir];
    if (next)
      runInAction(() => {
        this.openId = next.id;
        const page = Math.floor((i + dir) / this.pageSize) + 1;
        if (page !== this.page) this.page = page;
      });
  };

  /** lines around one, from a search of their own (the list stays put) */
  related = async (
    log: OtelLog,
    at: number,
    spanMs: number,
    match: 'service' | 'pod' | 'all',
    signal?: AbortSignal,
  ): Promise<OtelLog[]> => {
    const pod = log.resourceAttributes?.['k8s.pod.name'];
    const r = await otelLogsService.search(
      {
        startTime: at - spanMs,
        endTime: at + spanMs + 1,
        services: match === 'service' ? [log.serviceName] : [],
        attributes:
          match === 'pod' && pod
            ? [
                {
                  scope: 'resource',
                  key: 'k8s.pod.name',
                  op: 'is',
                  values: [pod],
                },
              ]
            : [],
        limit: 301,
      },
      signal,
    );
    return r.logs;
  };

  /* ── the Logs page: views ──────────────────────────────────────────── */

  /** views live in this browser, per person and project */
  loadViews = (userId: string | number, siteId: string) => {
    const key = `__or_logs_views:${userId}:${siteId}`;
    if (this.viewsKey === key) return;
    this.viewsKey = key;
    this.viewId = null;
    try {
      const raw = localStorage.getItem(key);
      this.views = raw ? JSON.parse(raw) : [];
    } catch {
      this.views = [];
    }
  };

  private persistViews = () => {
    if (!this.viewsKey) return;
    try {
      localStorage.setItem(this.viewsKey, JSON.stringify(this.views));
    } catch {
      /* private mode: views last the session */
    }
  };

  get view(): LogView | null {
    return this.views.find((v) => v.id === this.viewId) ?? null;
  }

  get viewEdited(): boolean {
    return this.view != null && !sameRules(this.view.rules, this.ruleList);
  }

  applyView = (id: string) => {
    const v = this.views.find((x) => x.id === id);
    if (!v) return;
    this.setRules(
      v.rules.map((r) => ({
        ...logFilter(r.name, this.labelOf(r.name)),
        operator: r.operator,
        value: [...r.value],
      })),
      true,
    );
    this.viewId = id;
  };

  saveView = (name: string) => {
    const id = `view-${Date.now().toString(36)}`;
    this.views = [...this.views, { id, name, rules: this.ruleList }];
    this.viewId = id;
    this.persistViews();
  };

  updateView = () => {
    if (!this.viewId) return;
    this.views = this.views.map((v) =>
      v.id === this.viewId ? { ...v, rules: this.ruleList } : v,
    );
    this.persistViews();
  };

  deleteView = () => {
    if (!this.viewId) return;
    this.views = this.views.filter((v) => v.id !== this.viewId);
    this.viewId = null;
    this.persistViews();
  };

  closeView = () => {
    this.viewId = null;
  };

  /* ── ingest keys ───────────────────────────────────────────────────── */

  fetchIngestKeys = async () => {
    this.ingestKeysLoading = true;
    try {
      const keys = await ingestKeysService.list();
      runInAction(() => (this.ingestKeys = keys));
    } finally {
      runInAction(() => (this.ingestKeysLoading = false));
    }
  };

  /** Returns the key with its secret; the stored copy drops it since the API never returns it again. */
  createIngestKey = async (name: string): Promise<IngestKey> => {
    const created = await ingestKeysService.create(name.trim());
    runInAction(() => {
      this.ingestKeys = [{ ...created, key: undefined }, ...this.ingestKeys];
    });
    return created;
  };

  revokeIngestKey = async (keyId: number) => {
    await ingestKeysService.revoke(keyId);
    const revokedAt = new Date().toISOString();
    runInAction(() => {
      this.ingestKeys = this.ingestKeys.map((k) =>
        k.keyId === keyId ? { ...k, revokedAt } : k,
      );
    });
  };
}
