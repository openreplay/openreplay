import { makeAutoObservable, observable, action } from 'mobx';
import { FilterKey, FilterType, FilterCategory } from 'Types/filter/filterType';
import { filtersMap, conditionalFiltersMap } from 'Types/filter/newFilter';

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

  constructor(data: any = {}, private readonly isConditional?: boolean) {
    makeAutoObservable(this, {
      type: observable,
      key: observable,
      value: observable,
      operator: observable,
      source: observable,
      filters: observable,
      isActive: observable,
      sourceOperator: observable,
      category: observable,

      merge: action,
    });

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

  fromJson(json: any, mainFilterKey = '') {
    const isMetadata = json.type === FilterKey.METADATA;
    let _filter: any = (isMetadata ? filtersMap['_' + json.source] : filtersMap[json.type]) || {};
    if (this.isConditional) {
      _filter = conditionalFiltersMap[json.type] || conditionalFiltersMap[json.source];
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
      value: this.value,
      operator: this.operator,
      source: isMetadata ? this.key.replace(/^_/, '') : this.source,
      sourceOperator: this.sourceOperator,
      filters: Array.isArray(this.filters) ? this.filters.map((i) => i.toJson()) : [],
    };
    if (this.type === FilterKey.DURATION) {
      json.value = this.value.map((i: any) => (!i ? 0 : i));
    }
    return json;
  }
}
