import { Filter } from '@/mstore/types/filterConstants';
import { getFilterKeyTypeByKey } from 'Types/filter/filterType';

const EXCLUDED_QUERY_PARAMS = new Set(['sid']);

type FilterIdentity = Pick<Filter, 'name' | 'isEvent' | 'autoCaptured'>;

const getFilterIdentity = (filter: Partial<FilterIdentity>): string => {
  return `${filter.name || ''}:${Boolean(filter.isEvent)}:${Boolean(
    filter.autoCaptured,
  )}`;
};

const getMappedFilterName = (queryParamKey: string): string | undefined => {
  return (
    getFilterKeyTypeByKey(queryParamKey) ||
    getFilterKeyTypeByKey(queryParamKey.toLowerCase())
  );
};

const appendUniqueValues = (target: string[], incoming: string[]) => {
  incoming.forEach((value) => {
    if (!target.includes(value)) {
      target.push(value);
    }
  });
};

export const getFiltersFromQueryParams = (
  searchParams: URLSearchParams,
  availableFilters: Filter[],
): Filter[] => {
  if (!availableFilters?.length) {
    return [];
  }

  const filterByName = new Map<string, Filter>(
    availableFilters.map((filter) => [filter.name, filter]),
  );
  const filterValuesByName = new Map<string, string[]>();

  const queryKeys = Array.from(new Set(Array.from(searchParams.keys())));

  queryKeys.forEach((queryKey) => {
    if (EXCLUDED_QUERY_PARAMS.has(queryKey.toLowerCase())) {
      return;
    }

    const mappedFilterName = getMappedFilterName(queryKey);
    if (!mappedFilterName || !filterByName.has(mappedFilterName)) {
      return;
    }

    const values = searchParams
      .getAll(queryKey)
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length === 0) {
      return;
    }

    const collectedValues = filterValuesByName.get(mappedFilterName) || [];
    appendUniqueValues(collectedValues, values);
    filterValuesByName.set(mappedFilterName, collectedValues);
  });

  return Array.from(filterValuesByName.entries()).map(([filterName, value]) => {
    const baseFilter = filterByName.get(filterName)!;
    return {
      ...baseFilter,
      value,
      filters: [],
      operator: baseFilter.operator || 'is',
      propertyOrder: baseFilter.propertyOrder || 'and',
    };
  });
};

export const mergeFiltersWithUrlFilters = (
  existingFilters: Filter[],
  urlFilters: Filter[],
): Filter[] => {
  if (!urlFilters.length) {
    return existingFilters;
  }

  const urlFilterIdentities = new Set(
    urlFilters.map((filter) => getFilterIdentity(filter)),
  );

  const preservedFilters = existingFilters.filter(
    (filter) => !urlFilterIdentities.has(getFilterIdentity(filter)),
  );

  return [...preservedFilters, ...urlFilters];
};
