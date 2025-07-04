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
  // properties?: FilterProperty[];
  operator?: string;
  operators?: Operator[];
  isEvent?: boolean;
  value?: string[];
  propertyOrder?: string;
  filters?: IFilter[];
  autoOpen?: boolean;
  defaultProperty?: boolean;

  [key: string]: any;
}

type FilterItemKeys = keyof IFilter;

export default class FilterItem implements IFilter {
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
  // properties?: FilterProperty[] = [];
  operator?: string = '';
  operators?: Operator[] = [];
  isEvent?: boolean = false;
  value?: string[] = [''];
  propertyOrder?: string = '';
  filters?: FilterItem[] = [];
  autoOpen?: boolean = false;
  defaultProperty?: boolean = false;

  constructor(data: IFilter = {}) {
    makeAutoObservable(this);
    this.initializeFromData(data);
  }

  private initializeFromData(data: IFilter): void {
    const processedData = {
      ...data,
      operator: data.operator || 'is',
      // id: Math.random().toString(36).substring(2, 9),
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
    this.defaultProperty = Boolean(data.defaultProperty);

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
    this.propertyOrder = data.propertyOrder;
    this.defaultProperty = Boolean(data.defaultProperty);

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
      // source: this.name,
      propertyOrder: this.propertyOrder,
      filters: Array.isArray(this.filters)
        ? this.filters.map((filter) => filter.toJson())
        : [],

      // these props are required to get the source filter later
      isEvent: Boolean(this.isEvent),
      name: this.name,
      autoCaptured: this.autoCaptured,
      dataType: this.dataType,
    };

    // const isMetadata = this.category === FilterCategory.METADATA;
    // if (isMetadata) {
    //   json.type = FilterKey.METADATA;
    //   json.source = this.name;
    //   json.sourceOperator = this.operator;
    // }

    // if (this.name === FilterKey.DURATION) {
    //   json.value = this.value?.map((item: any) => (item ? item + '' : 0));
    // }

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
