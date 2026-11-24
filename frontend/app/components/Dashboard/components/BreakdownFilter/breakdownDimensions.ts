import { Filter } from '@/mstore/types/filterConstants';

/**
 * One breakdown as the API takes it: a plain dimension name from the `oneof`
 * list on Breakdowns in backend/pkg/analytics/model/model.go.
 */
export type Breakdown = string;

/** Object form a newer UI may have stored on a card. */
export type StoredBreakdown = string | { name: string };

/** `Breakdowns` is `max=3` on the API payload. */
export const MAX_BREAKDOWNS = 3;

/**
 * The only breakdown names the API accepts (validation on Breakdowns in
 * backend/pkg/analytics/model/model.go). Catalog entries whose name maps onto
 * one of these are sent under this key; anything else can't be a breakdown.
 */
export const CANONICAL_DIMENSIONS = [
  'userCountry',
  'userCity',
  'userState',
  'userBrowser',
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
  'currentPath',
  'referringDomain',
  'searchEngine',
  'httpMethod',
  'statusCode',
  'urlHost',
];

/** Dimensions the filters catalog publishes under a different name. */
const CATALOG_NAME_BY_DIMENSION: Record<string, string> = {
  httpMethod: 'method',
  statusCode: 'status',
  issueType: 'issue',
};

/**
 * Catalog buckets that name an event rather than describe one — you break down
 * by a property, not by "clicked Login".
 */
const NON_DIMENSION_CATEGORIES = new Set([
  'events',
  'auto_captured',
  'user_events',
  'segments',
  'features',
  'users',
]);

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

export const normalizeBreakdown = (breakdown: StoredBreakdown): Breakdown =>
  typeof breakdown === 'string' ? breakdown : breakdown.name;

export const breakdownName = normalizeBreakdown;

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
  !filter.isEvent &&
  !NON_DIMENSION_CATEGORIES.has(filter.category) &&
  canonicalDimension(filter.name) !== undefined;

/**
 * Options for the breakdown picker: catalog entries that map onto a dimension
 * the API accepts. The returned `name` is what goes to the API, the
 * `displayName` is the catalog label.
 */
export function buildBreakdownOptions(allFilters: Filter[]): Filter[] {
  const seen = new Set<string>();
  return allFilters.reduce<Filter[]>((acc, filter) => {
    if (!isBreakdownable(filter)) return acc;
    const name = canonicalDimension(filter.name) ?? filter.name;
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

export function toBreakdown(filter: Filter): Breakdown {
  return canonicalDimension(filter.name) ?? filter.name;
}

export function getBreakdownDisplayName(
  breakdown: StoredBreakdown,
  allFilters: Filter[],
): string {
  const name = breakdownName(breakdown);
  const source = findCatalogFilter(name, allFilters);
  return source?.displayName || source?.name || name;
}
