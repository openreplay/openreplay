import { FilterKey } from 'Types/filter/filterType';
import { makeAutoObservable } from 'mobx';

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

  clearFilters = (): void => {
    this.filters = { filters: [] };
    this.filtersSetKey = 0;
  };

  setLoading = (loading: boolean): void => {
    this.isLoading = loading;
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
