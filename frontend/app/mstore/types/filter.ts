import { filterStore } from '@/mstore/index';
import { JsonData } from '@/mstore/types/filterConstants';
import { FilterKey } from 'Types/filter/filterType';
import { makeAutoObservable, runInAction } from 'mobx';

import FilterItem from './filterItem';

type FilterData = Partial<FilterItem> & {
  key?: FilterKey | string;
  value?: any;
  operator?: string;
  sourceOperator?: string;
  source?: any;
  filters?: FilterData[];
  isEvent?: boolean;
};

export const checkFilterValue = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.length === 0 ? [''] : value.map((val) => String(val ?? ''));
  }
  if (value === null || value === undefined) {
    return [''];
  }
  return [String(value)];
};

export default class FilterStore {
  public static readonly ID_KEY: string = 'filterId';

  filterId: string = '';
  name: string = '';
  autoOpen: boolean = false;
  filters: FilterItem[] = [];
  excludes: FilterItem[] = [];
  eventsOrder: string = 'then';
  readonly eventsOrderSupport: string[] = ['then', 'or', 'and'];
  startTimestamp: number = 0;
  endTimestamp: number = 0;
  eventsHeader: string = 'EVENTS';
  page: number = 1;
  limit: number = 10;

  private readonly isConditional: boolean;
  private readonly isMobile: boolean;
  /** the project whose catalogue the filters come from; the active one when unset */
  private readonly projectId?: string;

  constructor(
    initialFilters: FilterData[] = [],
    isConditional = false,
    isMobile = false,
    projectId?: string,
  ) {
    this.isConditional = isConditional;
    this.isMobile = isMobile;
    this.projectId = projectId;
    this.filters = initialFilters.map((filterData) =>
      this.createFilterItemFromData(filterData),
    );

    makeAutoObservable(this);
  }

  merge(filterData: Partial<FilterStore>) {
    runInAction(() => {
      const validKeys = Object.keys(this).filter(
        (key) =>
          typeof (this as any)[key] !== 'function' &&
          key !== 'eventsOrderSupport' &&
          key !== 'isConditional' &&
          key !== 'isMobile' &&
          key !== 'projectId',
      );
      for (const key in filterData) {
        if (validKeys.includes(key)) {
          (this as any)[key] = (filterData as any)[key];
        }
      }
      if (filterData.filters) {
        this.filters = filterData.filters.map((f) => f);
      }
      if (filterData.excludes) {
        this.excludes = filterData.excludes.map((f) => f);
      }
    });
  }

  updateKey(key: string, value: any) {
    // @ts-ignore
    this[key] = value;
  }

  moveFilter(index: number, newIndex: number) {
    if (
      index >= 0 &&
      index < this.filters.length &&
      newIndex >= 0 &&
      newIndex < this.filters.length
    ) {
      const [removed] = this.filters.splice(index, 1);
      this.filters.splice(newIndex, 0, removed);
    }
  }

  private createFilterItemFromData(filterData: FilterData): FilterItem {
    const dataWithValue = {
      ...filterData,
      value: checkFilterValue(filterData.value),
    };
    if (Array.isArray(dataWithValue.filters)) {
      dataWithValue.filters = dataWithValue.filters.map((nestedFilter) =>
        this.createFilterItemFromData(nestedFilter),
      );
    }
    return new FilterItem(dataWithValue);
  }

  addFilter(data: any, first?: boolean) {
    console.debug('Adding widget fitler:', data);
    const filter = this.createFilterItemFromData(data);

    const hasDefaults = filterStore.checkDefaultSubfilters(filter);
    if (hasDefaults && Array.isArray(filter.filters)) {
      filter.filters = filter.filters.map((sf: any) =>
        this.createFilterItemFromData(sf),
      );
    }

    if (!hasDefaults && filter.isEvent && filter.filters) {
      filterStore.getEventFilters(filter.id, this.projectId).then((props) => {
        filter.filters = props
          ?.filter((prop) => prop.defaultProperty)
          .map((prop) => {
            const nestedFilter = this.createFilterItemFromData(prop);
            nestedFilter.id = prop.id;
            return nestedFilter;
          });
      });
    }

    if (first) {
      this.filters.unshift(filter);
    } else {
      this.filters.push(filter);
    }
  }

  replaceFilters(newFilters: FilterItem[]) {
    this.filters = newFilters;
  }

  updateFilter = (index: number, filterData: FilterItem) => {
    if (index >= 0 && index < this.filters.length) {
      const updatedFilter = this.createFilterItemFromData(filterData);
      updatedFilter.id = filterData.id ?? this.filters[index].id;
      this.filters[index] = updatedFilter;
    } else {
      console.warn(
        `FilterStore.updateFilter: Filter at index ${index} not found.`,
      );
    }
  };

  removeFilter = (index: number) => {
    if (index >= 0 && index < this.filters.length) {
      this.filters.splice(index, 1);
    } else {
      console.warn(
        `FilterStore.removeFilter: Filter at index ${index} not found.`,
      );
    }
  };

  fromJson(json: JsonData, isHeatmap?: boolean): this {
    runInAction(() => {
      this.name = json.name ?? '';
      // this.filters = Array.isArray(json.filters)
      //   ? json.filters.map((filterJson: JsonData) =>
      //       this.createFilterItemFromData(filterJson),
      //     )
      //   : [];
      this.filters = Array.isArray(json.filters)
        ? filterStore.processFiltersFromData(json.filters, this.projectId)
        : [];
      this.excludes = Array.isArray(json.excludes)
        ? filterStore.processFiltersFromData(json.excludes, this.projectId)
        : [];
      this.eventsOrder = json.eventsOrder ?? 'then';
      this.startTimestamp = json.startTimestamp ?? 0;
      this.endTimestamp = json.endTimestamp ?? 0;
      this.page = json.page ?? 1;
      this.limit = json.limit ?? 10;
      // this.autoOpen = json.autoOpen ?? false;
      this.filterId = json.filterId ?? '';
      this.eventsHeader = json.eventsHeader ?? 'EVENTS';
    });
    return this;
  }

  fromData(data: JsonData): this {
    runInAction(() => {
      this.name = data.name ?? '';
      // this.filters = Array.isArray(data.filters)
      //   ? data.filters.map(
      //       (filterData: JsonData) => this.createFilterItemFromData(filterData),
      //       // new FilterItem(undefined, this.isConditional, this.isMobile).fromData(filterData)
      //     )
      //   : [];
      this.filters = Array.isArray(data.filters)
        ? filterStore.processFilters(data.filters)
        : [];
      this.excludes = Array.isArray(data.excludes)
        ? filterStore.processFilters(data.excludes)
        : [];
      this.eventsOrder = data.eventsOrder ?? 'then';
      this.startTimestamp = data.startTimestamp ?? 0;
      this.endTimestamp = data.endTimestamp ?? 0;
      this.page = data.page ?? 1;
      this.limit = data.limit ?? 10;
      this.autoOpen = data.autoOpen ?? false;
      this.filterId = data.filterId ?? '';
      this.eventsHeader = data.eventsHeader ?? 'EVENTS';
    });
    return this;
  }

  toJson(): JsonData {
    return {
      name: this.name,
      filterId: this.filterId,
      autoOpen: this.autoOpen,
      filters: this.filters.map(
        (filterItem) => filterItem?.toJson?.() ?? filterItem,
      ),
      excludes: this.excludes.map(
        (filterItem) => filterItem?.toJson?.() ?? filterItem,
      ),
      eventsOrder: this.eventsOrder,
      startTimestamp: this.startTimestamp,
      endTimestamp: this.endTimestamp,
      eventsHeader: this.eventsHeader,
      page: this.page,
      limit: this.limit,
    };
  }

  /** funnels and heatmaps start from one page-view step */
  startWithLocationFilter() {
    const locationFilter = filterStore.findEvent({
      name: FilterKey.LOCATION,
      autoCaptured: true,
    });

    runInAction(() => {
      this.filters = [];
      this.addFilter(locationFilter);
    });
  }
}
