import { makeAutoObservable, observable, action, runInAction } from "mobx"
import Widget, { IWidget } from "./widget"

export interface IDashboard {
    dashboardId: any
    name: string
    isPublic: boolean
    widgets: IWidget[]
    metrics: any[]
    isValid: boolean
    isPinned: boolean
    currentWidget: IWidget

    update(data: any): void
    toJson(): any
    fromJson(json: any): void
    validate(): void
    addWidget(widget: IWidget): void
    removeWidget(widgetId: string): void
    updateWidget(widget: IWidget): void
    getWidget(widgetId: string): void
    getWidgetIndex(widgetId: string)
    getWidgetByIndex(index: number): void
    getWidgetCount(): void
    getWidgetIndexByWidgetId(widgetId: string): void
    swapWidgetPosition(positionA: number, positionB: number): void
    sortWidgets(): void
    exists(): boolean
}
export default class Dashboard implements IDashboard {
    public static get ID_KEY():string { return "dashboardId" }
    dashboardId: any = undefined
    name: string = "New Dashboard"
    isPublic: boolean = false
    widgets: IWidget[] = []
    metrics: any[] = []
    isValid: boolean = false
    isPinned: boolean = false
    currentWidget: IWidget = new Widget()
    
    constructor() {
        makeAutoObservable(this, {
            name: observable,
            isPublic: observable,
            widgets: observable,
            isValid: observable,

            toJson: action,
            fromJson: action,
            addWidget: action,
            removeWidget: action,
            updateWidget: action,
            getWidget: action,
            getWidgetIndex: action,
            getWidgetByIndex: action,
            getWidgetCount: action,
            getWidgetIndexByWidgetId: action,
            validate: action,
            sortWidgets: action,
            swapWidgetPosition: action,
            update: action,
        })

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
            isPrivate: this.isPublic,
            // widgets: this.widgets.map(w => w.toJson())
            // widgets: this.widgets
            metrics: this.metrics
        }
    }

    fromJson(json: any) {
        runInAction(() => {
            this.dashboardId = json.dashboardId
            this.name = json.name
            this.isPublic = json.isPublic
            this.isPinned = json.isPinned
            this.widgets = json.widgets ? json.widgets.map(w => new Widget().fromJson(w)) : []
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

    swapWidgetPosition(positionA, positionB) {
        console.log('swapWidgetPosition', positionA, positionB)
        const widgetA = this.widgets[positionA]
        const widgetB = this.widgets[positionB]
        this.widgets[positionA] = widgetB
        this.widgets[positionB] = widgetA

        widgetA.position = positionB
        widgetB.position = positionA
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
}