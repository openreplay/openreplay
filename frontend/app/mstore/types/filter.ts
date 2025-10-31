import { action, makeAutoObservable, observable, runInAction } from 'mobx';
import { filtersMap } from 'Types/filter/newFilter';
import { FilterKey } from 'Types/filter/filterType';
import FilterItem from './filterItem';
import { JsonData } from '@/mstore/types/filterConstants';
import { filterStore } from '@/mstore/index';

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

export interface IFilterStore {
  filterId: string;
  name: string;
  filters: FilterItem[];
  excludes: FilterItem[];
  eventsOrder: string;
  eventsOrderSupport: string[];
  startTimestamp: number;
  endTimestamp: number;
  eventsHeader: string;
  page: number;
  limit: number;
  autoOpen: boolean;

  merge(filterData: Partial<FilterStore>): void;

  updateKey(key: string, value: any): void;

  addFilter(filterData: FilterData): void;

  replaceFilters(newFilters: FilterItem[]): void;

  updateFilter(index: number, filterData: FilterData): void;

  removeFilter(index: number): void;

  fromJson(json: JsonData, isHeatmap?: boolean): this;

  fromData(data: JsonData): this;

  toJsonDrilldown(): JsonData;

  createFilterByKey(key: FilterKey | string): FilterItem;

  toJson(): JsonData;

  addExcludeFilter(filterData: FilterItem): void;

  updateExcludeFilter(filterId: string, filterData: FilterData): void;

  removeExcludeFilter(filterId: string): void;

  addFunnelDefaultFilters(): void;

  addOrUpdateFilter(filterData: FilterData): void;

  addFilterByKeyAndValue(
    key: FilterKey | string,
    value: unknown,
    operator?: string,
    sourceOperator?: string,
    source?: unknown,
  ): void;
}

export default class FilterStore implements IFilterStore {
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

  constructor(
    initialFilters: FilterData[] = [],
    isConditional = false,
    isMobile = false,
  ) {
    this.isConditional = isConditional;
    this.isMobile = isMobile;
    this.filters = initialFilters.map((filterData) =>
      this.createFilterItemFromData(filterData),
    );

    makeAutoObservable(
      this,
      {
        filters: observable.shallow,
        excludes: observable.shallow,
        eventsOrder: observable,
        startTimestamp: observable,
        endTimestamp: observable,
        name: observable,
        page: observable,
        limit: observable,
        autoOpen: observable,
        filterId: observable,
        eventsHeader: observable,
        merge: action,
        addFilter: action,
        replaceFilters: action,
        updateFilter: action,
        removeFilter: action,
        fromJson: action,
        fromData: action,
        addExcludeFilter: action,
        updateExcludeFilter: action,
        removeExcludeFilter: action,
        addFunnelDefaultFilters: action,
        addOrUpdateFilter: action,
        addFilterByKeyAndValue: action,
        isConditional: false,
        isMobile: false,
        eventsOrderSupport: false,
        ID_KEY: false,
      },
      { autoBind: true },
    );
  }

  merge(filterData: Partial<FilterStore>) {
    runInAction(() => {
      const validKeys = Object.keys(this).filter(
        (key) =>
          typeof (this as any)[key] !== 'function' &&
          key !== 'eventsOrderSupport' &&
          key !== 'isConditional' &&
          key !== 'isMobile',
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

  addFilter(data: any) {
    console.debug('Adding widget fitler:', data);
    const filter = this.createFilterItemFromData(data);

    if (filter.isEvent && filter.filters) {
      filterStore.getEventFilters(filter.id).then((props) => {
        filter.filters = props
          ?.filter((prop) => prop.defaultProperty)
          .map((prop) => {
            const nestedFilter = this.createFilterItemFromData(prop);
            nestedFilter.id = prop.id;
            return nestedFilter;
          });
      });
    }

    this.filters.push(filter);
  }

  replaceFilters(newFilters: FilterItem[]) {
    this.filters = newFilters;
  }

  private updateFilterByIndex(index: number, filterData: FilterItem) {
    if (index >= 0 && index < this.filters.length) {
      const originalId = this.filters[index].id;
      const updatedFilter = this.createFilterItemFromData(filterData);
      updatedFilter.id = originalId; // Ensure ID is not lost
      this.filters[index] = updatedFilter;
    } else {
      console.warn(`FilterStore.updateFilterByIndex: Invalid index ${index}`);
    }
  }

  updateFilter = (index: number, filterData: FilterItem) => {
    if (index >= 0 && index < this.filters.length) {
      const updatedFilter = this.createFilterItemFromData(filterData);
      updatedFilter.id = this.filters[index].id;
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
        ? filterStore.processFiltersFromData(json.filters)
        : [];
      this.excludes = Array.isArray(json.excludes)
        ? filterStore.processFiltersFromData(json.excludes)
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

  toJsonDrilldown(): JsonData {
    return {
      name: this.name,
      filters: this.filters.map((filterItem) => filterItem.toJson()),
      eventsOrder: this.eventsOrder,
      startTimestamp: this.startTimestamp,
      endTimestamp: this.endTimestamp,
    };
  }

  createFilterByKey(key: FilterKey | string): FilterItem {
    const sourceMap = this.isConditional ? conditionalFiltersMap : filtersMap;
    const filterTemplate = sourceMap[key as FilterKey];
    const newFilterData = filterTemplate
      ? { ...filterTemplate, value: [''] }
      : { key: key, value: [''] };
    return this.createFilterItemFromData(newFilterData); // Use helper
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

  addExcludeFilter(filterData: FilterItem) {
    // const filter = filterStore.findEvent({
    //   name: FilterKey.LOCATION,
    //   autoCaptured: true,
    // });

    // if (!filter) {
    //   console.error('FilterStore.addExcludeFilter: Location filter not found.');
    //   return;
    // }

    // console.log('f', filter);
    // // const newExclude = this.createFilterItemFromData(filterData);
    // this.excludes.push(
    //   new FilterItem({
    //     ...filter,
    //     filters: [
    //       {
    //         name: 'label',
    //         value: [''],
    //         operator: 'is',
    //         dataType: 'string',
    //       },
    //     ],
    //   }),
    // );
    //
    this.excludes = [filterData];
  }

  updateExcludeFilter(filterId: string, filterData: FilterData) {
    const index = this.excludes.findIndex((f) => f.id === filterId);
    if (index > -1) {
      const updatedExclude = this.createFilterItemFromData(filterData);
      updatedExclude.id = filterId; // Ensure the ID remains the same
      this.excludes[index] = updatedExclude;
    } else {
      console.warn(
        `FilterStore.updateExcludeFilter: Exclude filter with id ${filterId} not found.`,
      );
    }
  }

  removeExcludeFilter(filterId: string) {
    this.excludes = [];
    // const index = this.excludes.findIndex((f) => f.id === filterId);
    // if (index > -1) {
    //   this.excludes.splice(index, 1);
    // } else {
    //   console.warn(
    //     `FilterStore.removeExcludeFilter: Exclude filter with id ${filterId} not found.`,
    //   );
    // }
  }

  addFunnelDefaultFilters() {
    const clickFilter = filterStore.findEvent({
      name: FilterKey.CLICK,
      autoCaptured: true,
    });

    const locationFilter = filterStore.findEvent({
      name: FilterKey.LOCATION,
      autoCaptured: true,
    });

    runInAction(() => {
      this.filters = [];
      this.addFilter(locationFilter);
      this.addFilter(clickFilter);
    });
  }

  addHeatmapDefaultFilters() {
    const locationFilter = filterStore.findEvent({
      name: FilterKey.LOCATION,
      autoCaptured: true,
    });

    runInAction(() => {
      this.filters = []; // Clear existing filters
      this.addFilter(locationFilter);
    });
  }

  addWebvitalsDefaultFilters() {
    const locationFilter = filterStore.findEvent({
      name: FilterKey.LOCATION,
      autoCaptured: true,
    });

    runInAction(() => {
      this.filters = []; // Clear existing filters
      this.addFilter(locationFilter);
    });
  }

  addOrUpdateFilter(filterData: FilterData) {
    const index = this.filters.findIndex((f) => f.key === filterData.key);
    const dataWithCheckedValue = {
      ...filterData,
      value: checkFilterValue(filterData.value),
    };

    if (index > -1) {
      this.updateFilterByIndex(index, dataWithCheckedValue);
    } else {
      this.addFilter(dataWithCheckedValue);
    }
  }

  addFilterByKeyAndValue(
    key: FilterKey | string,
    value: any,
    operator?: string,
    sourceOperator?: string,
    source?: any,
  ) {
    const sourceMap = filtersMap;
    const defaultFilterData = sourceMap[key as FilterKey];

    if (defaultFilterData) {
      const newFilterData: FilterData = {
        ...defaultFilterData,
        key: key,
        value: checkFilterValue(value),
        operator: operator ?? defaultFilterData.operator,
        sourceOperator: sourceOperator ?? defaultFilterData.sourceOperator,
        source: source ?? defaultFilterData.source,
      };
      this.addOrUpdateFilter(newFilterData);
    } else {
      console.warn(
        `FilterStore.addFilterByKeyAndValue: No default filter template found for key ${key}. Adding generic filter.`,
      );
      this.addOrUpdateFilter({
        key: key,
        value: checkFilterValue(value),
        operator,
        sourceOperator,
        source,
      });
    }
  }
}
