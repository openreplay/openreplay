import { makeAutoObservable, runInAction, observable, action, reaction, computed } from "mobx"
import FilterSeries from "./filterSeries";
import { DateTime } from 'luxon';

export interface IWidget {
    metricId: any
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
    dashboards: any[]
    dashboardIds: any[]
    config: any

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
    exists(): boolean
}
export default class Widget implements IWidget {
    public static get ID_KEY():string { return "metricId" }
    metricId: any = undefined
    widgetId: any = undefined
    name: string = "New Metric"
    metricType: string = "timeseries"
    metricOf: string = "sessionCount"
    metricValue: string = ""
    viewType: string = "lineChart"
    series: FilterSeries[] = []
    sessions: [] = []
    isPublic: boolean = true
    owner: string = ""
    lastModified: Date = new Date()
    dashboards: any[] = []
    dashboardIds: any[] = []
    config: any = {}

    position: number = 0
    data: any = {}
    isLoading: boolean = false
    isValid: boolean = false
    dashboardId: any = undefined
    colSpan: number = 2
    
    constructor() {
        makeAutoObservable(this, {
            // data: observable,
            widgetId: observable,
            name: observable,
            metricType: observable,
            metricOf: observable,
            position: observable,
            isLoading: observable,
            isValid: observable,
            dashboardId: observable,
            colSpan: observable,
            series: observable,
            
            addSeries: action,
            removeSeries: action,
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
            this.metricId = json.metricId
            this.widgetId = json.widgetId
            this.metricValue = json.metricValue
            this.metricOf = json.metricOf
            this.metricType = json.metricType
            this.name = json.name
            this.series = json.series ? json.series.map((series: any) => new FilterSeries().fromJson(series)) : [],
            this.dashboards = json.dashboards
            this.owner = json.ownerEmail
            this.lastModified = DateTime.fromISO(json.editedAt || json.createdAt)
            this.config = json.config
            this.position = json.config.position
        })
        return this
    }

    toJson() {
        return {
            metricId: this.metricId,
            widgetId: this.widgetId,
            metricOf: this.metricOf,
            metricValue: this.metricValue,
            metricType: this.metricType,
            viewType: this.viewType,
            name: this.name,
            series: this.series.map((series: any) => series.toJson()),
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

    exists() {
        return this.metricId !== undefined
    }
}