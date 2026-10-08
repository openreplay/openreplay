import type { TFunction } from 'i18next';

import type { Filter } from 'App/mstore/types/filterConstants';
import { getOperatorsByType } from 'App/mstore/types/filterConstants';

import type { CatalogueEntry, DataType, SearchFilter } from './types';

const NULLARY = new Set([
  'isAny',
  'onAny',
  'isUndefined',
  'isTrue',
  'isFalse',
  'isBlank',
  'isNotBlank',
  'isEmpty',
  'isNotEmpty',
]);

export const isDuration = (f: Pick<Filter, 'name' | 'autoCaptured'>) =>
  f.name === 'duration' && !!f.autoCaptured;

export function dataTypeOf(f: Filter): DataType {
  if (isDuration(f)) return 'duration';
  switch ((f.dataType ?? 'string').toLowerCase()) {
    case 'number':
    case 'int':
    case 'float':
      return 'number';
    case 'bool':
    case 'boolean':
      return 'boolean';
    case 'date':
    case 'timestamp':
      return 'date';
    case 'array':
      return 'array';
    default:
      return 'string';
  }
}

export function entryFromFilter(f: Filter): CatalogueEntry {
  const category = (f.category ?? 'custom').toLowerCase();
  const isEvent = !!f.isEvent;
  const options =
    (f as any).isPredefined && (f as any).possibleValues?.length
      ? (f as any).possibleValues.map((v: any) => ({
          value: String(v.value),
          label: String(v.label ?? v.value),
        }))
      : undefined;
  return {
    id: String(f.id ?? f.name),
    name: f.name,
    displayName: f.displayName || f.name,
    category,
    isEvent,
    dataType: dataTypeOf(f),
    hasProperties:
      isEvent && category !== 'segments' && category !== 'features',
    autoCaptured: !!f.autoCaptured,
    options,
    source: f,
  };
}

export interface OperatorOption {
  value: string;
  label: string;
}

export const operatorsFor = (
  t: DataType,
  live = false,
): readonly OperatorOption[] => {
  if (t === 'duration') return [{ value: '=', label: 'is' }];
  const all = getOperatorsByType(t === 'date' ? 'date' : t);
  return (
    live ? all.filter((o) => o.value === 'is' || o.value === 'contains') : all
  ).map((o) => ({ value: o.value, label: o.label }));
};

export const isNullary = (operator: string) => NULLARY.has(operator);

export const defaultOperator = (t: DataType) =>
  t === 'boolean' ? 'isTrue' : (operatorsFor(t)[0]?.value ?? 'is');

export const CATEGORY_ORDER: readonly string[] = [
  'auto_captured',
  'user_events',
  'features',
  'segments',
  'user',
  'users',
  'session',
  'event',
  'metadata',
];

const CATEGORY_LABELS: Record<string, string> = {
  auto_captured: 'Autocapture',
  user_events: 'Events',
  event: 'Event properties',
};

export const categoryLabel = (key: string): string =>
  CATEGORY_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);

export interface CatalogueGroup {
  key: string;
  label: string;
  entries: CatalogueEntry[];
}

export function groupCatalogue(
  entries: readonly CatalogueEntry[],
): CatalogueGroup[] {
  const byCat = new Map<string, CatalogueEntry[]>();
  for (const e of entries) {
    const list = byCat.get(e.category) ?? [];
    list.push(e);
    byCat.set(e.category, list);
  }
  const known = CATEGORY_ORDER.filter((k) => byCat.has(k));
  const rest = [...byCat.keys()]
    .filter((k) => !CATEGORY_ORDER.includes(k))
    .sort();
  return [...known, ...rest].map((key) => ({
    key,
    label: categoryLabel(key),
    entries: byCat.get(key)!,
  }));
}

export function searchCatalogue(
  query: string,
  entries: readonly CatalogueEntry[],
): CatalogueEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...entries];
  return entries.filter(
    (e) =>
      e.displayName.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q) ||
      categoryLabel(e.category).toLowerCase().includes(q),
  );
}

/** A fresh store filter for a picked entry. */
export function storeFilterFor(entry: CatalogueEntry, eventName?: string) {
  const presetValue =
    entry.category === 'segments' || entry.category === 'features';
  const { toJSON: _drop, ...src } = entry.source as Filter & {
    toJSON?: unknown;
  };
  const filter: Filter = {
    ...src,
    value: presetValue ? [...(src.value ?? [])] : [],
    operator: entry.isEvent ? 'is' : defaultOperator(entry.dataType),
    filters: [],
    propertyOrder: 'and',
  } as unknown as Filter;
  if (eventName) (filter as any).eventName = eventName;
  return filter;
}

const toSeconds = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n / 1000) : undefined;
};

/** The view model of one store filter. */
export function viewOf(
  f: Filter,
  key: string,
  eventName?: string,
): SearchFilter {
  const entry = entryFromFilter(f);
  const value = (f.value ?? []).map((v) => (v == null ? '' : String(v)));
  const view: SearchFilter = {
    key,
    entry,
    isEvent: entry.isEvent,
    operator: f.operator ?? (entry.isEvent ? 'is' : 'is'),
    value: value.filter((v) => v !== ''),
    eventName,
  };
  if (entry.dataType === 'duration') {
    view.min = toSeconds(f.value?.[0]);
    view.max = toSeconds(f.value?.[1]);
  }
  if (entry.isEvent) {
    view.properties = (f.filters ?? []).map((p, j) =>
      viewOf(p, `${key}.${j}`, f.name),
    );
    view.propertyOrder = (f.propertyOrder as 'and' | 'or') ?? 'and';
  }
  return view;
}

/** Merge a view-model patch back into the store filter. */
export function applyPatch(f: Filter, patch: Partial<SearchFilter>): Filter {
  const next: Filter = { ...f };
  if (patch.operator !== undefined) next.operator = patch.operator;
  if (patch.value !== undefined) next.value = patch.value;
  if (patch.min !== undefined || patch.max !== undefined) {
    const lo = patch.min ?? toSeconds(f.value?.[0]) ?? 0;
    const hi = patch.max ?? toSeconds(f.value?.[1]) ?? 0;
    next.value = [String(lo * 1000), String(hi * 1000)];
  }
  return next;
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export function describeFilter(t: TFunction, f: SearchFilter): string {
  const { entry } = f;
  const name = entry.displayName;
  if (entry.category === 'segments') return t('in {{name}}', { name });
  if (entry.category === 'features') return t('{{name}} is on', { name });
  if (entry.isEvent) {
    const props = f.properties?.length
      ? ` ${t('where')} ${f.properties.map((p) => describeFilter(t, p)).join(` ${f.propertyOrder ?? 'and'} `)}`
      : '';
    return `${name}${props}`;
  }
  if (entry.dataType === 'duration') {
    const lo = f.min ?? 0;
    const hi = f.max ?? 0;
    if (!lo && !hi) return t('{{name}} is any', { name });
    if (lo && hi)
      return `${name} ${formatDuration(lo)} – ${formatDuration(hi)}`;
    return `${name} > ${formatDuration(lo || hi)}`;
  }
  const op =
    operatorsFor(entry.dataType).find((o) => o.value === f.operator)?.label ??
    f.operator;
  if (isNullary(f.operator)) return `${name} ${op}`;
  return f.value.length
    ? `${name} ${op} ${f.value.join(', ')}`
    : `${name} ${op}…`;
}

export function describeRules(
  t: TFunction,
  events: readonly SearchFilter[],
  properties: readonly SearchFilter[],
  order: string,
): string {
  if (!events.length && !properties.length) return t('Every session');
  const parts: string[] = [];
  if (events.length)
    parts.push(events.map((e) => describeFilter(t, e)).join(` ${order} `));
  if (properties.length)
    parts.push(properties.map((p) => describeFilter(t, p)).join(' and '));
  return parts.join(', ');
}

export function summariseRules(
  t: TFunction,
  events: readonly SearchFilter[],
  properties: readonly SearchFilter[],
): string {
  const parts: string[] = [];
  if (events.length)
    parts.push(t('{{count}} events', { count: events.length }));
  if (properties.length)
    parts.push(t('{{count}} group filters', { count: properties.length }));
  return parts.join(' · ');
}
