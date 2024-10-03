import { FilterCategory, FilterKey, FilterType } from 'Types/filter/filterType';
import {
  conditionalFiltersMap,
  filtersMap,
  mobileConditionalFiltersMap,
} from 'Types/filter/newFilter';
import { action, makeAutoObservable, observable } from 'mobx';

import { pageUrlOperators } from '../../constants/filterOptions';

export default class FilterItem {
  type: string = '';
  category: FilterCategory = FilterCategory.METADATA;
  key: string = '';
  label: string = '';
  value: any = [''];
  isEvent: boolean = false;
  operator: string = '';
  hasSource: boolean = false;
  source: string = '';
  sourceOperator: string = '';
  sourceOperatorOptions: any = [];
  filters: FilterItem[] = [];
  operatorOptions: any[] = [];
  options: any[] = [];
  isActive: boolean = true;
  completed: number = 0;
  dropped: number = 0;

  constructor(
    data: any = {},
    private readonly isConditional?: boolean,
    private readonly isMobile?: boolean
  ) {
    makeAutoObservable(this);

    if (Array.isArray(data.filters)) {
      data.filters = data.filters.map(function (i: Record<string, any>) {
        return new FilterItem(i);
      });
    }

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
    this.type = data.type;
    this.key = data.key;
    this.label = data.label;
    this.operatorOptions = data.operatorOptions;
    this.hasSource = data.hasSource;
    this.category = data.category;
    this.sourceOperatorOptions = data.sourceOperatorOptions;
    this.value = data.value;
    this.isEvent = Boolean(data.isEvent);
    this.operator = data.operator;
    this.source = data.source;
    this.sourceOperator = data.sourceOperator;
    this.filters = data.filters;
    this.isActive = Boolean(data.isActive);
    this.completed = data.completed;
    this.dropped = data.dropped;
    this.options = data.options;
    return this;
  }

  fromJson(json: any, mainFilterKey = '', isHeatmap?: boolean) {
    const isMetadata = json.type === FilterKey.METADATA;
    let _filter: any =
      (isMetadata ? filtersMap['_' + json.source] : filtersMap[json.type]) ||
      {};
    if (this.isConditional) {
      if (this.isMobile) {
        _filter =
          mobileConditionalFiltersMap[json.type] ||
          mobileConditionalFiltersMap[json.source];
      } else {
        _filter =
          conditionalFiltersMap[json.type] ||
          conditionalFiltersMap[json.source];
      }
    }
    if (mainFilterKey) {
      const mainFilter = filtersMap[mainFilterKey];
      const subFilterMap = {};
      mainFilter.filters.forEach((option: any) => {
        // @ts-ignore
        subFilterMap[option.key] = option;
      });
      // @ts-ignore
      _filter = subFilterMap[json.type];
    }
    this.type = _filter.type;
    this.key = _filter.key;
    this.label = _filter.label;
    this.operatorOptions = _filter.operatorOptions;
    this.hasSource = _filter.hasSource;
    this.category = _filter.category;
    this.sourceOperatorOptions = _filter.sourceOperatorOptions;
    if (isHeatmap && this.key === FilterKey.LOCATION) {
      this.operatorOptions = pageUrlOperators;
    }
    this.options = _filter.options;
    this.isEvent = Boolean(_filter.isEvent);

    this.value = !json.value || json.value.length === 0 ? [''] : json.value;
    this.operator = json.operator;
    this.source = isMetadata ? '_' + json.source : json.source;
    this.sourceOperator = json.sourceOperator;

    this.filters =
      _filter.type === FilterType.SUB_FILTERS && json.filters
        ? json.filters.map((i: any) => new FilterItem().fromJson(i, json.type))
        : [];

    this.completed = json.completed;
    this.dropped = json.dropped;

    return this;
  }

  toJson(): any {
    const isMetadata = this.category === FilterCategory.METADATA;
    const json = {
      type: isMetadata ? FilterKey.METADATA : this.key,
      isEvent: Boolean(this.isEvent),
      value: this.value.map((i: any) => i && i.toString()),
      operator: this.operator,
      source: isMetadata ? this.key.replace(/^_/, '') : this.source,
      sourceOperator: this.sourceOperator,
      filters: Array.isArray(this.filters)
        ? this.filters.map((i) => i.toJson())
        : [],
    };
    if (this.type === FilterKey.DURATION) {
      json.value = this.value.map((i: any) => (!i ? 0 : i));
    }
    return json;
  }
}
