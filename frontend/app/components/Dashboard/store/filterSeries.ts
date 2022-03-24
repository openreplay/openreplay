// import Filter from 'Types/filter';
import Filter from './filter'
import { makeAutoObservable, runInAction, observable, action, reaction } from "mobx"

export default class FilterSeries {
    seriesId?: any = undefined
    name: string = "Series 1"
    filter: Filter =  new Filter()

    constructor() {
        makeAutoObservable(this, {
            name: observable,
            filter: observable,

            update: action,
        })
    }

    update(key, value) {
        this[key] = value
    }
}