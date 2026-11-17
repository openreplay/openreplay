import BaseService from './BaseService';

/** Server-side limits from backend/pkg/otel_logs/query.go. */
export const OTEL_LOGS_LIMITS = {
  maxRangeMs: 30 * 24 * 60 * 60 * 1000,
  maxQueryLength: 500,
  maxListValues: 50,
  maxAttributes: 20,
  maxKeyLength: 256,
  defaultPageSize: 100,
  maxPageSize: 500,
} as const;

/** `openreplay.*` attribute keys are internal and rejected by the API. */
export const OTEL_INTERNAL_KEY_PREFIX = 'openreplay.';

export type OtelAttributeScope = 'log' | 'resource';

export type OtelAttributeOp = 'exists' | 'is' | 'isNot' | 'contains';

export interface OtelAttributeFilter {
  scope: OtelAttributeScope;
  key: string;
  op: OtelAttributeOp;
  /** 1..50 values for is/isNot/contains (OR-ed); ignored for exists */
  values: string[];
}

export interface OtelLogsFilter {
  /** ms, inclusive */
  startTime: number;
  /** ms, exclusive */
  endTime: number;
  /** whitespace-separated words, all must match the body (case-insensitive) */
  query?: string;
  services?: string[];
  /** compared lowercased against SeverityText */
  severities?: string[];
  /** AND-ed */
  attributes?: OtelAttributeFilter[];
}

export interface OtelLogsSearchRequest extends OtelLogsFilter {
  /** default 100, max 500 */
  limit?: number;
  /** opaque; only valid with the exact filter that produced it */
  cursor?: string;
}

export interface OtelLog {
  /** unix nanoseconds; exceeds Number.MAX_SAFE_INTEGER, so precise to ~µs only */
  timestamp: number;
  severityText: string;
  /** OTel SeverityNumber 0..24, see otelSeverityLevel */
  severityNumber: number;
  serviceName: string;
  body: string;
  traceId: string;
  spanId: string;
  logAttributes: Record<string, string>;
  resourceAttributes: Record<string, string>;
  scopeName: string;
  scopeAttributes: Record<string, string>;
}

export interface OtelLogsSearchResponse {
  /** newest first */
  logs: OtelLog[];
  nextCursor: string | null;
}

export interface OtelHistogramBucket {
  /** bucket start, ms */
  time: number;
  total: number;
  /** keyed by raw SeverityText */
  bySeverity: Record<string, number>;
}

export interface OtelHistogramResponse {
  /** bucket width, seconds */
  step: number;
  buckets: OtelHistogramBucket[];
}

export interface OtelValueCount {
  value: string;
  count: number;
}

export interface OtelKeyCount {
  key: string;
  count: number;
}

/** Counts for each facet ignore that facet's own filter, so siblings stay selectable. */
export interface OtelFacetsResponse {
  services: OtelValueCount[];
  severities: OtelValueCount[];
  attributeKeys: Record<OtelAttributeScope, OtelKeyCount[]>;
  /** counts come from a row sample, not exact totals */
  sampled: boolean;
}

export interface OtelFacetValuesResponse {
  key: string;
  values: OtelValueCount[];
  sampled: boolean;
}

export type OtelSeverityLevel =
  'unspecified' | 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const SEVERITY_LEVELS: OtelSeverityLevel[] = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
];

/** OTel SeverityNumber ranges: 1-4 trace, 5-8 debug, ... 21-24 fatal. */
export function otelSeverityLevel(severityNumber: number): OtelSeverityLevel {
  if (!severityNumber || severityNumber < 1) return 'unspecified';
  return SEVERITY_LEVELS[Math.min(Math.floor((severityNumber - 1) / 4), 5)];
}

export const otelLogTimeMs = (log: OtelLog) => Math.floor(log.timestamp / 1e6);

export default class OtelLogsService extends BaseService {
  search = async (
    req: OtelLogsSearchRequest,
    signal?: AbortSignal,
  ): Promise<OtelLogsSearchResponse> => {
    const r = await this.client.post(
      '/PROJECT_ID/logs/search',
      req,
      undefined,
      undefined,
      signal,
    );
    const { data } = await r.json();
    return { logs: data?.logs ?? [], nextCursor: data?.nextCursor ?? null };
  };

  histogram = async (
    filter: OtelLogsFilter,
    signal?: AbortSignal,
  ): Promise<OtelHistogramResponse> => {
    const r = await this.client.post(
      '/PROJECT_ID/logs/histogram',
      filter,
      undefined,
      undefined,
      signal,
    );
    const { data } = await r.json();
    return data;
  };

  facets = async (
    filter: OtelLogsFilter,
    signal?: AbortSignal,
  ): Promise<OtelFacetsResponse> => {
    const r = await this.client.post(
      '/PROJECT_ID/logs/facets',
      filter,
      undefined,
      undefined,
      signal,
    );
    const { data } = await r.json();
    return data;
  };

  /** Top values of one attribute; the filter's own condition on that key is ignored. */
  facetValues = async (
    filter: OtelLogsFilter,
    scope: OtelAttributeScope,
    key: string,
    signal?: AbortSignal,
  ): Promise<OtelFacetValuesResponse> => {
    const r = await this.client.post(
      '/PROJECT_ID/logs/facets',
      { ...filter, scope, key },
      undefined,
      undefined,
      signal,
    );
    const { data } = await r.json();
    return data;
  };
}
