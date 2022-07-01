import { makeAutoObservable, runInAction, observable, action } from "mobx"
import FilterSeries from "./filterSeries";
import { DateTime } from 'luxon';
import { metricService, errorService } from "App/services";
import Session from "App/mstore/types/session";
import Funnelissue from 'App/mstore/types/funnelIssue';
import { issueOptions } from 'App/constants/filterOptions';
import { FilterKey } from 'Types/filter/filterType';
import Period, { LAST_24_HOURS, LAST_30_DAYS } from 'Types/app/period';

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
    
    page: number
    limit: number
    params: any
    period: any
    hasChanged: boolean

    updateKey(key: string, value: any): void
    removeSeries(index: number): void
    addSeries(): void
    fromJson(json: any): void
    toJsonDrilldown(): void
    toJson(): any
    validate(): void
    update(data: any): void
    exists(): boolean
    toWidget(): any
    setData(data: any): void
    fetchSessions(metricId: any, filter: any): Promise<any>
    setPeriod(period: any): void
}
export default class Widget implements IWidget {
    public static get ID_KEY():string { return "metricId" }
    metricId: any = undefined
    widgetId: any = undefined
    name: string = "New Metric"
    // metricType: string = "timeseries"
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
    page: number = 1
    limit: number = 5
    params: any = { density: 70 }
    
    period: any = Period({ rangeName: LAST_24_HOURS }) // temp value in detail view
    hasChanged: boolean = false

    sessionsLoading: boolean = false

    position: number = 0
    data: any = {
        sessions: [],
        total: 0,
        chart: [],
        namesMap: {},
        avg: 0,
        percentiles: [],
    }
    isLoading: boolean = false
    isValid: boolean = false
    dashboardId: any = undefined
    colSpan: number = 2
    predefinedKey: string = ''
    
    constructor() {
        makeAutoObservable(this)

        const filterSeries = new FilterSeries()
        this.series.push(filterSeries)
    }

    updateKey(key: string, value: any) {
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

    fromJson(json: any, period?: any) {
        json.config = json.config || {}
        runInAction(() => {
            this.metricId = json.metricId
            this.widgetId = json.widgetId
            this.metricValue = this.metricValueFromArray(json.metricValue)
            this.metricOf = json.metricOf
            this.metricType = json.metricType
            this.metricFormat = json.metricFormat
            this.viewType = json.viewType
            this.name = json.name
            this.series = json.series ? json.series.map((series: any) => new FilterSeries().fromJson(series)) : [],
            this.dashboards = json.dashboards || []
            this.owner = json.ownerEmail
            this.lastModified = json.editedAt || json.createdAt ? DateTime.fromMillis(json.editedAt || json.createdAt) : null
            this.config = json.config
            this.position = json.config.position
            this.predefinedKey = json.predefinedKey

            if (period) {
                this.period = period
            }
        })
        return this
    }

    setPeriod(period: any) {
        this.period = new Period({ start: period.startDate, end: period.endDate, rangeName: period.rangeName })
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
        return this.series.map((series: any) => series.toJson())
    }

    toJson() {
        return {
            metricId: this.metricId,
            widgetId: this.widgetId,
            metricOf: this.metricOf,
            metricValue: this.metricValueToArray(this.metricValue),
            metricType: this.metricType,
            metricFormat: this.metricFormat,
            viewType: this.viewType,
            name: this.name,
            series: this.series.map((series: any) => series.toJson()),
            config: {
                ...this.config,
                col: this.metricType === 'funnel' || this.metricOf === FilterKey.ERRORS || this.metricOf === FilterKey.SESSIONS ? 4 : this.config.col
            },
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
        this.data = data;
    }

    fetchSessions(metricId: any, filter: any): Promise<any> {
        return new Promise((resolve, reject) => {
            metricService.fetchSessions(metricId, filter).then((response: any[]) => {
                resolve(response.map((cat: { sessions: any[]; }) => {
                    return {
                        ...cat,
                        sessions: cat.sessions.map((s: any) => new Session().fromJson(s))
                    }
                }))
            })
        })
    }

    fetchIssues(filter: any): Promise<any> {
        return new Promise((resolve, reject) => {
            metricService.fetchIssues(filter).then((response: any) => {
                const significantIssues = response.issues.significant ? response.issues.significant.map((issue: any) => new Funnelissue().fromJSON(issue)) : []
                const insignificantIssues = response.issues.insignificant ? response.issues.insignificant.map((issue: any) => new Funnelissue().fromJSON(issue)) : []
                resolve({
                    issues: significantIssues.length > 0 ? significantIssues : insignificantIssues,
                })
            })
        })
    }

    fetchIssue(funnelId: any, issueId: any, params: any): Promise<any> {
        return new Promise((resolve, reject) => {
            metricService.fetchIssue(funnelId, issueId, params).then((response: any) => {
                resolve({
                    issue: new Funnelissue().fromJSON(response.issue),
                    sessions: response.sessions.sessions.map((s: any) => new Session().fromJson(s)),
                })
            }).catch((error: any) => {
                reject(error)
            })
        })
    }

    private metricValueFromArray(metricValue: any) {
        if (!Array.isArray(metricValue)) return metricValue;
        return issueOptions.filter((i: any) => metricValue.includes(i.value))
    }

    private metricValueToArray(metricValue: any) {
        if (!Array.isArray(metricValue)) return metricValue;
        return metricValue.map((i: any) => i.value)
    }
}
