import { makeAutoObservable, runInAction, observable, action, reaction } from "mobx"
import Filter from 'Types/filter';
import FilterSeries from "./filterSeries";

export default class Widget {
    widgetId: any = undefined
    name: string = "New Metric"
    metricType: string = "timeseries"
    metricOf: string = "sessionCount"
    metricValue: string = ""
    viewType: string = "lineChart"
    series: FilterSeries[] = []
    sessions: [] = []

    position: number = 0
    data: any = {}
    isLoading: boolean = false
    isValid: boolean = false
    dashboardId: any = undefined
    colSpan: number = 2
    
    constructor() {
        makeAutoObservable(this, {
            widgetId: observable,
            name: observable,
            metricType: observable,
            metricOf: observable,
            position: observable,
            data: observable,
            isLoading: observable,
            isValid: observable,
            dashboardId: observable,
            addSeries: action,
            colSpan: observable,

            fromJson: action,
            toJson: action,
            validate: action,
            update: action,
            udpateKey: action,
        })

        const filterSeries = new FilterSeries()
        this.series.push(filterSeries)
    }

    udpateKey(key: string, value: any) {
        this[key] = value
    }

    removeSeries(index: number) {
        this.series.splice(index, 1)
    }

    addSeries() {
        const series = new FilterSeries()
        series.name = "Series " + (this.series.length + 1)
        this.series.push(series)
    }


    fromJson(json: any) {
        runInAction(() => {
            this.widgetId = json.widgetId
            this.name = json.name
            this.data = json.data
        })
        return this
    }

    toJson() {
        return {
            widgetId: this.widgetId,
            name: this.name,
            data: this.data
        }
    }

    validate() {
        this.isValid = this.name.length > 0
    }

    update(data: any) {
        runInAction(() => {
            Object.assign(this, data)
        })
    }
}