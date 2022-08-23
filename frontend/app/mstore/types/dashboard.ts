import { makeAutoObservable, observable, action, runInAction } from "mobx"
import Widget, { IWidget } from "./widget"
import { dashboardService  } from "App/services"
import { toast } from 'react-toastify';
import { DateTime } from 'luxon';

export interface IDashboard {
    dashboardId: any
    name: string
    description: string
    isPublic: boolean
    widgets: IWidget[]
    metrics: any[]
    isValid: boolean
    currentWidget: IWidget
    config: any
    createdAt: Date

    update(data: any): void
    toJson(): any
    fromJson(json: any): void
    validate(): void
    addWidget(widget: IWidget): void
    removeWidget(widgetId: string): void
    updateWidget(widget: IWidget): void
    getWidget(widgetId: string): void
    getWidgetIndex(widgetId: string): IWidget
    getWidgetByIndex(index: number): void
    getWidgetCount(): void
    getWidgetIndexByWidgetId(widgetId: string): void
    swapWidgetPosition(positionA: number, positionB: number): Promise<any>
    sortWidgets(): void
    exists(): boolean
    toggleMetrics(metricId: string): void
}
export default class Dashboard implements IDashboard {
    public static get ID_KEY():string { return "dashboardId" }
    dashboardId: any = undefined
    name: string = "Untitled Dashboard"
    description: string = ""
    isPublic: boolean = true
    widgets: IWidget[] = []
    metrics: any[] = []
    isValid: boolean = false
    currentWidget: IWidget = new Widget()
    config: any = {}
    createdAt: Date = new Date()

    constructor() {
        makeAutoObservable(this)

        this.validate();
    }

    update(data: any) {
        runInAction(() => {
            Object.assign(this, data)
        })
        this.validate()
    }

    toJson() {
        return {
            dashboardId: this.dashboardId,
            name: this.name,
            isPublic: this.isPublic,
            createdAt: this.createdAt,
            metrics: this.metrics,
            description: this.description,
        }
    }

    fromJson(json: any) {
        runInAction(() => {
            this.dashboardId = json.dashboardId
            this.name = json.name
            this.description = json.description
            this.isPublic = json.isPublic
            this.createdAt = DateTime.fromMillis(new Date(json.createdAt).getTime())
            this.widgets = json.widgets ? json.widgets.map((w: Widget) => new Widget().fromJson(w)).sort((a: Widget, b: Widget) => a.position - b.position) : []
        })
        return this
    }

    validate() {
        return this.isValid = this.name.length > 0
    }

    addWidget(widget: IWidget) {
        this.widgets.push(widget)
    }

    removeWidget(widgetId: string) {
        this.widgets = this.widgets.filter(w => w.widgetId !== widgetId)
    }

    updateWidget(widget: IWidget) {
        const index = this.widgets.findIndex(w => w.widgetId === widget.widgetId)
        if (index >= 0) {
            this.widgets[index] = widget
        }
    }

    getWidget(widgetId: string) {
        return this.widgets.find(w => w.widgetId === widgetId)
    }

    getWidgetIndex(widgetId: string) {
        return this.widgets.findIndex(w => w.widgetId === widgetId)
    }

    getWidgetByIndex(index: number) {
        return this.widgets[index]
    }

    getWidgetCount() {
        return this.widgets.length
    }

    getWidgetIndexByWidgetId(widgetId: string) {
        return this.widgets.findIndex(w => w.widgetId === widgetId)
    }

    swapWidgetPosition(positionA, positionB): Promise<any> {
        const widgetA = this.widgets[positionA]
        const widgetB = this.widgets[positionB]
        this.widgets[positionA] = widgetB
        this.widgets[positionB] = widgetA

        widgetA.position = positionB
        widgetB.position = positionA

        return new Promise<void>((resolve, reject) => {
            Promise.all([
                dashboardService.saveWidget(this.dashboardId, widgetA),
                dashboardService.saveWidget(this.dashboardId, widgetB)
            ]).then(() => {
                toast.success("Dashboard updated successfully")
                resolve()
            }).catch(() => {
                toast.error("Error updating widget position")
                reject()
            })
        })
    }

    sortWidgets() {
        this.widgets = this.widgets.sort((a, b) => {
            if (a.position > b.position) {
                return 1
            } else if (a.position < b.position) {
                return -1
            } else {
                return 0
            }
        })
    }

    exists() {
        return this.dashboardId !== undefined
    }

    toggleMetrics(metricId: string) {
        if (this.metrics.includes(metricId)) {
            this.metrics = this.metrics.filter(m => m !== metricId)
        } else {
            this.metrics.push(metricId)
        }
    }
}
