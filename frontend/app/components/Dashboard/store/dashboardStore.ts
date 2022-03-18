import { makeAutoObservable, runInAction, observable, action, reaction } from "mobx"
import Dashboard from "./dashboard"
import APIClient from 'App/api_client';
import Widget from "./widget";

export default class DashboardStore {
    dashboards: Dashboard[] = []
    selectedDashboard: Dashboard | null = new Dashboard()
    isLoading: boolean = false
    siteId: any = null

    private client = new APIClient()

    constructor() {
        makeAutoObservable(this, {
            dashboards: observable,
            selectedDashboard: observable,
            isLoading: observable,

            addDashboard: action,
            removeDashboard: action,
            updateDashboard: action,
            getDashboard: action,
            getDashboardIndex: action,
            getDashboardByIndex: action,
            getDashboardCount: action,
            getDashboardIndexByDashboardId: action,
            selectDashboardById: action,            
            toJson: action,
            fromJson: action,
            setSiteId: action,
        })


        // TODO remove this sample data
        this.dashboards = sampleDashboards
        this.selectedDashboard = sampleDashboards[0]

        // setInterval(() => {
        //     this.selectedDashboard?.addWidget(getRandomWidget())
        // }, 3000)

        // setInterval(() => {
        //     this.selectedDashboard?.widgets[4].update({ position: 2 })
        //     this.selectedDashboard?.swapWidgetPosition(2, 0)
        // }, 3000)
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
        this.selectedDashboard = this.dashboards.find(d => d.dashboardId == dashboardId) || null;;
    }

    setSiteId = (siteId: any) => {
        this.siteId = siteId
    }

    selectDefaultDashboard = () => {
        const pinnedDashboard = this.dashboards.find(d => d.isPinned)
        if (this.dashboards.length > 0) {
            if (pinnedDashboard) {
                this.selectedDashboard = pinnedDashboard
            } else {
                this.selectedDashboard = this.dashboards[0]
            }
        } else {
            this.selectedDashboard = new Dashboard()
        }
    }
}

function getRandomWidget() {
    const widget = new Widget();
    widget.widgetId = Math.floor(Math.random() * 100);
    widget.name = "Widget " + Math.floor(Math.random() * 100);
    widget.type = "random";
    widget.colSpan = Math.floor(Math.random() * 2) + 1;
    return widget;
}

function getRandomDashboard(id: any = null) {
    const dashboard = new Dashboard();
    dashboard.name = "Random Dashboard";
    dashboard.dashboardId = id ? id : "random-dashboard-" +  Math.floor(Math.random() * 10);
    for (let i = 0; i < 10; i++) {
        const widget = getRandomWidget();
        widget.position = i;
        dashboard.addWidget(widget);
    }
    return dashboard;
}

const sampleDashboards = [
    getRandomDashboard(12),
    getRandomDashboard(),
    getRandomDashboard(),
    getRandomDashboard(),
]