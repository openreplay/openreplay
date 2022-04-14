import { makeAutoObservable, runInAction, observable, action, reaction, computed } from "mobx"
import FilterSeries from "./filterSeries";
import { DateTime } from 'luxon';
import { IFilter } from "./filter";
import { metricService } from "App/services";
import Session, { ISession } from "App/mstore/types/session";
export interface IWidget {
    metricId: any
    widgetId: any
    name: string
    metricType: string
    metricOf: string
    metricValue: string
    metricFormat: string
    viewType: string
    series: FilterSeries[]
    sessions: []
    isPublic: boolean
    owner: string
    lastModified: Date
    dashboards: any[]
    dashboardIds: any[]
    config: any

    sessionsLoading: boolean

    position: number
    data: any
    isLoading: boolean
    isValid: boolean
    dashboardId: any
    colSpan: number
    predefinedKey: string

    params: any

    udpateKey(key: string, value: any): void
    removeSeries(index: number): void
    addSeries(): void
    fromJson(json: any): void
    toJsonDrilldown(json: any): void
    toJson(): any
    validate(): void
    update(data: any): void
    exists(): boolean
    toWidget(): any
    setData(data: any): void
    fetchSessions(filter: any): Promise<any>
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
    metricFormat: string = "sessionCount"
    series: FilterSeries[] = []
    sessions: [] = []
    isPublic: boolean = true
    owner: string = ""
    lastModified: Date = new Date()
    dashboards: any[] = []
    dashboardIds: any[] = []
    config: any = {}
    params: any = { density: 70 }

    sessionsLoading: boolean = false

    position: number = 0
    data: any = {
        chart: [],
        namesMap: {}
    }
    isLoading: boolean = false
    isValid: boolean = false
    dashboardId: any = undefined
    colSpan: number = 2
    predefinedKey: string = ''
    
    constructor() {
        makeAutoObservable(this, {
            sessionsLoading: observable,
            data: observable.ref,
            metricId: observable,
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
        json.config = json.config || {}
        runInAction(() => {
            this.metricId = json.metricId
            this.widgetId = json.widgetId
            this.metricValue = json.metricValue
            this.metricOf = json.metricOf
            this.metricType = json.metricType
            this.metricFormat = json.metricFormat
            this.viewType = json.viewType
            this.name = json.name
            this.series = json.series ? json.series.map((series: any) => new FilterSeries().fromJson(series)) : [],
            this.dashboards = json.dashboards
            this.owner = json.ownerEmail
            // this.lastModified = json.editedAt || json.createdAt ? DateTime.fromMillis(json.editedAt || json.createdAt) : null
            this.lastModified = DateTime.fromMillis(1649319074)
            this.config = json.config
            this.position = json.config.position
            this.predefinedKey = json.predefinedKey
        })
        return this
    }

    toWidget(): any {
        return {
            config: {
                position: this.position,
                col: this.config.col,
                row: this.config.row,
            }
        }
    }

    toJsonDrilldown() {
        return {
            series: this.series.map((series: any) => series.toJson()),
        }
    }

    toJson() {
        return {
            metricId: this.metricId,
            widgetId: this.widgetId,
            metricOf: this.metricOf,
            metricValue: this.metricValue,
            metricType: this.metricType,
            metricFormat: this.metricFormat,
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

    setData(data: any) {
        runInAction(() => {
            Object.assign(this.data, data)
        })
    }

    fetchSessions(filter: any): Promise<any> {
        this.sessionsLoading = true
        return new Promise((resolve, reject) => {
            console.log('fetching sessions', filter)
            metricService.fetchSessions(this.metricId, filter).then(response => {
                resolve(response.map(cat => {
                    return {
                        ...cat,
                        sessions: cat.sessions.map(s => new Session().fromJson(s))
                    }
                }))
            }).finally(() => {
                this.sessionsLoading = false
            })
        })
    }
}