import { makeAutoObservable, runInAction } from 'mobx';
import { filterService, searchService } from 'App/services';
import { Filter, COMMON_FILTERS } from './types/filterConstants';
import { projectStore } from '@/mstore/index';
import FilterItem from './types/filterItem';

export interface TopValue {
  rowCount?: number;
  rowPercentage?: number;
  value?: string;
}

export interface TopValues {
  [key: string]: TopValue[];
}

interface ProjectFilters {
  [projectId: string]: Filter[];
}

interface TopValuesParams {
  id?: string;
  siteId?: string;
  source?: string;
  isAutoCapture?: boolean;
  isEvent?: boolean;
}

interface FilterOption {
  label: string;
  value: string;
}

interface CacheEntry {
  data: Filter[];
  timestamp: number;
}

// Constants
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

export default class FilterStore {
  topValues: TopValues = {};
  filters: ProjectFilters = {};
  commonFilters: Filter[] = [];
  isLoadingFilters: boolean = true;

  private filterCache: Record<string, CacheEntry> = {};
  private pendingFetches: Record<string, Promise<Filter[]>> = {};

  constructor() {
    makeAutoObservable(this);
    this.initCommonFilters();
  }

  getEventOptions = (siteId: string): FilterOption[] => {
    return this.getFilters(siteId)
      .filter((filter: Filter) => filter.isEvent)
      .map((filter: Filter) => ({
        label: filter.displayName || filter.name,
        value: filter.name,
      }));
  };

  setTopValues = (
    key: string,
    values: Record<string, any> | TopValue[],
  ): void => {
    const vals = Array.isArray(values) ? values : values.data;
    this.topValues[key] =
      vals?.filter((value: any) => value !== null && value?.value !== '') || [];
  };

  resetValues = (): void => {
    this.topValues = {};
  };

  fetchTopValues = async (id: string): Promise<TopValue[]> => {
    if (this.topValues[id]?.length) {
      return this.topValues[id];
    }

    const filter = this.findFilterById(id);
    if (!filter) {
      console.warn(`Filter not found for ID: ${id}`);
      return [];
    }

    try {
      const params: Record<string, any> = {};

      if (filter.eventName) {
        params.eventName = filter.eventName;
      }

      if (!filter.isEvent) {
        params.propertyName = filter.name;
      }

      const response = await searchService.fetchTopValues(params);

      runInAction(() => {
        this.setTopValues(id, response.events);
      });

      return response.events || [];
    } catch (error) {
      console.error('Failed to fetch top values:', error);
      return [];
    }
  };

  private createTopValuesKey = (params: TopValuesParams): string => {
    return `${params.siteId}_${params.id}${params.source || ''}`;
  };

  private findFilterById = (id: string): Filter | undefined => {
    const siteId = projectStore.activeSiteId + '';
    const search = (filtersToSearch: Filter[]): Filter | undefined => {
      for (const filter of filtersToSearch) {
        if (filter.id === id) {
          return filter;
        }

        if (filter.filters && filter.filters.length > 0) {
          console.log('searching nested filters');
          const foundInNested = search(filter.filters);
          if (foundInNested) {
            foundInNested.eventName = filter.name;
            return foundInNested;
          }
        }
      }

      // // If not found in current level, continue searching in this.filterCache which is stored with event level id
      // const foundInCache = this.filterCache[siteId]?.find((f) => f.id === id);
      // if (foundInCache) {
      //   return foundInCache;
      // }

      return undefined;
    };

    const topLevelFilters = this.filters[siteId];

    return topLevelFilters ? search(topLevelFilters) : undefined;
  };

  setFilters = (projectId: string, filters: Filter[]): void => {
    this.filters[projectId] = filters;
  };

  getFilters = (projectId: string): Filter[] => {
    const filters = this.filters[projectId] || [];
    return this.addOperatorsToFilters(filters);
  };

  setIsLoadingFilters = (loading: boolean): void => {
    this.isLoadingFilters = loading;
  };

  resetFilters = (): void => {
    this.filters = {};
    this.clearCache();
  };

  private clearCache = (): void => {
    this.filterCache = {};
    this.pendingFetches = {};
  };

  processFilters = (filters: any[], category?: string): Filter[] => {
    return filters.map((filter) => ({
      ...filter,
      id: Math.random().toString(36).substring(2, 9),
      possibleTypes:
        filter.possibleTypes?.map((type) => type.toLowerCase()) || [],
      dataType: filter.dataType || 'string',
      category: category || 'custom',
      subCategory: this.determineSubCategory(category, filter),
      displayName: filter.displayName || filter.name,
      // icon: FilterKey.LOCATION, // TODO - use actual icons
      isEvent: category === 'events',
      value: filter.value || [],
      propertyOrder: 'and',
      operator: filter.operator || 'is',
      defaultProperty: Boolean(filter.defaultProperty) || false,
      autoCaptured: filter.autoCaptured || false,
    }));
  };

  processFiltersFromData = (data: any[]): FilterItem[] => {
    const projectId = projectStore.activeSiteId + '';
    const filters = this.filters[projectId] || [];

    return data.map((f) => {
      const source = filters.find(
        (filter) =>
          filter.name === f.name &&
          Boolean(filter.autoCaptured) === Boolean(f.autoCaptured) &&
          Boolean(filter.isEvent) === Boolean(f.isEvent),
      );

      if (!source) return new FilterItem(f);

      const cloned = JSON.parse(JSON.stringify(source));
      cloned.value = f.value ?? [];

      if (Array.isArray(f.filters)) {
        cloned.filters = this.processFiltersFromData(f.filters);
      }

      return new FilterItem(cloned);
    });
  };

  private determineSubCategory = (
    category: string | undefined,
    filter: Filter,
  ): string | undefined => {
    if (category === 'events') {
      return filter.autoCaptured ? 'autocapture' : 'user';
    }
    return category;
  };

  addOperatorsToFilters = (filters: Filter[]): Filter[] => {
    // Currently just returns filters as-is, but keeping for future enhancements
    return filters.map((filter) => ({ ...filter }));
  };

  fetchFilters = async (projectId: string): Promise<Filter[]> => {
    // Return cached filters if available
    if (this.filters[projectId]?.length) {
      return this.getFilters(projectId);
    }

    this.setIsLoadingFilters(true);

    try {
      const response = await filterService.fetchFilters(projectId);
      const processedFilters = this.processFilterResponse(response.data);

      runInAction(() => {
        this.setFilters(projectId, processedFilters);
      });

      return this.getFilters(projectId);
    } catch (error) {
      console.error('Failed to fetch filters:', error);
      throw error;
    } finally {
      runInAction(() => {
        this.setIsLoadingFilters(false);
      });
    }
  };

  private processFilterResponse = (data: Record<string, any>): Filter[] => {
    const processedFilters: Filter[] = [];

    Object.entries(data).forEach(([category, categoryData]) => {
      const { list = [], total = 0 } = categoryData || {};
      const filters = this.processFilters(list, category);
      processedFilters.push(...filters);
    });

    return processedFilters;
  };

  initCommonFilters = (): void => {
    this.commonFilters = [...COMMON_FILTERS];
  };

  getAllFilters = (projectId: string): Filter[] => {
    const projectFilters = this.filters[projectId] || [];
    return this.addOperatorsToFilters([...projectFilters]);
  };

  getCurrentProjectFilters = (): Filter[] => {
    return this.getAllFilters(String(projectStore.activeSiteId)).map(
      (filter) => {
        filter.filters = [];
        return filter;
      },
    );
  };

  setEventFilters = async (
    eventId: string,
    filters: Filter[],
  ): Promise<void> => {
    const event = this.findFilterById(eventId);
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    runInAction(() => {
      event.filters = filters;
    });
  };

  getEventFilters = async (eventId: string): Promise<Filter[]> => {
    const event = this.findFilterById(eventId);
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const cacheKey = event?.id;

    // Check cache with TTL
    // const cachedEntry = this.filterCache[cacheKey];
    // if (cachedEntry && this.isCacheValid(cachedEntry)) {
    //   return cachedEntry.data;
    // }

    // Return pending fetch if in progress
    if (this.pendingFetches[cacheKey]) {
      return this.pendingFetches[cacheKey];
    }

    try {
      this.pendingFetches[cacheKey] = this.fetchAndProcessPropertyFilters(
        event.name,
        event.autoCaptured,
      );

      const filters = await this.pendingFetches[cacheKey];
      this.setEventFilters(eventId, filters);

      runInAction(() => {
        this.setCacheEntry(cacheKey, filters);
      });

      return filters;
    } catch (error) {
      console.error('Failed to fetch event filters:', error);
      throw error;
    } finally {
      delete this.pendingFetches[cacheKey];
    }
  };

  private isCacheValid = (entry: CacheEntry): boolean => {
    return Date.now() - entry.timestamp < CACHE_TTL;
  };

  private setCacheEntry = (key: string, data: Filter[]): void => {
    // Implement simple LRU by removing oldest entries
    if (Object.keys(this.filterCache).length >= MAX_CACHE_SIZE) {
      const oldestKey = Object.keys(this.filterCache)[0];
      delete this.filterCache[oldestKey];
    }

    this.filterCache[key] = {
      data,
      timestamp: Date.now(),
    };
  };

  private fetchAndProcessPropertyFilters = async (
    eventName: string,
    isAutoCapture?: boolean,
  ): Promise<Filter[]> => {
    try {
      const response = await filterService.fetchProperties(
        eventName,
        isAutoCapture,
      );

      return this.processFilters(response.data);
      // const propertyNames = response.data.map((item: any) => item.name);

      // const activeSiteId = String(projectStore.activeSiteId);
      // const siteFilters = this.filters[activeSiteId] || [];

      // return siteFilters
      //   .filter((filter: Filter) => propertyNames.includes(filter.name))
      //   .map((filter: Filter) => ({
      //     ...filter,
      //     eventName,
      //   }));
    } catch (error) {
      console.error('Failed to fetch property filters:', error);
      return [];
    }
  };

  setCommonFilters = (filters: Filter[]): void => {
    this.commonFilters = [...filters];
  };

  // Cleanup method for memory management
  cleanup = (): void => {
    this.clearExpiredCacheEntries();
  };

  private clearExpiredCacheEntries = (): void => {
    const now = Date.now();
    Object.entries(this.filterCache).forEach(([key, entry]) => {
      if (now - entry.timestamp > CACHE_TTL) {
        delete this.filterCache[key];
      }
    });
  };
}
