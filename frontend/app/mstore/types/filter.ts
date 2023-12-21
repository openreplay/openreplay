import { makeAutoObservable, runInAction, observable, action } from "mobx"
import FilterItem from "./filterItem"
import { filtersMap, conditionalFiltersMap } from 'Types/filter/newFilter';

export default class Filter {
    public static get ID_KEY():string { return "filterId" }
    filterId: string = ''
    name: string = ''
    filters: FilterItem[] = []
    excludes: FilterItem[] = []
    eventsOrder: string = 'then'
    eventsOrderSupport: string[] = ['then', 'or', 'and']
    startTimestamp: number = 0
    endTimestamp: number = 0
    eventsHeader: string = "EVENTS"
    page: number = 1
    limit: number = 10

    constructor(private readonly isConditional = false) {
        makeAutoObservable(this, {
            filters: observable,
            eventsOrder: observable,
            startTimestamp: observable,
            endTimestamp: observable,

            addFilter: action,
            removeFilter: action,
            updateKey: action,
            merge: action,
            addExcludeFilter: action,
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
            filter.filters = filter.filters.map((i: Record<string, any>) => {
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
        // @ts-ignore fix later
        this[key] = value
    }

    removeFilter(index: number) {
        this.filters.splice(index, 1)
    }

    fromJson(json: any) {
        this.name = json.name
        this.filters = json.filters.map((i: Record<string, any>) =>
          new FilterItem(undefined, this.isConditional).fromJson(i)
        );
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

    createFilterBykey(key: string) {
        const usedMap = this.isConditional ? conditionalFiltersMap : filtersMap
        return usedMap[key] ? new FilterItem(usedMap[key]) : new FilterItem()
    }

    toJson() {
        const json = {
            name: this.name,
            filters: this.filters.map(i => i.toJson()),
            eventsOrder: this.eventsOrder,
        }
        return json
    }

    addExcludeFilter(filter: FilterItem) {
        this.excludes.push(filter)
    }

    updateExcludeFilter(index: number, filter: FilterItem) {
        this.excludes[index] = new FilterItem(filter)
    }

    removeExcludeFilter(index: number) {
        this.excludes.splice(index, 1)
    }
}
