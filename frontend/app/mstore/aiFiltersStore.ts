import { makeAutoObservable } from 'mobx';

export default class AiFiltersStore {
  filters: Record<string, any> = { filters: [] };

  filtersSetKey = 0;

  isLoading: boolean = false;

  query: string = '';

  constructor() {
    makeAutoObservable(this);
  }

  setQuery = (query: string): void => {
    this.query = query;
  };

  setFilters = (filters: Record<string, any>): void => {
    this.filters = filters;
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
