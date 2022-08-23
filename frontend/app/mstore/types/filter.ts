import { makeAutoObservable, runInAction, observable, action } from "mobx"
import FilterItem from "./filterItem"

export default class Filter {
    public static get ID_KEY():string { return "filterId" }
    filterId: string = ''
    name: string = ''
    filters: FilterItem[] = []
    eventsOrder: string = 'then'
    startTimestamp: number = 0
    endTimestamp: number = 0

    constructor() {
        makeAutoObservable(this, {
            filters: observable,
            eventsOrder: observable,
            startTimestamp: observable,
            endTimestamp: observable,

            addFilter: action,
            removeFilter: action,
            updateKey: action,
            merge: action,
        })
    }

    merge(filter: any) {
        runInAction(() => {
            Object.assign(this, filter)
        })
    }

    addFilter(filter: any) {
        filter.value = [""]
        if (Array.isArray(filter.filters)) {
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

    updateKey(key: string, value: any) {
        this[key] = value
    }

    removeFilter(index: number) {
        this.filters.splice(index, 1)
    }

    fromJson(json: any) {
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
