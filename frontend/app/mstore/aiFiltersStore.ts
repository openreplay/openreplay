import { FilterKey } from 'Types/filter/filterType';
import { filtersMap } from 'Types/filter/newFilter';
import { makeAutoObservable } from 'mobx';
import Search from 'App/mstore/types/search';
import { aiService } from 'App/services';

export default class AiFiltersStore {
  filters: Record<string, any> = { filters: [] };

  cardFilters: Record<string, any> = { filters: [] };

  filtersSetKey = 0;

  isLoading: boolean = false;

  query: string = '';

  modalOpen: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  setQuery = (query: string): void => {
    this.query = query;
  };

  setModalOpen = (isOpen: boolean): void => {
    this.modalOpen = isOpen;
  };

  setFilters = (filters: Record<string, any>): void => {
    this.filters = filters;
    this.filtersSetKey += 1;
  };

  setCardFilters = (filters: Record<string, any>): void => {
    this.cardFilters = filters;
    this.filtersSetKey += 1;
  };

  getCardData = async (query: string, chartData: Record<string, any>) => {
    const r = await aiService.getCardData(query, chartData);
    console.log(r);
  };

  omniSearch = async (query: string, filters: Record<any, any>) => {
    const r = await aiService.omniSearch(query, filters);
    console.log(r);
  };

  setLoading = (loading: boolean): void => {
    this.isLoading = loading;
  };

  getCardFilters = async (query: string, chartType?: string): Promise<any> => {
    this.setLoading(true);
    try {
      const r = await aiService.getCardFilters(query, chartType);
      const filterObj = Filter({
        filters: r.filters.map((f: Record<string, any>) => {
          if (f.key === 'fetch') {
            return mapFetch(f);
          }
          if (f.key === 'graphql') {
            return mapGraphql(f);
          }

          const matchingFilter = Object.keys(filtersMap).find((k) =>
            f.key === 'metadata' ? `_${f.source}` === k : f.key === k,
          );

          if (f.key === 'duration') {
            const filter = matchingFilter
              ? { ...filtersMap[matchingFilter], ...f }
              : { ...f, value: f.value ?? [] };
            return {
              type: filter.key,
              ...filter,
              value: filter.value
                ? filter.value.map((i: string) => parseInt(i, 10) * 60 * 1000)
                : null,
            };
          }

          return matchingFilter
            ? { ...filtersMap[matchingFilter], ...f }
            : { ...f, value: f.value ?? [] };
        }),
        eventsOrder: r.eventsOrder.toLowerCase(),
      });

      this.setCardFilters(filterObj);
      return filterObj.toJS();
    } catch (e) {
      console.trace(e);
    } finally {
      this.setLoading(false);
    }
  };

  getSearchFilters = async (query: string): Promise<any> => {
    this.isLoading = true;
    try {
      const r = await aiService.getSearchFilters(query);
      const filterObj = new Search({
        filters: r.filters.map((f: Record<string, any>) => {
          if (f.key === 'fetch') {
            return mapFetch(f);
          }
          if (f.key === 'graphql') {
            return mapGraphql(f);
          }

          const matchingFilter = Object.keys(filtersMap).find((k) =>
            f.key === 'metadata' ? `_${f.source}` === k : f.key === k,
          );

          if (f.key === 'duration') {
            const filter = matchingFilter
              ? { ...filtersMap[matchingFilter], ...f }
              : { ...f, value: f.value ?? [] };
            return {
              ...filter,
              value: filter.value
                ? filter.value.map((i: string) => parseInt(i, 10) * 60 * 1000)
                : null,
            };
          }

          return matchingFilter
            ? { ...filtersMap[matchingFilter], ...f }
            : { ...f, value: f.value ?? [] };
        }),
        eventsOrder: r.eventsOrder.toLowerCase(),
      });

      this.setFilters(filterObj);
      return r;
    } catch (e) {
      console.trace(e);
    } finally {
      this.isLoading = false;
    }
  };
}

const defaultFetchFilter = {
  value: [],
  key: FilterKey.FETCH,
  type: FilterKey.FETCH,
  operator: 'is',
  isEvent: true,
  filters: [
    {
      value: [],
      type: 'fetchUrl',
      operator: 'is',
      filters: [],
    },
    {
      value: ['200'],
      type: 'fetchStatusCode',
      operator: '>',
      filters: [],
    },
    {
      value: [],
      type: 'fetchMethod',
      operator: 'is',
      filters: [],
    },
    {
      value: [],
      type: 'fetchDuration',
      operator: '=',
      filters: [],
    },
    {
      value: [],
      type: 'fetchRequestBody',
      operator: 'is',
      filters: [],
    },
    {
      value: [],
      type: 'fetchResponseBody',
      operator: 'is',
      filters: [],
    },
  ],
};

const defaultGraphqlFilter = {
  filters: [
    {
      filters: [],
      operator: 'is',
      type: 'graphqlName',
      value: [],
    },
    {
      filters: [],
      operator: 'is',
      type: 'graphqlMethod',
      value: [],
    },
    {
      filters: [],
      operator: 'is',
      type: 'graphqlRequestBody',
      value: [],
    },
    {
      filters: [],
      operator: 'is',
      type: 'graphqlResponseBody',
      value: [],
    },
  ],
  isEvent: true,
  operator: 'is',
  type: 'graphql',
  value: [],
};

export function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

const updateFilters = (
  defaultFilters: (typeof defaultFetchFilter)['filters'],
  backendFilters: Record<string, any>,
): (typeof defaultFetchFilter)['filters'] => {
  const updatedFilters = [...defaultFilters]; // Clone the default filters

  backendFilters.forEach((backendFilter) => {
    const index = updatedFilters.findIndex((f) => f.type === backendFilter.key);
    if (index > -1) {
      updatedFilters[index] = {
        ...updatedFilters[index],
        ...backendFilter,
        type: updatedFilters[index].type,
      };
    }
  });

  return updatedFilters;
};

const mapFetch = (filter: Record<string, any>): Record<string, any> => ({
  ...defaultFetchFilter,
  filters: updateFilters(defaultFetchFilter.filters, filter.filters),
});

const mapGraphql = (filter: Record<string, any>) => ({
  ...defaultGraphqlFilter,
  filters: updateFilters(defaultGraphqlFilter.filters, filter.filters),
});
