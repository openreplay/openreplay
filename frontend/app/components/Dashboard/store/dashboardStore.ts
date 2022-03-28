import { makeAutoObservable, runInAction, observable, action, reaction } from "mobx"
import Dashboard from "./dashboard"
import APIClient from 'App/api_client';
import Widget from "./widget";
export default class DashboardStore {
    dashboards: Dashboard[] = []
    widgetTemplates: any[] = []
    selectedDashboard: Dashboard | null = new Dashboard()
    newDashboard: Dashboard = new Dashboard()
    isLoading: boolean = false
    siteId: any = null
    currentWidget: Widget = new Widget()
    widgetCategories: any[] = []
    widgets: Widget[] = []
    metricsPage: number = 1
    metricsPageSize: number = 10

    private client = new APIClient()

    constructor() {
        makeAutoObservable(this, {
            dashboards: observable,
            selectedDashboard: observable,
            isLoading: observable,

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
        })


        // TODO remove this sample data
        this.dashboards = sampleDashboards
        // this.selectedDashboard = sampleDashboards[0]

        // setInterval(() => {
        //     this.selectedDashboard?.addWidget(getRandomWidget())
        // }, 3000)

        // setInterval(() => {
        //     this.selectedDashboard?.widgets[4].update({ position: 2 })
        //     this.selectedDashboard?.swapWidgetPosition(2, 0)
        // }, 3000)

        for (let i = 0; i < 20; i++) {
            const widget: any= {};
            widget.widgetId = `${i}`
            widget.name = `Widget ${i}`;
            widget.metricType = ['timeseries', 'table'][Math.floor(Math.random() * 2)];
            this.widgets.push(widget)
        }

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

    resetCurrentWidget() {
        this.currentWidget = new Widget()
    }

    editWidget(widget: Widget) {
        this.currentWidget.update(widget)
    }

    fetchList() {
        this.isLoading = true

        this.client.get('/dashboards')
            .then(response => {
                runInAction(() => {
                    this.dashboards = response.data.map(d => new Dashboard().fromJson(d))
                    this.isLoading = false
                })
            }
        )
    }

    fetch(dashboardId: string) {
        this.isLoading = true
        this.client.get(`/dashboards/${dashboardId}`)
            .then(response => {
                runInAction(() => {
                    this.selectedDashboard = new Dashboard().fromJson(response.data)
                    this.isLoading = false
                })
            }
        )
    }

    save(dashboard: Dashboard) {
        dashboard.validate()
        if (dashboard.isValid) {
            this.isLoading = true
            if (dashboard.dashboardId) {
                this.client.put(`/dashboards/${dashboard.dashboardId}`, dashboard.toJson())
                    .then(response => {
                        runInAction(() => {
                            this.isLoading = false
                        })
                    }
                )
            } else {
                this.client.post('/dashboards', dashboard.toJson())
                    .then(response => {
                        runInAction(() => {
                            this.isLoading = false
                        })
                    }
                )
            }
        } else {
            alert("Invalid dashboard") // TODO show validation errors
        }
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

    initDashboard(dashboard: Dashboard | null) {
        this.selectedDashboard = dashboard || new Dashboard()
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
    }

    setSiteId = (siteId: any) => {
        this.siteId = siteId
    }

    selectDefaultDashboard = () => {
        return new Promise((resolve, reject) => {
            if (this.dashboards.length > 0) {
                const pinnedDashboard = this.dashboards.find(d => d.isPinned)
                if (pinnedDashboard) {
                    this.selectedDashboard = pinnedDashboard
                } else {
                    this.selectedDashboard = this.dashboards[0]
                }
            }
            resolve(this.selectedDashboard)
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