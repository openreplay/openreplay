import { makeAutoObservable, runInAction, observable, action, reaction } from 'mobx';
import { FilterKey, FilterType, FilterCategory } from 'Types/filter/filterType';
import { filtersMap } from 'Types/filter/newFilter';

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

    constructor(data: any = {}) {
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
            data.filters = data.filters.map(function (i) {
                return new FilterItem(i);
            });
        }

        this.merge(data);
    }

    updateKey(key: string, value: any) {
        this[key] = value;
    }

    merge(data: any) {
        Object.keys(data).forEach((key) => {
            this[key] = data[key];
        });
    }

    fromJson(json: any, mainFilterKey = '') {
        const isMetadata = json.type === FilterKey.METADATA;
        let _filter: any = (isMetadata ? filtersMap[json.source] : filtersMap[json.type]) || {};

        if (mainFilterKey) {
            const mainFilter = filtersMap[mainFilterKey];
            const subFilterMap = {};
            mainFilter.filters.forEach((option: any) => {
                subFilterMap[option.key] = option;
            });
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
        this.isEvent = _filter.isEvent;

        (this.value = json.value.length === 0 || !json.value ? [''] : json.value);
        (this.operator = json.operator);
        this.source = json.source;
        this.sourceOperator = json.sourceOperator;

        this.filters =
            _filter.type === FilterType.SUB_FILTERS && json.filters ? json.filters.map((i: any) => new FilterItem().fromJson(i, json.type)) : [];

        this.completed = json.completed;
        this.dropped = json.dropped;
        return this;
    }

    toJson(): any {
        const isMetadata = this.category === FilterCategory.METADATA;
        const json = {
            type: isMetadata ? FilterKey.METADATA : this.key,
            isEvent: this.isEvent,
            value: this.value,
            operator: this.operator,
            source: isMetadata ? this.key : this.source,
            sourceOperator: this.sourceOperator,
            filters: Array.isArray(this.filters) ? this.filters.map((i) => i.toJson()) : [],
        };
        if (this.type === FilterKey.DURATION) {
            json.value = this.value.map((i: any) => !i ? 0 : i)
        }
        return json;
    }
}
