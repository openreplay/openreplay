import { Filter } from '@/mstore/types/filterConstants';

/**
 * Breakdown keys the API accepts, as declared in
 * backend/pkg/analytics/charts/breakdown.go (breakdownDimensions) and enforced
 * by the `oneof` tag on Card.Breakdowns. Anything outside this list is a 400.
 */
export const BREAKDOWN_DIMENSIONS = [
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

/** `$current_path` and `current_path` both collapse to `currentpath`. */
const normalizeName = (name: string) =>
  name
    .replace(/^\$/, '')
    .replace(/_(\w)/g, (_, c: string) => c.toUpperCase())
    .toLowerCase();

function findCatalogFilter(
  dimension: string,
  allFilters: Filter[],
): Filter | undefined {
  const catalogName = CATALOG_NAME_BY_DIMENSION[dimension] ?? dimension;
  const exact = allFilters.find((f) => f.name === catalogName);
  if (exact) return exact;
  const target = normalizeName(catalogName);
  return allFilters.find((f) => normalizeName(f.name) === target);
}

/**
 * Options for the breakdown picker: every catalog entry (session filters, user
 * filters, event properties) whose name resolves to a supported dimension. The
 * returned `name` is the dimension key sent to the API, the `displayName` is
 * the catalog label.
 */
export function buildBreakdownOptions(allFilters: Filter[]): Filter[] {
  return BREAKDOWN_DIMENSIONS.reduce<Filter[]>((acc, dimension) => {
    const source = findCatalogFilter(dimension, allFilters);
    if (source) {
      acc.push({
        ...source,
        name: dimension,
        displayName: source.displayName || source.name,
      });
    }
    return acc;
  }, []);
}

export function getBreakdownDisplayName(
  dimension: string,
  allFilters: Filter[],
): string {
  const source = findCatalogFilter(dimension, allFilters);
  return source?.displayName || source?.name || dimension;
}
