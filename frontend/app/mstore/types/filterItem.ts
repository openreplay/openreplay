import { makeAutoObservable, runInAction, observable, action, reaction } from "mobx"
import { FilterKey, FilterType } from 'Types/filter/filterType'
import { filtersMap } from 'Types/filter/newFilter'

export default class FilterItem {
    type: string = ''
    key: string = ''
    label: string = ''
    value: any = [""]
    isEvent: boolean = false
    operator: string = ''
    source: string = ''
    filters: FilterItem[] = []
    operatorOptions: any[] = []
    options: any[] = []
    isActive: boolean = true
    completed: number = 0
    dropped: number = 0

    constructor(data: any = {}) {
        makeAutoObservable(this, {
            type: observable,
            key: observable,
            value: observable,
            operator: observable,
            source: observable,
            filters: observable,
            isActive: observable,

            merge: action
        })

        if (Array.isArray(data.filters)) {
            data.filters = data.filters.map(function (i) {
                return new FilterItem(i);
            });
        }

        this.merge(data)
    }

    updateKey(key: string, value: any) {
        this[key] = value
    }

    merge(data) {
        Object.keys(data).forEach(key => {
            this[key] = data[key]
        })
    }

    fromJson(json, mainFilterKey = '') {
        let _filter = filtersMap[json.type] || {}
        if (mainFilterKey) {
            const mainFilter = filtersMap[mainFilterKey];
            const subFilterMap = {}
            mainFilter.filters.forEach(option => {
                subFilterMap[option.key] = option
            })
            _filter = subFilterMap[json.type]
        }
        this.type = _filter.type
        this.key = _filter.key
        this.label = _filter.label
        this.operatorOptions = _filter.operatorOptions
        this.options = _filter.options
        this.isEvent = _filter.isEvent

        this.value = json.value.length === 0 || !json.value ? [""] : json.value,
        this.operator = json.operator
        
        this.filters = _filter.type === FilterType.SUB_FILTERS && json.filters ? json.filters.map(i => new FilterItem().fromJson(i, json.type)) : []

        this.completed = json.completed
        this.dropped = json.dropped
        return this
    }

    toJson() {
        const json = {
            type: this.key,
            isEvent: this.isEvent,
            value: this.value,
            operator: this.operator,
            source: this.source,
            filters: Array.isArray(this.filters) ? this.filters.map(i => i.toJson()) : [],
        }
        return json
    }
}