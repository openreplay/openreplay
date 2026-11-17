import type { TFunction } from 'i18next';

import type { Filter } from 'App/mstore/types/filterConstants';
import {
  OTEL_INTERNAL_KEY_PREFIX,
  OTEL_LOGS_LIMITS,
  type OtelAttributeFilter,
  type OtelAttributeOp,
  type OtelFacetsResponse,
  type OtelLog,
  otelLogTimeMs,
  otelSeverityLevel,
} from 'App/services/OtelLogsService';

import { entryFromFilter } from 'Shared/FilterEditor/catalogue';
import type { CatalogueEntry } from 'Shared/FilterEditor/types';

/* ── window ─────────────────────────────────────────────────────────────── */

export const LOG_PRESETS = [
  { value: 'LOGS_15M', label: 'Past 15 minutes', minutes: 15 },
  { value: 'LOGS_1H', label: 'Past hour', minutes: 60 },
  { value: 'LOGS_6H', label: 'Past 6 hours', minutes: 6 * 60 },
  { value: 'LOGS_24H', label: 'Past 24 hours', minutes: 24 * 60 },
  { value: 'LOGS_7D', label: 'Past 7 days', minutes: 7 * 24 * 60 },
] as const;
export const DEFAULT_LOG_PRESET = 'LOGS_1H';

export type LogWindow = { preset: string } | { from: number; to: number };

export function windowBounds(
  w: LogWindow,
  now = Date.now(),
): { from: number; to: number } {
  if ('from' in w) return { from: w.from, to: w.to };
  const minutes = LOG_PRESETS.find((p) => p.value === w.preset)?.minutes ?? 60;
  return { from: now - minutes * 60_000, to: now };
}

/** the backend refuses a window over 30 days */
export const clampWindow = (from: number, to: number): LogWindow => ({
  from: Math.max(from, to - OTEL_LOGS_LIMITS.maxRangeMs),
  to,
});

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export function lineStamp(ms: number, withDate: boolean): string {
  const d = new Date(ms);
  const t = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  return withDate
    ? `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${t}`
    : t;
}

export function compactCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

/* ── levels ─────────────────────────────────────────────────────────────── */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export const LEVELS: readonly LogLevel[] = ['error', 'warn', 'info', 'debug'];
export const levelLabel = (t: TFunction, l: LogLevel) =>
  ({
    error: t('Error'),
    warn: t('Warning'),
    info: t('Info'),
    debug: t('Debug'),
  })[l];

/** SeverityText as the backend filters it (lowercased) folded into four */
export function levelOfText(text: string): LogLevel {
  const s = text.toLowerCase();
  if (s.startsWith('fatal') || s.startsWith('crit') || s.startsWith('err'))
    return 'error';
  if (s.startsWith('warn')) return 'warn';
  if (s.startsWith('debug') || s.startsWith('trace')) return 'debug';
  return 'info';
}

export function levelOf(log: OtelLog): LogLevel {
  if (log.severityText) return levelOfText(log.severityText);
  const l = otelSeverityLevel(log.severityNumber);
  return l === 'fatal'
    ? 'error'
    : l === 'trace'
      ? 'debug'
      : l === 'unspecified'
        ? 'info'
        : l;
}

/* ── keys ───────────────────────────────────────────────────────────────── */

export const SESSION_ATTR = 'openreplay.session.id';
export const sessionOf = (log: OtelLog): string | undefined =>
  log.logAttributes?.[SESSION_ATTR] || undefined;

const ATTR_LABEL: Record<string, string> = {
  'http.route': 'Route',
  'http.request.method': 'Method',
  'http.response.status_code': 'Status code',
  duration_ms: 'Duration (ms)',
  'exception.type': 'Exception',
  'exception.message': 'Exception message',
  'exception.stacktrace': 'Stack trace',
  'user.id': 'User id',
  'user.name': 'User',
  'server.address': 'Upstream host',
  'peer.service': 'Upstream service',
};
const RESOURCE_LABEL: Record<string, string> = {
  'service.name': 'Service',
  'service.version': 'Version',
  'deployment.environment.name': 'Environment',
  'deployment.environment': 'Environment',
  'k8s.namespace.name': 'Namespace',
  'k8s.pod.name': 'Pod',
  'k8s.node.name': 'Node',
  'host.name': 'Host',
  'cloud.provider': 'Cloud',
  'cloud.region': 'Region',
};

export const scopeOfKey = (key: string): 'log' | 'resource' | null =>
  key.startsWith('attr.') ? 'log' : key.startsWith('res.') ? 'resource' : null;
export const nameOfKey = (key: string) =>
  key.startsWith('attr.')
    ? key.slice(5)
    : key.startsWith('res.')
      ? key.slice(4)
      : key;

export function keyLabel(t: TFunction, key: string): string {
  if (key === 'message') return t('Message');
  if (key === 'level') return t('Level');
  if (key === 'service') return t('Service');
  if (key === 'trace') return t('Trace');
  if (key === 'session') return t('Session');
  const name = nameOfKey(key);
  const label = key.startsWith('res.')
    ? RESOURCE_LABEL[name]
    : ATTR_LABEL[name];
  return label ? t(label) : name;
}

export const isInternal = (name: string) =>
  name.startsWith(OTEL_INTERNAL_KEY_PREFIX);

export function valueOfLog(log: OtelLog, key: string): string | undefined {
  switch (key) {
    case 'message':
      return log.body;
    case 'level':
      return levelOf(log);
    case 'service':
      return log.serviceName;
    case 'trace':
      return log.traceId || undefined;
    case 'session':
      return sessionOf(log);
    default: {
      const scope = scopeOfKey(key);
      const bag =
        scope === 'resource' ? log.resourceAttributes : log.logAttributes;
      return bag?.[nameOfKey(key)];
    }
  }
}

/* ── catalogue (synthetic store filters, read by the shared filter bar) ─── */

const op = (value: string, label: string) => ({
  value,
  label,
  displayName: label,
});
const MESSAGE_OPS = [op('contains', 'contains')];
const LEVEL_OPS = [op('is', 'is')];
const VALUE_OPS = [
  op('is', 'is'),
  op('isNot', 'is not'),
  op('contains', 'contains'),
  op('isAny', 'exists'),
];

export const LOG_CATEGORY = 'log';
export const ATTR_CATEGORY = 'log_attrs';
export const VIEW_CATEGORY = 'log_views';

export function logFilter(
  key: string,
  displayName: string,
  extra: Partial<Filter> & Record<string, unknown> = {},
): Filter {
  const operators =
    key === 'message' ? MESSAGE_OPS : key === 'level' ? LEVEL_OPS : VALUE_OPS;
  return {
    id: `log.${key}`,
    name: key,
    displayName,
    category: key.startsWith('attr.') ? ATTR_CATEGORY : LOG_CATEGORY,
    isEvent: false,
    dataType: 'string',
    autoCaptured: false,
    operators,
    operator: operators[0].value,
    value: [],
    filters: [],
    toJSON: () => ({}) as any,
    ...extra,
  } as Filter;
}

export function catalogue(
  t: TFunction,
  facets: OtelFacetsResponse | null,
): CatalogueEntry[] {
  const severities = [
    ...new Set((facets?.severities ?? []).map((s) => s.value.toLowerCase())),
  ];
  const level = logFilter('level', t('Level'), {
    isPredefined: true,
    possibleValues: severities.map((s) => ({ value: s, label: s })),
  });
  const keys = (scope: 'log' | 'resource') =>
    (facets?.attributeKeys?.[scope] ?? [])
      .map((k) => k.key)
      .filter(
        (k) =>
          !isInternal(k) && !(scope === 'resource' && k === 'service.name'),
      );
  const filters = [
    logFilter('message', t('Message')),
    level,
    logFilter('service', t('Service')),
    ...keys('resource').map((k) =>
      logFilter(`res.${k}`, keyLabel(t, `res.${k}`)),
    ),
    ...keys('log').map((k) => logFilter(`attr.${k}`, keyLabel(t, `attr.${k}`))),
  ];
  return filters.map(entryFromFilter);
}

/* ── rules → the API filter ─────────────────────────────────────────────── */

export interface LogRule {
  name: string;
  operator: string;
  value: string[];
}

const OP: Record<string, OtelAttributeOp> = {
  is: 'is',
  isNot: 'isNot',
  contains: 'contains',
  isAny: 'exists',
};

export interface FilterParts {
  query: string;
  services: string[];
  severities: string[];
  attributes: OtelAttributeFilter[];
}

export function rulesToFilter(rules: readonly LogRule[]): FilterParts {
  const words: string[] = [];
  const services: string[] = [];
  const severities: string[] = [];
  const attributes: OtelAttributeFilter[] = [];
  for (const r of rules) {
    const values = r.value.map((v) => v.trim()).filter(Boolean);
    const nullary = r.operator === 'isAny';
    if (!nullary && values.length === 0) continue;
    if (r.name === 'message') {
      words.push(...values);
      continue;
    }
    if (r.name === 'level') {
      severities.push(...values.map((v) => v.toLowerCase()));
      continue;
    }
    if (r.name === 'service' && r.operator === 'is') {
      services.push(...values);
      continue;
    }
    const scope = r.name === 'service' ? 'resource' : scopeOfKey(r.name);
    const key = r.name === 'service' ? 'service.name' : nameOfKey(r.name);
    const o = OP[r.operator];
    if (!scope || !o || isInternal(key)) continue;
    attributes.push({
      scope,
      key,
      op: o,
      values: nullary ? [] : values.slice(0, OTEL_LOGS_LIMITS.maxListValues),
    });
  }
  return {
    query: words.join(' ').slice(0, OTEL_LOGS_LIMITS.maxQueryLength),
    services: [...new Set(services)].slice(0, OTEL_LOGS_LIMITS.maxListValues),
    severities: [...new Set(severities)],
    attributes: attributes.slice(0, OTEL_LOGS_LIMITS.maxAttributes),
  };
}

const sig = (r: LogRule) =>
  `${r.name}|${r.operator}|${r.value
    .map((v) => v.toLowerCase())
    .sort()
    .join(',')}`;
export function sameRules(a: readonly LogRule[], b: readonly LogRule[]) {
  const sa = a.map(sig).sort();
  const sb = b.map(sig).sort();
  return sa.length === sb.length && sa.every((x, i) => x === sb[i]);
}

/* ── the drawer's reading of a line ─────────────────────────────────────── */

export type FieldTone = 'danger' | 'warning';
export interface LineField {
  name: string;
  value: string;
  /** the rule key it filters by, null when it cannot be one */
  key: string | null;
  multiline: boolean;
  tone?: FieldTone;
}

const LEAD_ATTRIBUTES = [
  'exception.type',
  'exception.message',
  'exception.stacktrace',
  'http.response.status_code',
  'http.request.method',
  'http.route',
  'duration_ms',
  'user.id',
  'user.name',
  'peer.service',
  'server.address',
];
const LEAD_RESOURCE = [
  'service.name',
  'deployment.environment.name',
  'k8s.namespace.name',
  'k8s.pod.name',
  'service.version',
  'k8s.node.name',
  'cloud.region',
  'cloud.provider',
];
const byLead = (lead: readonly string[]) => (a: LineField, b: LineField) => {
  const ia = lead.indexOf(a.name);
  const ib = lead.indexOf(b.name);
  if (ia >= 0 || ib >= 0)
    return (ia < 0 ? lead.length : ia) - (ib < 0 ? lead.length : ib);
  return a.name.localeCompare(b.name);
};

function toneOf(name: string, value: string): FieldTone | undefined {
  if (name === 'exception.type') return 'danger';
  if (name === 'http.response.status_code') {
    const n = Number(value);
    if (n >= 500) return 'danger';
    if (n >= 400) return 'warning';
  }
  if (name === 'duration_ms' && Number(value) >= 1000) return 'warning';
  return undefined;
}

export function lineFields(log: OtelLog) {
  const logFields = Object.entries(log.logAttributes ?? {})
    .map(([name, value]) => ({
      name,
      value,
      key: isInternal(name) ? null : `attr.${name}`,
      multiline: value.includes('\n'),
      tone: toneOf(name, value),
    }))
    .sort(byLead(LEAD_ATTRIBUTES));
  const resource = Object.entries(log.resourceAttributes ?? {})
    .map(([name, value]) => ({
      name,
      value,
      key: isInternal(name)
        ? null
        : name === 'service.name'
          ? 'service'
          : `res.${name}`,
      multiline: value.includes('\n'),
    }))
    .sort(byLead(LEAD_RESOURCE));
  const scope: LineField[] = [
    ...(log.scopeName
      ? [{ name: 'name', value: log.scopeName, key: null, multiline: false }]
      : []),
    ...Object.entries(log.scopeAttributes ?? {}).map(([name, value]) => ({
      name,
      value,
      key: null,
      multiline: value.includes('\n'),
    })),
  ];
  return { log: logFields, resource, scope };
}

/** the record as stored (ClickHouse otel.logs) */
export const otelRow = (log: OtelLog): Record<string, unknown> => ({
  Timestamp: new Date(otelLogTimeMs(log)).toISOString(),
  TimestampNs: log.timestamp,
  ServiceName: log.serviceName,
  SeverityText: log.severityText,
  SeverityNumber: log.severityNumber,
  Body: log.body,
  ...(log.traceId ? { TraceId: log.traceId, SpanId: log.spanId } : {}),
  LogAttributes: log.logAttributes,
  ResourceAttributes: log.resourceAttributes,
  ScopeName: log.scopeName,
  ScopeAttributes: log.scopeAttributes,
});

export const byteSize = (text: string) => new TextEncoder().encode(text).length;

/* ── export ─────────────────────────────────────────────────────────────── */

export const EXPORT_LIMIT = 10_000;
export type ExportFormat = 'csv' | 'json';
const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportLines(
  logs: readonly OtelLog[],
  format: ExportFormat,
  columns: readonly string[],
): string {
  const slice = logs.slice(0, EXPORT_LIMIT);
  if (format === 'json')
    return slice
      .map((l) =>
        JSON.stringify({
          timestamp: new Date(otelLogTimeMs(l)).toISOString(),
          ...otelRow(l),
        }),
      )
      .join('\n');
  const head = ['timestamp', ...columns, 'message'];
  const rows = slice.map((l) =>
    [
      new Date(otelLogTimeMs(l)).toISOString(),
      ...columns.map((c) => valueOfLog(l, c)),
      l.body,
    ]
      .map(csvCell)
      .join(','),
  );
  return [head.join(','), ...rows].join('\n');
}

export function exportFileName(from: number, to: number, format: ExportFormat) {
  const stamp = (ms: number) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  };
  return `logs_${stamp(from)}_to_${stamp(to)}.${format === 'json' ? 'ndjson' : 'csv'}`;
}

/* ── drilldown ──────────────────────────────────────────────────────────── */

export const DRILL_VALUES = 5;
/** keys whose every value is its own: no distribution to read */
const DRILL_SKIP = new Set([
  'exception.stacktrace',
  'exception.message',
  SESSION_ATTR,
]);

export interface DrillCard {
  key: string;
  /** the OpenTelemetry name under the label */
  name: string;
  /** lines carrying it */
  carried: number;
}

export function drillCards(
  facets: OtelFacetsResponse | null,
  total: number,
): DrillCard[] {
  if (!facets || total === 0) return [];
  const cards: DrillCard[] = [
    { key: 'service', name: 'service.name', carried: total },
    { key: 'level', name: 'severity_text', carried: total },
  ];
  for (const scope of ['resource', 'log'] as const)
    for (const k of facets.attributeKeys?.[scope] ?? []) {
      if (isInternal(k.key) || DRILL_SKIP.has(k.key)) continue;
      if (scope === 'resource' && k.key === 'service.name') continue;
      cards.push({
        key: `${scope === 'log' ? 'attr' : 'res'}.${k.key}`,
        name: k.key,
        carried: Math.min(k.count, total),
      });
    }
  return cards.sort(
    (a, b) => b.carried - a.carried || a.name.localeCompare(b.name),
  );
}
