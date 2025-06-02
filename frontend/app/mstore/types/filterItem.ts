import { FilterCategory, FilterKey } from 'Types/filter/filterType';
import { makeAutoObservable } from 'mobx';
import { FilterProperty, Operator } from '@/mstore/types/filterConstants';

type JsonData = Record<string, any>;

export default class FilterItem {
  id: string = '';
  name: string = '';
  displayName?: string;
  description?: string;
  possibleTypes?: string[];
  autoCaptured?: boolean;
  metadataName?: string;
  category: string; // 'event' | 'filter' | 'action' | etc.
  subCategory?: string;
  type?: string; // 'number' | 'string' | 'boolean' | etc.
  icon?: string;
  properties?: FilterProperty[];
  operator?: string;
  operators?: Operator[];
  isEvent?: boolean;
  value?: string[];
  propertyOrder?: string;
  filters?: FilterItem[];
  autoOpen?: boolean;

  constructor(data: any = {}) {
    makeAutoObservable(this);

    if (Array.isArray(data.filters)) {
      data.filters = data.filters.map(
        (i: Record<string, any>) => new FilterItem(i),
      );
    }
    data.operator = data.operator || 'is';

    this.merge(data);
  }

  updateKey(key: string, value: any) {
    // @ts-ignore
    this[key] = value;
  }

  merge(data: any) {
    Object.keys(data).forEach((key) => {
      // @ts-ignore
      this[key] = data[key];
    });
  }

  fromData(data: any) {
    Object.assign(this, data);
    this.type = 'string';
    this.name = data.type;
    this.category = data.category;
    this.subCategory = data.subCategory;
    this.operator = data.operator;
    this.filters = data.filters.map((i: JsonData) => new FilterItem(i));

    return this;
  }

  fromJson(data: JsonData) {
    this.type = 'string';
    this.name = data.type;
    this.category = data.category;
    this.subCategory = data.subCategory;
    this.operator = data.operator;
    this.value = data.value || [''];
    this.filters = data.filters.map((i: JsonData) => new FilterItem(i));

    return this;
  }

  toJson(): any {
    const json: any = {
      type: this.name,
      isEvent: Boolean(this.isEvent),
      value: this.value?.map((i: any) => (i ? i.toString() : '')) || [],
      operator: this.operator,
      source: this.name,
      filters: Array.isArray(this.filters)
        ? this.filters.map((i) => i.toJson())
        : [],
    };

    const isMetadata = this.category === FilterCategory.METADATA;
    if (isMetadata) {
      json.type = FilterKey.METADATA;
      json.source = this.name;
      json.sourceOperator = this.operator;
    }

    if (this.type === FilterKey.DURATION) {
      json.value = this.value?.map((i: any) => (!i ? 0 : i));
    }

    return json;
  }
}
