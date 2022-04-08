import { filter } from "App/components/BugFinder/ManageFilters/savedFilterList.css"
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

    constructor(data: any = {}) {
        makeAutoObservable(this, {
            type: observable,
            key: observable,
            value: observable,
            operator: observable,
            source: observable,
            filters: observable,

            merge: action
        })

        this.merge(data)
    }

    merge(data) {
        Object.keys(data).forEach(key => {
            this[key] = data[key]
        })
    }

    fromJson(json, mainFilterKey = '') {
        let _filter = filtersMap[json.type]
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
        
        this.value = json.value.length === 0 || !json.value ? [""] : json.value,
        this.operator = json.operator
        this.isEvent = _filter.isEvent
        this.filters = _filter.type === FilterType.SUB_FILTERS && json.filters ? json.filters.map(i => new FilterItem().fromJson(i, json.type)) : []
        return this
    }

    toJson() {
        const json = {
            type: this.key,
            isEvent: this.isEvent,
            value: this.value,
            operator: this.operator,
            source: this.source,
            filters: this.filters.map(i => i.toJson()),
        }
        return json
    }
}