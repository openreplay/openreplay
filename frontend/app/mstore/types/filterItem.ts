import { FilterCategory, FilterKey } from 'Types/filter/filterType';
import { makeAutoObservable } from 'mobx';
import { FilterProperty, Operator } from '@/mstore/types/filterConstants';

type JsonData = Record<string, any>;

export interface IFilter {
  id?: string;
  name?: string;
  displayName?: string;
  description?: string;
  possibleTypes?: string[];
  dataType?: string;
  autoCaptured?: boolean;
  metadataName?: string;
  category?: string;
  subCategory?: string;
  type?: string;
  icon?: string;
  properties?: FilterProperty[];
  operator?: string;
  operators?: Operator[];
  isEvent?: boolean;
  value?: string[];
  propertyOrder?: string;
  filters?: IFilter[];
  autoOpen?: boolean;
}

type FilterItemKeys = keyof IFilter;

export default class FilterItem {
  id: string = '';
  name: string = '';
  displayName?: string = '';
  description?: string = '';
  possibleTypes?: string[] = [];
  dataType?: string = '';
  autoCaptured?: boolean = false;
  // metadataName?: string = '';
  category: string = '';
  subCategory?: string = '';
  type?: string = '';
  icon?: string = '';
  properties?: FilterProperty[] = [];
  operator?: string = '';
  operators?: Operator[] = [];
  isEvent?: boolean = false;
  value?: string[] = [''];
  propertyOrder?: string = '';
  filters?: FilterItem[] = [];
  autoOpen?: boolean = false;

  constructor(data: IFilter = {}) {
    makeAutoObservable(this);
    this.initializeFromData(data);
  }

  private initializeFromData(data: IFilter): void {
    const processedData = {
      ...data,
      operator: data.operator || 'is',
    };

    if (Array.isArray(data.filters)) {
      processedData.filters = data.filters.map(
        (filterData: IFilter) => new FilterItem(filterData),
      );
    }

    this.merge(processedData);
  }

  updateKey<K extends FilterItemKeys>(key: K, value: IFilter[K]): void {
    if (key in this) {
      (this as any)[key] = value;
    } else {
      console.warn(`Attempted to update invalid key: ${key}`);
    }
  }

  merge(data: IFilter): void {
    console.log('Object.entries(data)', Object.entries(data));
    Object.entries(data).forEach(([key, value]) => {
      if (key in this && value !== undefined) {
        (this as any)[key] = value;
      }
    });
  }

  fromData(data: IFilter): FilterItem {
    if (!data) {
      console.warn('fromData called with null/undefined data');
      return this;
    }

    Object.assign(this, data);
    this.type = 'string';
    this.name = data.name || '';
    this.dataType = data.dataType || '';
    this.category = data.category || '';
    this.subCategory = data.subCategory;
    this.operator = data.operator;
    this.isEvent = Boolean(data.isEvent);

    if (Array.isArray(data.filters)) {
      this.filters = data.filters.map(
        (filterData: IFilter) => new FilterItem(filterData),
      );
    } else {
      this.filters = [];
    }

    return this;
  }

  fromJson(data: JsonData): FilterItem {
    if (!data) {
      console.warn('fromJson called with null/undefined data');
      return this;
    }

    this.type = 'string';
    this.category = data.category || '';
    this.subCategory = data.subCategory;
    this.operator = data.operator;
    this.value = Array.isArray(data.value) ? data.value : [''];

    this.name = data.name || '';
    this.isEvent = Boolean(data.isEvent);
    this.autoCaptured = Boolean(data.autoCaptured);
    this.dataType = data.dataType || '';

    if (Array.isArray(data.filters)) {
      this.filters = data.filters.map(
        (filterData: JsonData) => new FilterItem(filterData),
      );
    } else {
      this.filters = [];
    }

    return this;
  }

  toJson(): JsonData {
    const json: JsonData = {
      type: this.name,
      value:
        this.value?.map((item: any) => (item ? item.toString() : '')) || [],
      operator: this.operator,
      source: this.name,
      filters: Array.isArray(this.filters)
        ? this.filters.map((filter) => filter.toJson())
        : [],

      // these props are required to get the source filter later
      isEvent: Boolean(this.isEvent),
      name: this.name,
      autoCaptured: this.autoCaptured,
      dataType: this.dataType,
    };

    const isMetadata = this.category === FilterCategory.METADATA;
    if (isMetadata) {
      json.type = FilterKey.METADATA;
      json.source = this.name;
      json.sourceOperator = this.operator;
    }

    if (this.type === FilterKey.DURATION) {
      json.value = this.value?.map((item: any) => (item ? Number(item) : 0));
    }

    return json;
  }

  isValid(): boolean {
    return Boolean(this.name && this.category);
  }

  clone(): FilterItem {
    return new FilterItem(JSON.parse(JSON.stringify(this.toJson())));
  }

  reset(): void {
    this.value = [''];
    this.operator = 'is';
    if (this.filters) {
      this.filters.forEach((filter) => filter.reset());
    }
  }
}
