import { makeAutoObservable } from 'mobx';
import { aiService } from 'App/services';
import Filter from 'Types/filter';
import { FilterKey } from 'Types/filter/filterType';

export default class AiFiltersStore {
  filters: Record<string, any> = { filters: [] };
  filtersSetKey = 0;
  isLoading: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  setFilters = (filters: Record<string, any>): void => {
    this.filters = filters;
    this.filtersSetKey += 1;
  };

  getSearchFilters = async (query: string): Promise<any> => {
    this.isLoading = true;
    try {
      const r = await aiService.getSearchFilters(query);
      const filterObj = Filter({
        filters: r.filters.map((f: Record<string, any>) => {
          if (f.key === 'fetch') {
            return mapFetch(f);
          } else {
            return { ...f, value: f.value ?? [] };
          }
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

export function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

const updateFilters = (defaultFilters: typeof defaultFetchFilter['filters'], backendFilters: Record<string, any>): typeof defaultFetchFilter['filters'] => {
  const updatedFilters = [...defaultFilters]; // Clone the default filters

  backendFilters.forEach(backendFilter => {
    const index = updatedFilters.findIndex(f => f.type === backendFilter.key);
    if (index > -1) {
      updatedFilters[index] = { ...updatedFilters[index], ...backendFilter, type: updatedFilters[index].type };
    }
  });

  return updatedFilters;
};

const mapFetch = (filter: Record<string, any>): Record<string, any> => {
  return { ...defaultFetchFilter, filters: updateFilters(defaultFetchFilter.filters, filter.filters) }
};
