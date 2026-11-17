import { makeAutoObservable, runInAction } from 'mobx';

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
} from 'App/services/OtelLogsService';

/** Relative ranges are re-anchored to now on every fetch. */
export type OtelLogsRange =
  { durationMs: number } | { start: number; end: number };

const isAbort = (e: any) => e?.name === 'AbortError';

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
  loadingMore = false;
  histogramLoading = false;
  facetsLoading = false;
  error: string | null = null;

  ingestKeys: IngestKey[] = [];
  ingestKeysLoading = false;

  private controller: AbortController | null = null;

  constructor() {
    makeAutoObservable<OtelLogsStore, 'controller'>(this, {
      controller: false,
    });
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

  /** Runs search, histogram and facets for the current filter; aborts any in-flight run. */
  fetch = async () => {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const filter = this.buildFilter();
    const { signal } = controller;

    this.appliedFilter = filter;
    this.logs = [];
    this.nextCursor = null;
    this.error = null;
    this.loading = true;
    this.histogramLoading = true;
    this.facetsLoading = true;

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
          if (current()) runInAction(() => (this.loading = false));
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
  loadMore = async () => {
    const { appliedFilter, nextCursor, controller } = this;
    if (
      !appliedFilter ||
      !nextCursor ||
      !controller ||
      this.loading ||
      this.loadingMore
    ) {
      return;
    }
    this.loadingMore = true;
    try {
      const r = await otelLogsService.search(
        { ...appliedFilter, limit: this.pageSize, cursor: nextCursor },
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
    this.loadingMore = false;
    this.histogramLoading = false;
    this.facetsLoading = false;
    this.error = null;
    this.ingestKeys = [];
  };

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
