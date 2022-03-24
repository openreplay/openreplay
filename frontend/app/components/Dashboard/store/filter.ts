import { makeAutoObservable, runInAction, observable, action, reaction } from "mobx"

export default class Filter {
    name: string = ''
    filters: any[] = []
    eventsOrder: string = 'then'

    constructor() {
        makeAutoObservable(this, {
            addFilter: action,
            removeFilter: action,
            updateKey: action,
        })
    }

    addFilter(filter: any) {
        filter.value = [""]
        if (filter.hasOwnProperty('filters')) {
            filter.filters = filter.filters.map(i => ({ ...i, value: [""] }))
        }
        this.filters.push(filter)
        console.log('addFilter', this.filters)
    }

    updateFilter(index: number, filter: any) {
        this.filters[index] = filter
        console.log('updateFilter', this.filters)
    }

    updateKey(key, value) {
        this[key] = value
    }

    removeFilter(index: number) {
        this.filters.splice(index, 1)
    }
}