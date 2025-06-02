import { FilterCategory, FilterKey } from 'Types/filter/filterType';
import { makeAutoObservable } from 'mobx';
import { FilterProperty, Operator } from '@/mstore/types/filterConstants';

type JsonData = Record<string, any>;

// Define a proper interface for initialization data
interface FilterItemData {
  id?: string;
  name?: string;
  displayName?: string;
  description?: string;
  possibleTypes?: string[];
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
  filters?: FilterItemData[];
  autoOpen?: boolean;
}

// Define valid keys that can be updated
type FilterItemKeys = keyof FilterItemData;

export default class FilterItem {
  id: string = '';
  name: string = '';
  displayName?: string;
  description?: string;
  possibleTypes?: string[];
  autoCaptured?: boolean;
  metadataName?: string;
  category: string = '';
  subCategory?: string;
  type?: string;
  icon?: string;
  properties?: FilterProperty[];
  operator?: string;
  operators?: Operator[];
  isEvent?: boolean;
  value?: string[];
  propertyOrder?: string;
  filters?: FilterItem[];
  autoOpen?: boolean;

  constructor(data: FilterItemData = {}) {
    makeAutoObservable(this);
    this.initializeFromData(data);
  }

  private initializeFromData(data: FilterItemData): void {
    // Set default operator if not provided
    const processedData = {
      ...data,
      operator: data.operator || 'is',
    };

    // Handle filters array transformation
    if (Array.isArray(data.filters)) {
      processedData.filters = data.filters.map(
        (filterData: FilterItemData) => new FilterItem(filterData),
      );
    }

    this.merge(processedData);
  }

  updateKey<K extends FilterItemKeys>(key: K, value: FilterItemData[K]): void {
    if (key in this) {
      (this as any)[key] = value;
    } else {
      console.warn(`Attempted to update invalid key: ${key}`);
    }
  }

  merge(data: FilterItemData): void {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this && value !== undefined) {
        (this as any)[key] = value;
      }
    });
  }

  fromData(data: FilterItemData): FilterItem {
    if (!data) {
      console.warn('fromData called with null/undefined data');
      return this;
    }

    Object.assign(this, data);
    this.type = 'string';
    this.name = data.name || '';
    this.category = data.category || '';
    this.subCategory = data.subCategory;
    this.operator = data.operator;

    // Safely handle filters array
    if (Array.isArray(data.filters)) {
      this.filters = data.filters.map(
        (filterData: FilterItemData) => new FilterItem(filterData),
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
    this.name = data.type || '';
    this.category = data.category || '';
    this.subCategory = data.subCategory;
    this.operator = data.operator;
    this.value = Array.isArray(data.value) ? data.value : [''];

    // Safely handle filters array
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
      isEvent: Boolean(this.isEvent),
      value:
        this.value?.map((item: any) => (item ? item.toString() : '')) || [],
      operator: this.operator,
      source: this.name,
      filters: Array.isArray(this.filters)
        ? this.filters.map((filter) => filter.toJson())
        : [],
    };

    // Handle metadata category
    const isMetadata = this.category === FilterCategory.METADATA;
    if (isMetadata) {
      json.type = FilterKey.METADATA;
      json.source = this.name;
      json.sourceOperator = this.operator;
    }

    // Handle duration type
    if (this.type === FilterKey.DURATION) {
      json.value = this.value?.map((item: any) => (item ? Number(item) : 0));
    }

    return json;
  }

  // Additional utility methods
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
