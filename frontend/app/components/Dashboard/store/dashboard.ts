import { makeAutoObservable, makeObservable, observable, action, runInAction, computed, reaction } from "mobx"
import Widget from "./widget"
// import APIClient from 'App/api_client';

export default class Dashboard {
    dashboardId: any = undefined
    name: string = "New Dashboard"
    isPriavte: boolean = false
    widgets: Widget[] = []
    isValid: boolean = false
    isPinned: boolean = false
    
    constructor() {
        makeAutoObservable(this, {
            name: observable,
            isPriavte: observable,
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
        })
    }

    toJson() {
        return {
            dashboardId: this.dashboardId,
            name: this.name,
            isPrivate: this.isPriavte,
            widgets: this.widgets.map(w => w.toJson())
        }
    }

    fromJson(json: any) {
        runInAction(() => {
            this.dashboardId = json.dashboardId
            this.name = json.name
            this.isPriavte = json.isPrivate
            this.widgets = json.widgets.map(w => new Widget().fromJson(w))
        })
        return this
    }

    validate() {
        this.isValid = this.name.length > 0
    }

    addWidget(widget: Widget) {
        this.widgets.push(widget)
    }

    removeWidget(widgetId: string) {
        this.widgets = this.widgets.filter(w => w.widgetId !== widgetId)
    }

    updateWidget(widget: Widget) {
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
}