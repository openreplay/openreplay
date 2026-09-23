import { Filter } from '@/mstore/types/filterConstants';

/**
 * One breakdown as the API takes it (model.Breakdown in
 * backend/pkg/analytics/model/model.go). The API also accepts a bare string,
 * which is how cards were saved before event properties were supported.
 */
export interface Breakdown {
  name: string;
  isEvent?: boolean;
  autoCaptured?: boolean;
}

export type StoredBreakdown = string | Breakdown;

/** `Breakdowns` is `max=3` on the API payload. */
export const MAX_BREAKDOWNS = 3;

/**
 * Dimensions the API resolves to a dedicated column instead of a generic
 * property lookup (breakdownDimensions in
 * backend/pkg/analytics/charts/breakdown.go). Catalog entries whose name maps
 * onto one of these are sent under the canonical key so they keep taking that
 * path; everything else goes through as its plain catalog name.
 */
export const CANONICAL_DIMENSIONS = [
  'userCountry',
  'userCity',
  'userState',
  'userBrowser',
  'userBrowserVersion',
  'userDevice',
  'userOs',
  'referrer',
  'userId',
  'platform',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'userDeviceType',
  'revId',
  'issueType',
  'duration',
  'screenHeight',
  'screenWidth',
  'currentPath',
  'referringDomain',
  'searchEngine',
  'httpMethod',
  'statusCode',
  'urlHost',
];

/**
 * Dimensions the API resolves from event columns even when `isEvent` is set.
 * Any other canonical name on an event property would skip its dimension and
 * be looked up as a dynamic key under the wrong name.
 */
const EVENT_ONLY_DIMENSIONS = new Set([
  'currentPath',
  'referringDomain',
  'searchEngine',
  'httpMethod',
  'statusCode',
  'urlHost',
]);

/** Dimensions the filters catalog publishes under a different name. */
const CATALOG_NAME_BY_DIMENSION: Record<string, string> = {
  httpMethod: 'method',
  statusCode: 'status',
  issueType: 'issue',
};

/**
 * Catalog buckets that name an event rather than describe one — you break down
 * by a property, not by "clicked Login". Everything else (session, user,
 * identified-user and metadata filters, plus every event property) is fair game.
 */
const NON_DIMENSION_CATEGORIES = new Set([
  'events',
  'auto_captured',
  'user_events',
  'segments',
  'features',
  'users',
]);

/** The `event` section of the filters catalog holds the event properties. */
const EVENT_PROPERTY_CATEGORY = 'event';

/** `$current_path` and `current_path` both collapse to `currentpath`. */
const normalizeName = (name: string) =>
  name
    .replace(/^\$/, '')
    .replace(/_(\w)/g, (_, c: string) => c.toUpperCase())
    .toLowerCase();

const CANONICAL_BY_NORMALIZED_NAME = CANONICAL_DIMENSIONS.reduce<
  Record<string, string>
>((acc, dimension) => {
  acc[normalizeName(dimension)] = dimension;
  const catalogName = CATALOG_NAME_BY_DIMENSION[dimension];
  if (catalogName) acc[normalizeName(catalogName)] = dimension;
  return acc;
}, {});

const canonicalDimension = (name: string): string | undefined =>
  CANONICAL_BY_NORMALIZED_NAME[normalizeName(name)];

/** Event property `user_id` must not turn into (and shadow) the `userId` dimension. */
const dimensionName = (filter: Filter): string => {
  const canonical = canonicalDimension(filter.name);
  if (!canonical) return filter.name;
  if (
    filter.category === EVENT_PROPERTY_CATEGORY &&
    !EVENT_ONLY_DIMENSIONS.has(canonical)
  )
    return filter.name;
  return canonical;
};

export const normalizeBreakdown = (breakdown: StoredBreakdown): Breakdown =>
  typeof breakdown === 'string' ? { name: breakdown } : breakdown;

export const breakdownName = (breakdown: StoredBreakdown): string =>
  normalizeBreakdown(breakdown).name;

function findCatalogFilter(
  name: string,
  allFilters: Filter[],
): Filter | undefined {
  const exact = allFilters.find((f) => f.name === name);
  if (exact) return exact;
  const catalogName = CATALOG_NAME_BY_DIMENSION[name];
  if (catalogName) {
    const aliased = allFilters.find((f) => f.name === catalogName);
    if (aliased) return aliased;
  }
  const target = normalizeName(catalogName ?? name);
  return allFilters.find((f) => normalizeName(f.name) === target);
}

const isBreakdownable = (filter: Filter): boolean =>
  !filter.isEvent && !NON_DIMENSION_CATEGORIES.has(filter.category);

/**
 * Options for the breakdown picker: every catalog entry that describes a
 * session, user or event rather than naming one — session/user/metadata
 * filters plus the full event-property list. The returned `name` is what goes
 * to the API, the `displayName` is the catalog label.
 */
export function buildBreakdownOptions(allFilters: Filter[]): Filter[] {
  const seen = new Set<string>();
  return allFilters.reduce<Filter[]>((acc, filter) => {
    if (!isBreakdownable(filter)) return acc;
    const name = dimensionName(filter);
    // The API rejects duplicate breakdown names, so one entry wins per name.
    if (seen.has(name)) return acc;
    seen.add(name);
    acc.push({
      ...filter,
      name,
      displayName: filter.displayName || filter.name,
    });
    return acc;
  }, []);
}

/**
 * Picker option -> API breakdown. `isEvent` is what tells the API to look the
 * name up in the event properties; without it a custom property that shares a
 * name with a session column would resolve to the wrong one.
 */
export function toBreakdown(filter: Filter): Breakdown {
  const breakdown: Breakdown = {
    name: dimensionName(filter),
  };
  if (filter.category === EVENT_PROPERTY_CATEGORY) {
    breakdown.isEvent = true;
    if (filter.autoCaptured) breakdown.autoCaptured = true;
  }
  return breakdown;
}

export function getBreakdownDisplayName(
  breakdown: StoredBreakdown,
  allFilters: Filter[],
): string {
  const name = breakdownName(breakdown);
  const source = findCatalogFilter(name, allFilters);
  return source?.displayName || source?.name || name;
}
