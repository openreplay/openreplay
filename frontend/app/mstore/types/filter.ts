import { makeAutoObservable, runInAction, observable, action, reaction } from "mobx"
import { FilterKey, FilterType } from 'Types/filter/filterType'
import { filtersMap } from 'Types/filter/newFilter'
import FilterItem from "./filterItem"
export default class Filter {
    public static get ID_KEY():string { return "filterId" }
    name: string = ''
    filters: FilterItem[] = []
    eventsOrder: string = 'then'
    startTimestamp: number = 0
    endTimestamp: number = 0

    constructor() {
        makeAutoObservable(this, {
            filters: observable,
            eventsOrder: observable,

            addFilter: action,
            removeFilter: action,
            updateKey: action,
        })
    }

    addFilter(filter: any) {
        filter.value = [""]
        if (filter.hasOwnProperty('filters')) {
            filter.filters = filter.filters.map(i => {
                i.value = [""]
                return new FilterItem(i)
            })
        }
        this.filters.push(new FilterItem(filter))
    }

    updateFilter(index: number, filter: any) {
        this.filters[index] = new FilterItem(filter)
    }

    updateKey(key, value) {
        this[key] = value
    }

    removeFilter(index: number) {
        this.filters.splice(index, 1)
    }

    fromJson(json) {
        this.name = json.name
        this.filters = json.filters.map(i => new FilterItem().fromJson(i))
        this.eventsOrder = json.eventsOrder
        return this
    }

    toJsonDrilldown() {
        const json = {
            name: this.name,
            filters: this.filters.map(i => i.toJson()),
            eventsOrder: this.eventsOrder,
            startTimestamp: this.startTimestamp,
            endTimestamp: this.endTimestamp,
        }
        return json
    }

    toJson() {
        const json = {
            name: this.name,
            filters: this.filters.map(i => i.toJson()),
            eventsOrder: this.eventsOrder,
        }
        return json
    }
}