import { makeAutoObservable, runInAction, observable, action } from 'mobx';
import { filtersMap, conditionalFiltersMap } from 'Types/filter/newFilter';
import { FilterKey } from 'Types/filter/filterType';
import FilterItem from './filterItem';

export const checkFilterValue = (value: any) =>
  Array.isArray(value) ? (value.length === 0 ? [''] : value) : [value];

export interface IFilter {
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

  merge(filter: any): void;

  addFilter(filter: any): void;

  replaceFilters(filters: any): void;

  updateFilter(index: number, filter: any): void;

  updateKey(key: string, value: any): void;

  removeFilter(index: number): void;

  fromJson(json: any, isHeatmap?: boolean): IFilter;

  fromData(data: any): IFilter;

  toJsonDrilldown(): any;

  createFilterBykey(key: string): FilterItem;

  toJson(): any;

  addExcludeFilter(filter: FilterItem): void;

  updateExcludeFilter(index: number, filter: FilterItem): void;

  removeExcludeFilter(index: number): void;

  addFunnelDefaultFilters(): void;

  toData(): any;

  addOrUpdateFilter(filter: any): void;
}

export default class Filter implements IFilter {
  public static get ID_KEY(): string {
    return 'filterId';
  }

  filterId: string = '';

  name: string = '';

  autoOpen = false;

  filters: FilterItem[] = [];

  excludes: FilterItem[] = [];

  eventsOrder: string = 'then';

  eventsOrderSupport: string[] = ['then', 'or', 'and'];

  startTimestamp: number = 0;

  endTimestamp: number = 0;

  eventsHeader: string = 'EVENTS';

  page: number = 1;

  limit: number = 10;

  constructor(
    filters: any[] = [],
    private readonly isConditional = false,
    private readonly isMobile = false,
  ) {
    makeAutoObservable(this, {
      filters: observable,
      eventsOrder: observable,
      startTimestamp: observable,
      endTimestamp: observable,

      addFilter: action,
      removeFilter: action,
      updateKey: action,
      merge: action,
      addExcludeFilter: action,
      updateFilter: action,
      replaceFilters: action,
    });
    this.filters = filters.map((i) => new FilterItem(i));
  }

  merge(filter: any) {
    runInAction(() => {
      Object.assign(this, filter);
    });
  }

  addFilter(filter: any) {
    filter.value = [''];
    if (Array.isArray(filter.filters)) {
      filter.filters = filter.filters.map((i: Record<string, any>) => {
        i.value = [''];
        return new FilterItem(i);
      });
    }
    this.filters.push(new FilterItem(filter));
  }

  replaceFilters(filters: any) {
    this.filters = filters;
  }

  updateFilter(index: number, filter: any) {
    this.filters[index] = new FilterItem(filter);
  }

  updateKey(key: string, value: any) {
    // @ts-ignore fix later
    this[key] = value;
  }

  removeFilter(index: number) {
    this.filters.splice(index, 1);
  }

  fromJson(json: any, isHeatmap?: boolean) {
    this.name = json.name;
    this.filters = json.filters.map((i: Record<string, any>) =>
      new FilterItem(undefined, this.isConditional, this.isMobile).fromJson(
        i,
        undefined,
        isHeatmap,
      ),
    );
    this.eventsOrder = json.eventsOrder;
    return this;
  }

  fromData(data: any) {
    this.name = data.name;
    this.filters = data.filters.map((i: Record<string, any>) =>
      new FilterItem(undefined, this.isConditional, this.isMobile).fromData(i),
    );
    this.eventsOrder = data.eventsOrder;
    return this;
  }

  toJsonDrilldown() {
    const json = {
      name: this.name,
      filters: this.filters.map((i) => i.toJson()),
      eventsOrder: this.eventsOrder,
      startTimestamp: this.startTimestamp,
      endTimestamp: this.endTimestamp,
    };
    return json;
  }

  createFilterBykey(key: string) {
    const usedMap = this.isConditional ? conditionalFiltersMap : filtersMap;
    return usedMap[key] ? new FilterItem(usedMap[key]) : new FilterItem();
  }

  toJson() {
    const json = {
      name: this.name,
      filters: this.filters.map((i) => i.toJson()),
      eventsOrder: this.eventsOrder,
    };
    return json;
  }

  addExcludeFilter(filter: FilterItem) {
    this.excludes.push(filter);
  }

  updateExcludeFilter(index: number, filter: FilterItem) {
    this.excludes[index] = new FilterItem(filter);
  }

  removeExcludeFilter(index: number) {
    this.excludes.splice(index, 1);
  }

  addFunnelDefaultFilters() {
    this.filters = [];
    this.addFilter({
      ...filtersMap[FilterKey.LOCATION],
      value: [''],
      operator: 'isAny',
    });
    this.addFilter({
      ...filtersMap[FilterKey.CLICK],
      value: [''],
      operator: 'onAny',
    });
  }

  toData() {
    return {
      name: this.name,
      filters: this.filters.map((i) => i.toJson()),
      eventsOrder: this.eventsOrder,
    };
  }

  addOrUpdateFilter(filter: any) {
    const index = this.filters.findIndex((i) => i.key === filter.key);
    filter.value = checkFilterValue;

    if (index > -1) {
      this.updateFilter(index, filter);
    } else {
      this.addFilter(filter);
    }
  }

  addFilterByKeyAndValue(
    key: any,
    value: any,
    operator: undefined,
    sourceOperator: undefined,
    source: undefined,
  ) {
    let defaultFilter = { ...filtersMap[key] };
    if (defaultFilter) {
      defaultFilter = { ...defaultFilter, value: checkFilterValue(value) };
      if (operator) {
        defaultFilter.operator = operator;
      }
      if (sourceOperator) {
        defaultFilter.sourceOperator = sourceOperator;
      }
      if (source) {
        defaultFilter.source = source;
      }
      this.addOrUpdateFilter(defaultFilter);
    }
  }
}
