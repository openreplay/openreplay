import { makeAutoObservable, runInAction, observable, action, reaction } from "mobx"
import Filter from 'Types/filter';
import FilterSeries from "./filterSeries";

export interface IWidget {
    widgetId: any
    name: string
    metricType: string
    metricOf: string
    metricValue: string
    viewType: string
    series: FilterSeries[]
    sessions: []
    isPublic: boolean
    owner: string
    lastModified: Date
    dashboardIds: any[]

    position: number
    data: any
    isLoading: boolean
    isValid: boolean
    dashboardId: any
    colSpan: number

    udpateKey(key: string, value: any): void
    removeSeries(index: number): void
    addSeries(): void
    fromJson(json: any): void
    toJson(): any
    validate(): void
    update(data: any): void
}
export default class Widget implements IWidget {
    widgetId: any = undefined
    name: string = "New Metric"
    metricType: string = "timeseries"
    metricOf: string = "sessionCount"
    metricValue: string = ""
    viewType: string = "lineChart"
    series: FilterSeries[] = []
    sessions: [] = []
    isPublic: boolean = false
    owner: string = ""
    lastModified: Date = new Date()
    dashboardIds: any[] = []

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
            metricOf: this.metricOf,
            metricValue: this.metricValue,
            viewType: this.viewType,
            series: this.series,
            sessions: this.sessions,
            isPublic: this.isPublic,
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