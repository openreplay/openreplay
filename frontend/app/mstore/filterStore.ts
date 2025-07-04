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

  // getEventOptions = (siteId: string): FilterOption[] => {
  //   return this.getFilters(siteId)
  //     .filter((filter: Filter) => filter.isEvent)
  //     .map((filter: Filter) => ({
  //       label: filter.displayName || filter.name,
  //       value: filter.name,
  //     }));
  // };

  getEventOptions = (
    siteId: string,
    filterFn?: (filter: Filter) => boolean,
  ): FilterOption[] => {
    return this.getFilters(siteId)
      .filter((f) => f.isEvent && (!filterFn || filterFn(f)))
      .map((f) => ({
        label: f.displayName || f.name,
        value: f.name,
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

  findEvent = (data: Partial<Filter>) => {
    const siteId = projectStore.activeSiteId?.toString();
    const filter = this.filters[siteId].find((filter: Filter) =>
      Object.entries(data).every(([key, value]) => {
        const prop = filter[key as keyof Filter];
        if (typeof prop === 'boolean' && typeof value === 'string') {
          return prop === (value.toLowerCase() === 'true');
        }
        if (typeof prop === 'number' && typeof value === 'string') {
          return prop === Number(value);
        }
        return prop === value;
      }),
    );

    if (!filter) {
      console.error('Filter not found');
      return new FilterItem({
        name: data.name,
        isEvent: data.isEvent,
        autoCaptured: data.autoCaptured,
      });
    }

    // filter.filters =
    //   filter.filters?.filter((f: any) => f.defaultProperty) || [];
    filter.filters = [];

    return new FilterItem(filter);
  };

  // findEventProperty = (
  //   eventId: string,
  //   data: Partial<Filter>,
  // ): Filter | undefined => {
  //   const filter = this.findFilterById(eventId);
  //   if (!filter) {
  //     console.error('Filter not found');
  //     return undefined;
  //   }

  //   filter.filters =
  //     filter.filters?.filter((f: any) => f.defaultProperty) || [];

  //   return new FilterItem(filter);
  // };

  private findFilterById = (id: string): Filter | undefined => {
    const siteId = projectStore.activeSiteId + '';
    const search = (filtersToSearch: Filter[]): Filter | undefined => {
      for (const filter of filtersToSearch) {
        if (filter.id === id) {
          return filter;
        }

        if (filter.filters && filter.filters.length > 0) {
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

  processFilters = (filters: any[], category?: string): FilterItem[] => {
    return filters.map((filter) => {
      let dataType = filter.dataType || 'string';
      if (filter.name === 'duration' && filter.autoCaptured) {
        dataType = 'duration';
      }
      return {
        ...filter,
        id: Math.random().toString(36).substring(2, 9),
        possibleTypes:
          filter.possibleTypes?.map((type: any) => type.toLowerCase()) || [],
        dataType: dataType,
        category: category || 'custom',
        subCategory: this.determineSubCategory(category, filter),
        displayName: filter.displayName || filter.name,
        // icon: FilterKey.LOCATION, // TODO - use actual icons
        isEvent: category === 'events',
        value: filter.value || [],
        propertyOrder: 'and',
        operator:
          filter.operator || this.getDefaultFilterOperator(filter.dataType),
        defaultProperty: Boolean(filter.defaultProperty) || false,
        autoCaptured: filter.autoCaptured || false,
      };
    });
  };

  getDefaultFilterOperator = (dataType: string): string => {
    switch (dataType) {
      case 'string':
      case 'duration':
        return 'is';
      case 'number':
      case 'int':
        // return 'equals';
        return '=';
      case 'boolean':
        return 'true';
      default:
        return 'is';
    }
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
      return filter.autoCaptured ? 'autocapture' : 'event';
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

    console.log('settings filters for', event, filters);

    runInAction(() => {
      event.filters = filters;
    });
  };

  getEventFilters = async (eventId: string): Promise<Filter[]> => {
    const event = this.findFilterById(eventId);
    if (!event) throw new Error(`Event with ID ${eventId} not found`);
    const key = event.id;

    // return cached if valid
    const cached = this.filterCache[key];
    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    // only start one fetch per key
    if (!this.pendingFetches[key]) {
      this.pendingFetches[key] = this.fetchAndProcessPropertyFilters(
        event.name,
        event.autoCaptured,
      )
        .then((filters) => {
          this.setEventFilters(eventId, filters);
          runInAction(() => this.setCacheEntry(key, filters));
          return filters;
        })
        .finally(() => {
          delete this.pendingFetches[key];
        });
    }

    return this.pendingFetches[key]!;
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
