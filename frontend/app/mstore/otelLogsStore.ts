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
  type LogsLink,
  NO_SERVICE,
  RELATED_SIDE,
  SearchChangedError,
  filtersParam,
  logFilter,
  rulesToFilter,
  sameRules,
  sameValue,
  textSearchLimit,
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
  otelLogTimeMs,
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
/** pages of related lines asked at most, in a busy window */
const RELATED_PAGES = 10;
const ruleOf = (f: Filter): LogRule => ({
  name: f.name,
  operator: f.operator ?? 'is',
  value: (f.value ?? []).map(String),
});
const CHART_KEY = '__or_logs_chart';
const storedChartOpen = () => {
  try {
    return localStorage.getItem(CHART_KEY) !== '0';
  } catch {
    return true;
  }
};

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
  exporting = false;
  private exportJob = 0;
  histogramLoading = false;
  facetsLoading = false;
  /** the list request failed: what is held, if anything, is from the
      window before, so nothing pages or exports from it */
  listError: string | null = null;
  chartFailed = false;
  facetsFailed = false;
  /** the window came back empty with no filters and so did the past 30 days */
  neverSent = false;
  /** a page past the first failed; asking again is safe */
  pageError: string | null = null;

  ingestKeys: IngestKey[] = [];
  ingestKeysLoading = false;

  /* ── the Logs page ─────────────────────────────────────────────────── */
  rules: Filter[] = [];
  window: LogWindow = { preset: DEFAULT_LOG_PRESET };
  zoomStack: LogWindow[] = [];
  page = 1;
  display: LogsDisplay = 'data';
  columns: string[] = [];
  formatJson = true;
  /** keys put on the rail; null keeps the defaults */
  facetKeys: string[] | null = null;
  railOpen = true;
  railWidth = 232;
  chartOpen = storedChartOpen();
  refreshEvery: number | null = null;
  paused = false;
  openId: string | null = null;
  /** an open line from outside the list (a related line, a link) */
  openExtra: OtelLog | null = null;
  /** a link's line is being looked up at this time */
  seekAt: number | null = null;
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
    {
      values: OtelValueCount[];
      loading: boolean;
      failed?: boolean;
      generation: number;
    }
  >();

  /** builds a rule's chip label; the page sets it with its translations */
  labelOf: (key: string) => string = (key) => key;

  private controller: AbortController | null = null;
  /** every request of the last run has answered */
  private landed = true;
  private counting = false;
  private viewsKey: string | null = null;
  private generation = 0;
  private keysSeq = 0;

  constructor() {
    makeAutoObservable<
      OtelLogsStore,
      | 'controller'
      | 'landed'
      | 'counting'
      | 'viewsKey'
      | 'generation'
      | 'keysSeq'
      | 'exportJob'
    >(this, {
      controller: false,
      exportJob: false,
      landed: false,
      counting: false,
      viewsKey: false,
      generation: false,
      keysSeq: false,
      rules: observableRef,
      window: observableRef,
      labelOf: false,
    });
  }

  setRange = (range: OtelLogsRange) => {
    this.range = range;
  };

  setQuery = (query: string) => {
    this.query = query;
  };

  setSeverities = (severities: string[]) => {
    this.severities = severities;
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

  get searchFailed(): boolean {
    return this.listError != null;
  }

  /** Runs search, histogram and facets for the current filter; aborts any in-flight run.
      `quiet` keeps what is shown, each part's failure too, until the new
      results land (auto-refresh). */
  fetch = async (quiet = false) => {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.landed = false;
    const filter = this.buildFilter();

    this.appliedFilter = filter;
    this.pageError = null;
    this.loading = !quiet;
    this.refreshing = quiet;
    // a page in flight belongs to the aborted run and never clears this
    this.loadingMore = false;
    this.newCount = 0;
    this.generation += 1;
    this.fetchSeq += 1;
    if (!quiet) {
      this.listError = null;
      this.chartFailed = false;
      this.facetsFailed = false;
      this.neverSent = false;
      this.logs = [];
      this.nextCursor = null;
      this.histogramLoading = true;
      this.facetsLoading = true;
      this.facetValueCache.clear();
    }

    await Promise.all([
      this.askList(filter, controller, quiet),
      this.askChart(filter, controller),
      this.askFacets(filter, controller),
    ]);
    if (this.controller === controller) this.landed = true;
  };

  private askList = (
    filter: OtelLogsFilter,
    controller: AbortController,
    quiet: boolean,
  ) => {
    const current = () => this.controller === controller;
    return otelLogsService
      .search({ ...filter, limit: this.pageSize }, controller.signal)
      .then(async (r) => {
        const probe =
          !quiet &&
          r.logs.length === 0 &&
          !filter.query &&
          !filter.services?.length &&
          !filter.severities?.length &&
          !filter.attributes?.length;
        const neverSent =
          probe && (await this.nothingSentBy(Date.now(), controller.signal));
        if (!current()) return;
        runInAction(() => {
          this.logs = r.logs;
          this.nextCursor = r.nextCursor;
          this.listError = null;
          if (!quiet || r.logs.length) this.neverSent = neverSent;
        });
      })
      .catch((e) => {
        if (isAbort(e) || !current()) return;
        runInAction(() => {
          this.listError = e?.message ?? 'Failed to load logs';
        });
      })
      .finally(() => {
        if (current())
          runInAction(() => {
            this.loading = false;
            this.refreshing = false;
          });
      });
  };

  /** no line over the longest window the API allows; an unanswered ask
      claims nothing */
  private nothingSentBy = (now: number, signal: AbortSignal) =>
    otelLogsService
      .search(
        {
          startTime: now - OTEL_LOGS_LIMITS.maxRangeMs,
          endTime: now,
          limit: 1,
        },
        signal,
      )
      .then(
        (r) => r.logs.length === 0,
        () => false,
      );

  private askChart = (filter: OtelLogsFilter, controller: AbortController) => {
    const current = () => this.controller === controller;
    return otelLogsService
      .histogram(filter, controller.signal)
      .then((r) => {
        if (!current()) return;
        runInAction(() => {
          this.histogram = r;
          this.chartFailed = false;
        });
      })
      .catch((e) => {
        if (isAbort(e) || !current()) return;
        // the one held counts another window
        runInAction(() => {
          this.histogram = null;
          this.chartFailed = true;
        });
      })
      .finally(() => {
        if (current()) runInAction(() => (this.histogramLoading = false));
      });
  };

  private askFacets = (filter: OtelLogsFilter, controller: AbortController) => {
    const current = () => this.controller === controller;
    return otelLogsService
      .facets(filter, controller.signal)
      .then((r) => {
        if (!current()) return;
        runInAction(() => {
          this.facets = r;
          this.facetsFailed = false;
        });
      })
      .catch((e) => {
        if (isAbort(e) || !current()) return;
        runInAction(() => (this.facetsFailed = true));
      })
      .finally(() => {
        if (current()) runInAction(() => (this.facetsLoading = false));
      });
  };

  /** the chart or the facets of the shown lines failed: asks that part again */
  retryPart = (part: 'chart' | 'facets') => {
    const { appliedFilter, controller } = this;
    if (!appliedFilter || !controller) return;
    if (part === 'chart') {
      this.chartFailed = false;
      this.histogramLoading = true;
      void this.askChart(appliedFilter, controller);
    } else {
      this.facetsFailed = false;
      this.facetsLoading = true;
      void this.askFacets(appliedFilter, controller);
    }
  };

  /** Next page of the applied filter; no-op while loading or at the end.
      After a failed search the held cursor is from the filter before, so
      nothing pages until a search succeeds. */
  loadMore = async (limit: number = this.pageSize) => {
    const { appliedFilter, nextCursor, controller } = this;
    if (
      !appliedFilter ||
      !nextCursor ||
      !controller ||
      this.searchFailed ||
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
        this.pageError = e?.message ?? 'Failed to load logs';
      });
    } finally {
      if (this.controller === controller) {
        runInAction(() => (this.loadingMore = false));
      }
    }
  };

  /** Every line up to the export limit; refresh ticks wait meanwhile so the
      pages are not swapped out under it. A failed list request refuses:
      what is held is from the window before. A failed histogram or facets
      request does not touch the lines. An abort stops it after the page out. */
  collectExport = async (signal?: AbortSignal): Promise<OtelLog[]> => {
    const job = ++this.exportJob;
    this.exporting = true;
    // an earlier failed page would stop ensure() before it asks again
    this.pageError = null;
    const { controller } = this;
    try {
      await this.ensure(EXPORT_LIMIT, signal);
      if (signal?.aborted) throw signal.reason;
      if (this.controller !== controller)
        throw new SearchChangedError('The search changed while exporting');
      const failed = this.listError ?? this.pageError;
      if (failed) throw new Error(failed);
      return this.logs;
    } finally {
      // a cancelled export can settle after the next one started
      if (this.exportJob === job) runInAction(() => (this.exporting = false));
    }
  };

  /** the page past the loaded lines failed: asks for it again */
  retryPage = () => {
    this.pageError = null;
    void this.ensure(this.page * this.pageSize);
  };

  /** Loads pages until `count` lines are held (or the list ends). */
  ensure = async (count: number, signal?: AbortSignal) => {
    const want = Math.min(count, EXPORT_LIMIT);
    const controller = this.controller;
    while (this.controller === controller && !signal?.aborted) {
      // a search still out decides the cursor: read it once it lands
      if (this.loading || this.refreshing || this.loadingMore) {
        await new Promise((r) => setTimeout(r, 50));
        continue;
      }
      if (
        this.logs.length >= want ||
        !this.nextCursor ||
        this.searchFailed ||
        this.pageError
      )
        return;
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
    this.landed = true;
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
    this.listError = null;
    this.chartFailed = false;
    this.facetsFailed = false;
    this.neverSent = false;
    this.pageError = null;
    this.ingestKeys = [];
    this.rules = [];
    this.window = { preset: DEFAULT_LOG_PRESET };
    this.zoomStack = [];
    this.page = 1;
    this.openId = null;
    this.seekAt = null;
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

  get link(): LogsLink {
    return { window: this.window, rules: this.ruleList, line: this.lineRef };
  }

  /** returns the line's lookup when the link's line isn't held */
  applyLink = (link: LogsLink): Promise<boolean> | null => {
    if (JSON.stringify(link.window) !== JSON.stringify(this.window))
      this.setWindow(link.window);
    if (filtersParam(link.rules) !== filtersParam(this.ruleList)) {
      this.setRules(this.filtersOf(link.rules), true);
      this.viewId = null;
    }
    const line = this.lineRef;
    if (link.line?.id === line?.id) return null;
    if (!link.line) {
      this.open(null);
      return null;
    }
    return this.seekLine(link.line.id, link.line.at);
  };

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

  /** typed text in the search: a message rule of its own, so a second
      search narrows the first */
  searchText = (text: string) => {
    const value = text.trim();
    if (!value || textSearchLimit(this.ruleList, value)) return;
    this.setRules([
      ...this.rules,
      { ...logFilter('message', this.labelOf('message')), value: [value] },
    ]);
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
    const on = vals.some((v) => sameValue(key, v, value));
    if (on && mode === 'add') return;
    const next = on
      ? vals.filter((v) => !sameValue(key, v, value))
      : [...vals, value];
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
          !vals.some((v) => sameValue(key, v, value))
        )
          return [r];
        const rest = vals.filter((v) => !sameValue(key, v, value));
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
      vals.some((v) => sameValue(key, v, value))
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
          (r.value ?? []).some((v) => sameValue(key, String(v), value)),
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

  /** false while more pages exist and no histogram counted them */
  get totalKnown(): boolean {
    return !this.nextCursor || this.histogram != null;
  }

  /** more lines match than the list pages through */
  get capped(): boolean {
    return this.totalKnown && this.total > EXPORT_LIMIT;
  }

  /** what the pager can reach: the newest EXPORT_LIMIT lines, and one line
      past the loaded ones while the count is out, so the next page stays open */
  get pagerTotal(): number {
    return Math.min(
      this.totalKnown ? this.total : this.logs.length + 1,
      EXPORT_LIMIT,
    );
  }

  /** the shown page's lines are still on the way */
  get pageLoading(): boolean {
    return (
      !this.loading &&
      !this.searchFailed &&
      !this.pageError &&
      this.nextCursor != null &&
      this.logs.length < Math.min(this.page * this.pageSize, EXPORT_LIMIT)
    );
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

  setFormatJson = (on: boolean) => {
    this.formatJson = on;
  };

  resetDisplay = () => {
    this.columns = [];
    this.formatJson = true;
  };

  setRail = (open: boolean) => {
    this.railOpen = open;
  };

  setChartOpen = (open: boolean) => {
    this.chartOpen = open;
    try {
      localStorage.setItem(CHART_KEY, open ? '1' : '0');
    } catch {
      /* private mode: the choice lasts the visit */
    }
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
              failed: true,
              generation,
            }),
          );
        });
    }
  };

  /** a key's values with counts: service and level from the facets */
  facetValuesOf = (
    key: string,
  ): { values: OtelValueCount[]; loading: boolean; failed?: boolean } => {
    if (key === 'service')
      return {
        values: (this.facets?.services ?? []).map((s) => ({
          ...s,
          value: s.value || NO_SERVICE,
        })),
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
      what arrived since and offers it. A request still out is never cut
      off: the tick skips until it lands. */
  tick = () => {
    if (!('preset' in this.window) || this.exporting) return;
    if (!this.landed || this.loadingMore || this.counting) return;
    if (this.page === 1 && !this.openLine) {
      void this.run(Date.now(), true);
      return;
    }
    void this.countNew();
  };

  countNew = async () => {
    const applied = this.appliedFilter;
    if (!applied) return;
    this.counting = true;
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
    } finally {
      this.counting = false;
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
    this.seekAt = null;
  };

  /** `keep` holds the line even once a refetch drops it from the list */
  openLog = (log: OtelLog, keep = false) => {
    this.openExtra =
      keep || !this.logs.some((l) => l.id === log.id) ? log : null;
    this.openId = log.id;
    this.seekAt = null;
  };

  get lineRef(): { id: string; at: number } | null {
    const l = this.openLine;
    if (l) return { id: l.id, at: otelLogTimeMs(l) };
    return this.openId && this.seekAt != null
      ? { id: this.openId, at: this.seekAt }
      : null;
  }

  /** opens a linked line; one not in the list is asked for at its time.
      Resolves false when it is gone */
  seekLine = async (id: string, at: number): Promise<boolean> => {
    this.openId = id;
    this.seekAt = null;
    if (this.openLine) return true;
    this.seekAt = at;
    let found: OtelLog | undefined;
    try {
      let cursor: string | undefined;
      for (let page = 0; page < RELATED_PAGES && !found; page += 1) {
        const r = await otelLogsService.search({
          startTime: at,
          endTime: at + 1,
          limit: OTEL_LOGS_LIMITS.maxPageSize,
          cursor,
        });
        found = r.logs.find((l) => l.id === id);
        if (!r.nextCursor) break;
        cursor = r.nextCursor;
      }
    } catch {
      /* unanswered: the line stays closed */
    }
    if (this.openId !== id || this.seekAt !== at) return true;
    runInAction(() => {
      this.seekAt = null;
      if (found) this.openExtra = found;
      else if (!this.openLine) this.openId = null;
    });
    return found != null || this.openLine != null;
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
        this.seekAt = null;
        const page = Math.floor((i + dir) / this.pageSize) + 1;
        if (page !== this.page) this.page = page;
      });
  };

  /** lines around one, from a search of their own (the list stays put).
      The API lists newest first, so a busy window is paged until the line
      and as many older ones as the drawer shows have come in */
  related = async (
    log: OtelLog,
    at: number,
    spanMs: number,
    match: 'service' | 'pod' | 'all',
    signal?: AbortSignal,
  ): Promise<OtelLog[]> => {
    const pod = log.resourceAttributes?.['k8s.pod.name'];
    const filter: OtelLogsFilter = {
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
    };
    const found: OtelLog[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < RELATED_PAGES; page += 1) {
      const r = await otelLogsService.search(
        { ...filter, limit: OTEL_LOGS_LIMITS.maxPageSize, cursor },
        signal,
      );
      found.push(...r.logs);
      const i = found.findIndex((l) => l.id === log.id);
      if (!r.nextCursor || (i >= 0 && found.length - 1 - i >= RELATED_SIDE))
        break;
      cursor = r.nextCursor;
    }
    return found;
  };

  /* ── the Logs page: views ──────────────────────────────────────────── */

  /** views live in this browser, per person and project */
  loadViews = (userId: string | number, siteId: string) => {
    const key = `__or_logs_views:${userId}:${siteId}`;
    if (this.viewsKey === key) return;
    this.viewsKey = key;
    this.viewId = null;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) ?? '[]');
      this.views = Array.isArray(parsed) ? parsed : [];
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

  private filtersOf = (rules: readonly LogRule[]): Filter[] =>
    rules.map((r) => ({
      ...logFilter(r.name, this.labelOf(r.name)),
      operator: r.operator,
      value: [...r.value],
    }));

  applyView = (id: string) => {
    const v = this.views.find((x) => x.id === id);
    if (!v) return;
    this.setRules(this.filtersOf(v.rules), true);
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

  /* ── ingest keys ───────────────────────────────────────────────────── */

  fetchIngestKeys = async () => {
    // a project switch asks again; the earlier answer is stale
    const seq = ++this.keysSeq;
    this.ingestKeysLoading = true;
    try {
      const keys = await ingestKeysService.list();
      if (seq === this.keysSeq) runInAction(() => (this.ingestKeys = keys));
    } finally {
      if (seq === this.keysSeq)
        runInAction(() => (this.ingestKeysLoading = false));
    }
  };

  /** Returns the key with its secret; the stored copy drops it since the API never returns it again. */
  createIngestKey = async (name: string): Promise<IngestKey> => {
    const seq = this.keysSeq;
    const created = await ingestKeysService.create(name.trim());
    if (seq === this.keysSeq)
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
