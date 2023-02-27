// import Filter from 'Types/filter';
import Filter from './filter'
import { makeAutoObservable, observable, action } from "mobx"

export default class FilterSeries {
    public static get ID_KEY():string { return "seriesId" }
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

    fromJson(json) {
        this.seriesId = json.seriesId
        this.name = json.name
        this.filter = new Filter().fromJson(json.filter || { filters: [] })
        return this
    }

    toJson() {
        return {
            seriesId: this.seriesId,
            name: this.name,
            filter: this.filter.toJson(),
        }
    }
}