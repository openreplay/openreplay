import type { TFunction } from 'i18next';
import { DateTime } from 'luxon';

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
import { csvCell } from 'App/utils/download';

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

/** a server line has no end user: that choice reads as the computer's clock */
export const logZone = (s: {
  shownTimezone: string;
  timezone?: { value: string } | null;
}): string =>
  s.shownTimezone !== 'user' && s.timezone?.value ? s.timezone.value : 'local';

export const logTime = (ms: number, zone: string) =>
  DateTime.fromMillis(ms, { zone });

export const sameLogDay = (a: number, b: number, zone: string) =>
  logTime(a, zone).hasSame(logTime(b, zone), 'day');

const dayLabel = (d: DateTime) =>
  d.toLocaleString({ month: 'short', day: 'numeric' });

export function lineStamp(ms: number, withDate: boolean, zone: string): string {
  const d = logTime(ms, zone);
  const t = d.toFormat('HH:mm:ss.SSS');
  return withDate ? `${dayLabel(d)} ${t}` : t;
}

export function clockLabel(
  ms: number,
  withDate: boolean,
  zone: string,
  withSeconds = false,
): string {
  const d = logTime(ms, zone);
  const hm = d.toFormat(withSeconds ? 'HH:mm:ss' : 'HH:mm');
  return withDate ? `${dayLabel(d)}, ${hm}` : hm;
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
  if (l === 'unspecified') {
    const own = bodyOf(log)?.level;
    return own ? levelOfText(own) : 'info';
  }
  return l === 'fatal' ? 'error' : l === 'trace' ? 'debug' : l;
}

/* ── a JSON body ────────────────────────────────────────────────────────── */

export interface LogBody {
  text: string;
  rest: string;
  json: Record<string, unknown>;
  level?: string;
}

const BODY_SKIP = new Set([
  'msg',
  'message',
  'level',
  'severity',
  'time',
  'timestamp',
  '@timestamp',
]);

export function readBody(body: string): LogBody | null {
  const s = body.trimStart();
  if (s[0] !== '{' || (!s.includes('"msg"') && !s.includes('"message"')))
    return null;
  let json: unknown;
  try {
    json = JSON.parse(s);
  } catch {
    return null;
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;
  const text =
    typeof o.msg === 'string'
      ? o.msg
      : typeof o.message === 'string'
        ? o.message
        : null;
  if (text == null) return null;
  const rest = Object.entries(o)
    .filter(([k]) => !BODY_SKIP.has(k))
    .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(' ');
  return {
    text,
    rest,
    json: o,
    level: typeof o.level === 'string' && o.level ? o.level : undefined,
  };
}

const bodies = new WeakMap<OtelLog, LogBody | null>();
export function bodyOf(log: OtelLog): LogBody | null {
  let b = bodies.get(log);
  if (b === undefined) {
    b = readBody(log.body ?? '');
    bodies.set(log, b);
  }
  return b;
}

export const lineText = (log: OtelLog) => bodyOf(log)?.text ?? log.body;

/* ── histogram ──────────────────────────────────────────────────────────── */

export interface Bucket {
  from: number;
  to: number;
  counts: Record<LogLevel, number>;
  total: number;
}

const emptyCounts = (): Record<LogLevel, number> => ({
  error: 0,
  warn: 0,
  info: 0,
  debug: 0,
});

/** the API's buckets (only the non-empty ones) laid over the whole window */
export function toBuckets(
  h: {
    step: number;
    buckets: {
      time: number;
      total: number;
      bySeverity: Record<string, number>;
    }[];
  } | null,
  from: number,
  to: number,
): { buckets: Bucket[]; step: number } {
  if (!h || !h.step) return { buckets: [], step: 60_000 };
  const step = h.step * 1000;
  const start = Math.floor(from / step) * step;
  const n = Math.max(1, Math.min(2000, Math.ceil((to - start) / step)));
  const buckets: Bucket[] = Array.from({ length: n }, (_, i) => ({
    from: start + i * step,
    to: start + (i + 1) * step,
    counts: emptyCounts(),
    total: 0,
  }));
  for (const b of h.buckets) {
    const at = buckets[Math.floor((b.time - start) / step)];
    if (!at) continue;
    for (const [text, c] of Object.entries(b.bySeverity ?? {}))
      at.counts[levelOfText(text)] += c;
    at.total += b.total;
  }
  return { buckets, step };
}

export function levelTotals(buckets: readonly Bucket[]) {
  const out = emptyCounts();
  for (const b of buckets) for (const l of LEVELS) out[l] += b.counts[l];
  return out;
}

/* ── keys ───────────────────────────────────────────────────────────────── */

const SESSION_ATTR = 'openreplay.session.id';
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
export const keyOf = (scope: 'log' | 'resource', name: string) =>
  `${scope === 'log' ? 'attr' : 'res'}.${name}`;
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

/** keys with a value per line, or copies of what the page already shows */
const NOT_FACETS = new Set([
  'msg',
  'level',
  'severity',
  'exception.message',
  'exception.stacktrace',
]);
const ID_KEY = /(?:^|[._-])(?:id|Id|ID)$|[a-z\d](?:Id|ID)$/;

/** what Choose facets and the drilldown offer; filters take every key */
export const isFacetKey = (name: string) =>
  !isInternal(name) && !NOT_FACETS.has(name) && !ID_KEY.test(name);

/** a line naming no service, as rules and pickers hold it; the API has '' */
export const NO_SERVICE = '(no service)';
export const serviceLabel = (t: TFunction, value: string) =>
  value === '' || value === NO_SERVICE ? t('(no service)') : value;
/** a key's value as the page shows it */
export const valueLabel = (t: TFunction, key: string, value: string) =>
  key === 'service' ? serviceLabel(t, value) : value;

/** the keys Choose facets offers */
export function facetChoices(
  t: TFunction,
  facets: OtelFacetsResponse | null,
): { key: string; label: string }[] {
  const keys = (['resource', 'log'] as const).flatMap((scope) =>
    (facets?.attributeKeys?.[scope] ?? [])
      .filter(
        (k) =>
          isFacetKey(k.key) &&
          !(scope === 'resource' && k.key === 'service.name'),
      )
      .map((k) => keyOf(scope, k.key)),
  );
  return [
    { key: 'service', label: t('Service') },
    ...keys.map((key) => ({ key, label: keyLabel(t, key) })),
  ];
}

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

/** a column's value as the table shows it */
export const shownValue = (t: TFunction, log: OtelLog, key: string) =>
  key === 'level' ? levelLabel(t, levelOf(log)) : valueOfLog(log, key);

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
    ...(key === 'service' ? { valueLabel: serviceLabel } : {}),
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

/** levels match whatever their case (the API lowercases them); every other
    value is matched exactly, as the API does */
export const sameValue = (key: string, a: string, b: string) =>
  key === 'level' ? a.toLowerCase() === b.toLowerCase() : a === b;

/** Which values of a key the list keeps under the rules on that key, as the
    API reads them: `is` rules of the service and the level add up, other
    keys' rules all apply. Null when a rule the client cannot replay
    (`contains`) is on the key. */
export function keepsValue(
  key: string,
  rules: readonly LogRule[],
): ((value: string) => boolean) | null {
  const mine = rules.filter(
    (r) =>
      r.name === key &&
      (r.operator === 'isAny' || r.value.some((v) => v.trim() !== '')),
  );
  if (mine.some((r) => r.operator === 'contains')) return null;
  const has = (r: LogRule, v: string) =>
    r.value.some((x) => sameValue(key, x.trim(), v));
  const ins = mine.filter((r) => r.operator === 'is');
  const outs = mine.filter((r) => r.operator === 'isNot');
  const union = key === 'level' || key === 'service';
  return (v) =>
    (ins.length === 0 ||
      (union ? ins.some((r) => has(r, v)) : ins.every((r) => has(r, v)))) &&
    !outs.some((r) => has(r, v));
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
    const typed = r.value.map((v) => v.trim()).filter(Boolean);
    const nullary = r.operator === 'isAny';
    if (!nullary && typed.length === 0) continue;
    if (r.name === 'message') {
      words.push(...typed);
      continue;
    }
    if (r.name === 'level') {
      severities.push(...typed.map((v) => v.toLowerCase()));
      continue;
    }
    const service = r.name === 'service';
    const values =
      service && r.operator !== 'contains'
        ? typed.map((v) => (v === NO_SERVICE ? '' : v))
        : typed;
    if (service && r.operator === 'is') {
      services.push(...values);
      continue;
    }
    const scope = service ? 'resource' : scopeOfKey(r.name);
    const key = service ? 'service.name' : nameOfKey(r.name);
    const o = OP[r.operator];
    if (!scope || !o || isInternal(key)) continue;
    attributes.push({
      scope,
      key,
      op: o,
      values: nullary ? [] : values.slice(0, OTEL_LOGS_LIMITS.maxListValues),
    });
    // a line without a service carries no service.name for `isNot` to see
    if (service && o === 'isNot' && values.includes(''))
      attributes.push({ scope, key, op: 'exists', values: [] });
  }
  return {
    query: words.join(' ').slice(0, OTEL_LOGS_LIMITS.maxQueryLength),
    services: [...new Set(services)].slice(0, OTEL_LOGS_LIMITS.maxListValues),
    severities: [...new Set(severities)],
    attributes: attributes.slice(0, OTEL_LOGS_LIMITS.maxAttributes),
  };
}

// only levels match whatever their case; a case-only edit elsewhere is one
const sig = (r: LogRule) =>
  `${r.name}|${r.operator}|${r.value
    .map((v) => (r.name === 'level' ? v.toLowerCase() : v))
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

/* OTel semconv (current, then pre-1.21), then pino-http and express-winston
   bodies, which the collector flattens into log attributes */
const METHOD_KEYS = [
  'http.request.method',
  'http.method',
  'req.method',
  'meta.req.method',
];
const ROUTE_KEYS = [
  'http.route',
  'url.path',
  'http.target',
  'req.url',
  'meta.req.url',
];
const STATUS_KEYS = [
  'http.response.status_code',
  'http.status_code',
  'res.statusCode',
  'meta.res.statusCode',
];
const DURATION_MS_KEYS = ['duration_ms', 'responseTime', 'meta.responseTime'];
const ENV_KEYS = ['deployment.environment.name', 'deployment.environment'];

/** the first of `keys` with a value, and the value */
const firstOf = (bag: Record<string, string>, keys: readonly string[]) => {
  for (const k of keys) if (bag[k]) return { name: k, value: bag[k] };
  return undefined;
};

function toneOf(name: string, value: string): FieldTone | undefined {
  if (name === 'exception.type') return 'danger';
  if (STATUS_KEYS.includes(name)) {
    const n = Number(value);
    if (n >= 500) return 'danger';
    if (n >= 400) return 'warning';
  }
  if (DURATION_MS_KEYS.includes(name) && Number(value) >= 1000)
    return 'warning';
  return undefined;
}

export function lineFields(log: OtelLog) {
  const logFields = Object.entries(log.logAttributes ?? {})
    // the session id is the drawer's Session block
    .filter(([name]) => name !== SESSION_ATTR)
    .map(([name, value]) => ({
      name,
      value,
      key: isInternal(name) ? null : `attr.${name}`,
      multiline: value.includes('\n'),
      tone: toneOf(name, value),
    }))
    .sort(byLead(LEAD_ATTRIBUTES));
  const res = log.serviceName
    ? log.resourceAttributes
    : { ...log.resourceAttributes, 'service.name': NO_SERVICE };
  const resource = Object.entries(res ?? {})
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

export interface HeadFact {
  label: string;
  value: string;
  mono?: boolean;
  tone?: FieldTone;
  empty?: boolean;
  /** the rule key its value came from; none for a measure (the duration) */
  key?: string;
}

const fmtMs = (ms: number) =>
  ms >= 1000
    ? `${Number((ms / 1000).toFixed(ms >= 10_000 ? 0 : 2))} s`
    : `${Math.round(ms)} ms`;

/** who wrote the line, then the request it was about; every cell always present
    so the drawer head keeps one height across lines */
export function lineHeadFacts(t: TFunction, log: OtelLog): HeadFact[][] {
  const res = log.resourceAttributes ?? {};
  const a = log.logAttributes ?? {};
  const fact = (
    label: string,
    value: string | undefined,
    extra: Partial<HeadFact> = {},
  ): HeadFact =>
    value ? { label, value, ...extra } : { label, value: '', empty: true };
  const method = firstOf(a, METHOD_KEYS)?.value;
  const route = firstOf(a, ROUTE_KEYS);
  const status = firstOf(a, STATUS_KEYS);
  const env = firstOf(res, ENV_KEYS);
  const dur = firstOf(a, DURATION_MS_KEYS)?.value;
  const ms = dur && !Number.isNaN(Number(dur)) ? Number(dur) : null;
  return [
    [
      fact(t('Pod'), res['k8s.pod.name'], {
        mono: true,
        key: 'res.k8s.pod.name',
      }),
      fact(t('Environment'), env?.value, { key: env && `res.${env.name}` }),
      fact(t('Namespace'), res['k8s.namespace.name'], {
        key: 'res.k8s.namespace.name',
      }),
    ],
    [
      // filters by the route alone, the method is only in the words
      fact(
        t('Request'),
        route && (method ? `${method} ${route.value}` : route.value),
        { mono: true, key: route && `attr.${route.name}` },
      ),
      fact(t('Status'), status?.value, {
        mono: true,
        tone: toneOf('http.response.status_code', status?.value ?? ''),
        key: status && `attr.${status.name}`,
      }),
      fact(t('Duration'), ms != null ? fmtMs(ms) : undefined, {
        mono: true,
        tone: toneOf('duration_ms', dur ?? ''),
      }),
    ],
  ];
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
/** related lines shown on each side of the open one */
export const RELATED_SIDE = 150;
export type ExportFormat = 'csv' | 'json';
/** the search changed while an export loaded its lines */
export class SearchChangedError extends Error {}
export function exportLines(
  t: TFunction,
  logs: readonly OtelLog[],
  format: ExportFormat,
  columns: readonly string[],
): string {
  const slice = logs.slice(0, EXPORT_LIMIT);
  if (format === 'json')
    return slice
      .map((l) => {
        const body = bodyOf(l);
        return JSON.stringify({
          timestamp_utc: new Date(otelLogTimeMs(l)).toISOString(),
          ...otelRow(l),
          ...(body ? { body: body.json } : {}),
        });
      })
      .join('\n');
  const head = [
    'timestamp_utc',
    ...columns.map((c) => keyLabel(t, c)),
    t('Message'),
  ];
  const rows = slice.map((l) =>
    [
      new Date(otelLogTimeMs(l)).toISOString(),
      ...columns.map((c) => shownValue(t, l, c)),
      lineText(l),
    ]
      .map(csvCell)
      .join(','),
  );
  return [head.map(csvCell).join(','), ...rows].join('\n');
}

export function exportFileName(
  from: number,
  to: number,
  format: ExportFormat,
  zone: string,
) {
  const stamp = (ms: number) => logTime(ms, zone).toFormat('yyyy-MM-dd_HHmm');
  return `logs_${stamp(from)}_to_${stamp(to)}.${format === 'json' ? 'ndjson' : 'csv'}`;
}

/* ── drilldown ──────────────────────────────────────────────────────────── */

export const DRILL_VALUES = 5;

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
      if (!isFacetKey(k.key)) continue;
      if (scope === 'resource' && k.key === 'service.name') continue;
      cards.push({
        key: keyOf(scope, k.key),
        name: k.key,
        carried: Math.min(k.count, total),
      });
    }
  return cards.sort(
    (a, b) => b.carried - a.carried || a.name.localeCompare(b.name),
  );
}
