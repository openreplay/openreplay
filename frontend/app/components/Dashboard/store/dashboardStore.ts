import { makeAutoObservable, runInAction, observable, action, reaction } from "mobx"
import Dashboard, { IDashboard } from "./dashboard"
import APIClient from 'App/api_client';
import Widget, { IWidget } from "./widget";
import { dashboardService } from "App/services";

export interface IDashboardSotre {
    dashboards: IDashboard[]
    widgetTemplates: any[]
    selectedDashboard: IDashboard | null
    dashboardInstance: IDashboard
    siteId: any
    currentWidget: Widget
    widgetCategories: any[]
    widgets: Widget[]
    metricsPage: number
    metricsPageSize: number
    metricsSearch: string
    
    isLoading: boolean
    isSaving: boolean

    initDashboard(dashboard?: IDashboard): void
    updateKey(key: string, value: any): void
    resetCurrentWidget(): void
    editWidget(widget: any): void
    fetchList(): void
    fetch(dashboardId: string)
    save(dashboard: IDashboard): Promise<any>
    saveDashboardWidget(dashboard: Dashboard, widget: Widget)
    delete(dashboard: IDashboard)
    toJson(): void
    fromJson(json: any): void
    initDashboard(dashboard: IDashboard): void
    addDashboard(dashboard: IDashboard): void
    removeDashboard(dashboard: IDashboard): void
    getDashboard(dashboardId: string): void
    getDashboardIndex(dashboardId: string): number
    getDashboardCount(): void
    getDashboardIndexByDashboardId(dashboardId: string): number
    updateDashboard(dashboard: IDashboard): void
    selectDashboardById(dashboardId: string): void
    setSiteId(siteId: any): void
    selectDefaultDashboard(): Promise<IDashboard>

    saveMetric(metric: IWidget, dashboardId?: string): Promise<any>
}
export default class DashboardStore implements IDashboardSotre {
    siteId: any = null
    // Dashbaord / Widgets
    dashboards: Dashboard[] = []
    widgetTemplates: any[] = []
    selectedDashboard: Dashboard | null = new Dashboard()
    dashboardInstance: IDashboard = new Dashboard()
    currentWidget: Widget = new Widget()
    widgetCategories: any[] = []
    widgets: Widget[] = []
    
    // Metrics
    metricsPage: number = 1
    metricsPageSize: number = 10
    metricsSearch: string = ''
    
    // Loading states
    isLoading: boolean = false
    isSaving: boolean = false

    private client = new APIClient()

    constructor() {
        makeAutoObservable(this, {
            resetCurrentWidget: action,
            addDashboard: action,
            removeDashboard: action,
            updateDashboard: action,
            getDashboard: action,
            getDashboardIndex: action,
            getDashboardByIndex: action,
            getDashboardCount: action,
            getDashboardIndexByDashboardId: action,
            selectDashboardById: action,
            selectDefaultDashboard: action, 
            toJson: action,
            fromJson: action,
            setSiteId: action,
            editWidget: action,
            updateKey: action,
        })


        // TODO remove this sample data
        // this.dashboards = sampleDashboards

        // for (let i = 0; i < 15; i++) {
        //     const widget: any= {};
        //     widget.widgetId = `${i}`
        //     widget.name = `Widget ${i}`;
        //     widget.metricType = ['timeseries', 'table'][Math.floor(Math.random() * 2)];
        //     this.widgets.push(widget)
        // }

        for (let i = 0; i < 4; i++) {
            const cat: any = { 
                name: `Category ${i + 1}`,
                categoryId: i,
                description: `Category ${i + 1} description`,
                widgets: []
            }
            
            const randomNumber = Math.floor(Math.random() * (5 - 2 + 1)) + 2
            for (let j = 0; j < randomNumber; j++) {
                const widget: any= {};
                widget.widgetId = `${i}-${j}`
                widget.name = `Widget ${i}-${j}`;
                widget.metricType = ['timeseries', 'table'][Math.floor(Math.random() * 2)];
                cat.widgets.push(widget);
            }

            this.widgetCategories.push(cat)
        }
    }

    initDashboard(dashboard: Dashboard) {
        this.dashboardInstance = dashboard || new Dashboard()
    }

    updateKey(key: any, value: any) {
        this[key] =  value
    }

    resetCurrentWidget() {
        this.currentWidget = new Widget()
    }

    editWidget(widget: any) {
        this.currentWidget.update(widget)
    }

    fetchList() {
        this.isLoading = true

        dashboardService.getDashboards()
            .then((list: any) => {
                runInAction(() => {
                    this.dashboards = list.map(d => new Dashboard().fromJson(d))
                })
            }).finally(() => {
                runInAction(() => {
                    this.isLoading = false
                })
            })
    }

    fetch(dashboardId: string) {
        this.isLoading = true
        dashboardService.getDashboard(dashboardId).then(response => {
            runInAction(() => {
                this.selectedDashboard = new Dashboard().fromJson(response)
            })
        }).finally(() => {
            runInAction(() => {
                this.isLoading = false
            })
        })
    }

    save(dashboard: IDashboard): Promise<any> {
        this.isSaving = true
        const isCreating = !dashboard.dashboardId
        return dashboardService.saveDashboard(dashboard).then(response => {
            runInAction(() => {
                if (isCreating) {
                    this.addDashboard(response.data)
                } else {
                    this.updateDashboard(response.data)
                }
            })
        }).finally(() => {
            runInAction(() => {
                this.isSaving = false
            })
        })
    }

    saveMetric(metric: IWidget, dashboardId: string): Promise<any> {
        const isCreating = !metric.widgetId
        return dashboardService.saveMetric(metric, dashboardId).then(metric => {
            runInAction(() => {
                if (isCreating) {
                    this.selectedDashboard?.widgets.push(metric)
                } else {
                    this.selectedDashboard?.widgets.map(w => {
                        if (w.widgetId === metric.widgetId) {
                            w.update(metric)
                        }
                    })
                }
            })
        })
    }

    saveDashboardWidget(dashboard: Dashboard, widget: Widget) {
        widget.validate()
        if (widget.isValid) {
            this.isLoading = true
            if (widget.widgetId) {
                this.client.put(`/dashboards/${dashboard.dashboardId}/widgets/${widget.widgetId}`, widget.toJson())
                    .then(response => {
                        runInAction(() => {
                            this.isLoading = false
                        })
                    }
                )
            } else {
                this.client.post(`/dashboards/${dashboard.dashboardId}/widgets`, widget.toJson())
                    .then(response => {
                        runInAction(() => {
                            this.isLoading = false
                        })
                    }
                )
            }
        }
    }

    delete(dashboard: Dashboard) {
        this.isLoading = true
        this.client.delete(`/dashboards/${dashboard.dashboardId}`)
            .then(response => {
                runInAction(() => {
                    this.isLoading = false
                })
            }
        )
    }

    toJson() {
        return {
            dashboards: this.dashboards.map(d => d.toJson())
        }
    }

    fromJson(json: any) {
        runInAction(() => {
            this.dashboards = json.dashboards.map(d => new Dashboard().fromJson(d))
        })
        return this
    }

    addDashboard(dashboard: Dashboard) {
        this.dashboards.push(dashboard)
    }

    removeDashboard(dashboard: Dashboard) {
        this.dashboards = this.dashboards.filter(d => d !== dashboard)
    }

    getDashboard(dashboardId: string) {
        return this.dashboards.find(d => d.dashboardId === dashboardId)
    }

    getDashboardIndex(dashboardId: string) {
        return this.dashboards.findIndex(d => d.dashboardId === dashboardId)
    }

    getDashboardByIndex(index: number) {
        return this.dashboards[index]
    }

    getDashboardCount() {
        return this.dashboards.length
    }

    getDashboardIndexByDashboardId(dashboardId: string) {
        return this.dashboards.findIndex(d => d.dashboardId === dashboardId)
    }

    updateDashboard(dashboard: Dashboard) {
        const index = this.dashboards.findIndex(d => d.dashboardId === dashboard.dashboardId)
        if (index >= 0) {
            this.dashboards[index] = dashboard
        }
    }

    selectDashboardById = (dashboardId: any) => {
        this.selectedDashboard = this.dashboards.find(d => d.dashboardId == dashboardId) || new Dashboard();
        if (this.selectedDashboard.dashboardId) {
            this.fetch(this.selectedDashboard.dashboardId)
        }
    }

    setSiteId = (siteId: any) => {
        this.siteId = siteId
    }

    selectDefaultDashboard = (): Promise<Dashboard> => {
        return new Promise((resolve, reject) => {
            if (this.dashboards.length > 0) {
                const pinnedDashboard = this.dashboards.find(d => d.isPinned)
                if (pinnedDashboard) {
                    this.selectedDashboard = pinnedDashboard
                } else {
                    this.selectedDashboard = this.dashboards[0]
                }
            }
            if (this.selectedDashboard) {
                resolve(this.selectedDashboard)
            }

            reject(new Error("No dashboards found"))
        })
    }
}

function getRandomWidget() {
    const widget = new Widget();
    widget.widgetId = Math.floor(Math.random() * 100);
    widget.name = randomMetricName();
    // widget.type = "random";
    widget.colSpan = Math.floor(Math.random() * 2) + 1;
    return widget;
}

function generateRandomPlaceName() {
    const placeNames = [
        "New York",
        "Los Angeles",
        "Chicago",
        "Houston",
        "Philadelphia",
        "Phoenix",
        "San Antonio",
        "San Diego",
    ]
    return placeNames[Math.floor(Math.random() * placeNames.length)]
}


function randomMetricName () {
    const metrics = ["Revenue", "Profit", "Expenses", "Sales", "Orders", "Revenue", "Profit", "Expenses", "Sales", "Orders", "Revenue", "Profit", "Expenses", "Sales", "Orders", "Revenue", "Profit", "Expenses", "Sales", "Orders"];
    return metrics[Math.floor(Math.random() * metrics.length)];
}

function getRandomDashboard(id: any = null, isPinned = false) {
    const dashboard = new Dashboard();
    dashboard.name = generateRandomPlaceName();
    dashboard.dashboardId = id ? id : Math.floor(Math.random() * 10);
    dashboard.isPinned = isPinned;
    for (let i = 0; i < 8; i++) {
        const widget = getRandomWidget();
        widget.position = i;
        dashboard.addWidget(widget);
    }
    return dashboard;
}

const sampleDashboards = [
    getRandomDashboard(1, true),
    getRandomDashboard(2),
    getRandomDashboard(3),
    getRandomDashboard(4),
]