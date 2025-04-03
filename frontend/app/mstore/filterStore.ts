import { makeAutoObservable, runInAction } from 'mobx';
import { makePersistable } from 'mobx-persist-store';
import { filterService } from 'App/services';
import { Filter, Operator, COMMON_FILTERS, getOperatorsByType } from './types/filterConstants';
import { FilterKey } from 'Types/filter/filterType';
import { projectStore } from '@/mstore/index';

interface TopValue {
  rowCount?: number;
  rowPercentage?: number;
  value?: string;
}

interface TopValues {
  [key: string]: TopValue[];
}

interface ProjectFilters {
  [projectId: string]: Filter[];
}

export default class FilterStore {
  topValues: TopValues = {};
  filters: ProjectFilters = {};
  commonFilters: Filter[] = [];
  isLoadingFilters: boolean = true;

  filterCache: Record<string, Filter[]> = {};
  private pendingFetches: Record<string, Promise<Filter[]>> = {};

  constructor() {
    makeAutoObservable(this);

    // Set up persistence with 10-minute expiration
    /*void makePersistable(this, {
      name: 'FilterStore',
      // properties: ['filters', 'commonFilters'],
      properties: ['filters'],
      storage: window.localStorage,
      expireIn: 10 * 60 * 1000, // 10 minutes in milliseconds
      removeOnExpiration: true
    });*/

    // Initialize common static filters
    this.initCommonFilters();
  }

  setTopValues = (key: string, values: Record<string, any> | TopValue[]) => {
    const vals = Array.isArray(values) ? values : values.data;
    this.topValues[key] = vals?.filter(
      (value: any) => value !== null && value.value !== ''
    );
  };

  resetValues = () => {
    this.topValues = {};
  };

  fetchTopValues = async (id: string, siteId: string, source?: string) => {
    const valKey = `${siteId}_${id}${source || ''}`;

    if (this.topValues[valKey] && this.topValues[valKey].length) {
      return Promise.resolve(this.topValues[valKey]);
    }
    const filter = this.filters[siteId]?.find(i => i.id === id);
    if (!filter) {
      console.error('Filter not found in store:', id);
      return Promise.resolve([]);
    }
    return filterService.fetchTopValues(filter.name?.toLowerCase(), source).then((response: []) => {
      this.setTopValues(valKey, response);
    });
  };

  setFilters = (projectId: string, filters: Filter[]) => {
    this.filters[projectId] = filters;
  };

  getFilters = (projectId: string): Filter[] => {
    const filters = this.filters[projectId] || [];
    return this.addOperatorsToFilters(filters);
  };

  setIsLoadingFilters = (loading: boolean) => {
    this.isLoadingFilters = loading;
  };

  resetFilters = () => {
    this.filters = {};
  };

  processFilters = (filters: Filter[], category?: string): Filter[] => {
    return filters.map(filter => ({
      ...filter,
      possibleTypes: filter.possibleTypes?.map(type => type.toLowerCase()) || [],
      type: filter.possibleTypes?.[0].toLowerCase() || 'string',
      category: category || 'custom',
      subCategory: category === 'events' ? (filter.autoCaptured ? 'auto' : 'user') : category,
      displayName: filter.displayName || filter.name,
      icon: FilterKey.LOCATION, // TODO - use actual icons
      isEvent: category === 'events',
      value: filter.value || [],
      propertyOrder: 'and'
    }));
  };

  addOperatorsToFilters = (filters: Filter[]): Filter[] => {
    return filters.map(filter => ({
      ...filter
      // operators: filter.operators?.length ? filter.operators : getOperatorsByType(filter.possibleTypes || [])
    }));
  };

  // Modified to not add operators in cache
  fetchFilters = async (projectId: string): Promise<Filter[]> => {
    // Return cached filters with operators if available
    if (this.filters[projectId] && this.filters[projectId].length) {
      return Promise.resolve(this.getFilters(projectId));
    }

    this.setIsLoadingFilters(true);

    try {
      const response = await filterService.fetchFilters(projectId);

      const processedFilters: Filter[] = [];

      Object.keys(response.data).forEach((category: string) => {
        const { list, total } = response.data[category] || { list: [], total: 0 };
        const filters = this.processFilters(list, category);
        processedFilters.push(...filters);
      });

      this.setFilters(projectId, processedFilters);

      return this.getFilters(projectId);
    } catch (error) {
      console.error('Failed to fetch filters:', error);
      throw error;
    } finally {
      this.setIsLoadingFilters(false);
    }
  };

  initCommonFilters = () => {
    this.commonFilters = [...COMMON_FILTERS];
  };

  getAllFilters = (projectId: string): Filter[] => {
    const projectFilters = this.filters[projectId] || [];
    // return this.addOperatorsToFilters([...this.commonFilters, ...projectFilters]);
    return this.addOperatorsToFilters([...projectFilters]);
  };

  getCurrentProjectFilters = (): Filter[] => {
    return this.getAllFilters(projectStore.activeSiteId + '');
  };

  // getEventFilters = (eventName: string): Filter[] => {
  //   const filters = await filterService.fetchProperties(eventName)
  //   return filters;
  //   // const filters = this.getAllFilters(projectStore.activeSiteId + '');
  //   // return filters.filter(i => !i.isEvent); // TODO fetch from the API for this event and cache them
  // };

  getEventFilters = async (eventName: string): Promise<Filter[]> => {
    if (this.filterCache[eventName]) {
      return this.filterCache[eventName];
    }

    if (await this.pendingFetches[eventName]) {
      return this.pendingFetches[eventName];
    }

    try {
      this.pendingFetches[eventName] = this.fetchAndProcessPropertyFilters(eventName);
      const filters = await this.pendingFetches[eventName];

      runInAction(() => {
        this.filterCache[eventName] = filters;
      });

      delete this.pendingFetches[eventName];
      return filters;
    } catch (error) {
      delete this.pendingFetches[eventName];
      throw error;
    }
  };

  private fetchAndProcessPropertyFilters = async (eventName: string): Promise<Filter[]> => {
    const resp = await filterService.fetchProperties(eventName);
    const names = resp.data.map((i: any) => i['allProperties.PropertyName']);

    const activeSiteId = projectStore.activeSiteId + '';
    return this.filters[activeSiteId]?.filter((i: any) => names.includes(i.name)) || [];
  };

  setCommonFilters = (filters: Filter[]) => {
    this.commonFilters = filters;
  };
}
