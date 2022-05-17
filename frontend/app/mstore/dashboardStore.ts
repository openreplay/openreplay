import { makeAutoObservable, runInAction, observable, action, reaction } from "mobx"
import Dashboard, { IDashboard } from "./types/dashboard"
import Widget, { IWidget } from "./types/widget";
import { dashboardService, metricService } from "App/services";
import { toast } from 'react-toastify';
import Period, { LAST_24_HOURS, LAST_7_DAYS } from 'Types/app/period';
import { getChartFormatter } from 'Types/dashboard/helper';
import Filter, { IFilter } from "./types/filter";

export interface IDashboardSotre {
    dashboards: IDashboard[]
    selectedDashboard: IDashboard | null
    dashboardInstance: IDashboard
    selectedWidgets: IWidget[]
    startTimestamp: number
    endTimestamp: number
    period: Period
    drillDownFilter: IFilter

    siteId: any
    currentWidget: Widget
    widgetCategories: any[]
    widgets: Widget[]
    metricsPage: number
    metricsPageSize: number
    metricsSearch: string

    isLoading: boolean
    isSaving: boolean
    isDeleting: boolean
    fetchingDashboard: boolean
    sessionsLoading: boolean

    showAlertModal: boolean

    selectWidgetsByCategory: (category: string) => void
    toggleAllSelectedWidgets: (isSelected: boolean) => void
    removeSelectedWidgetByCategory(category: string): void
    toggleWidgetSelection(widget: IWidget): void

    initDashboard(dashboard?: IDashboard): void
    updateKey(key: string, value: any): void
    resetCurrentWidget(): void
    editWidget(widget: any): void
    fetchList(): Promise<any>
    fetch(dashboardId: string): Promise<any>
    save(dashboard: IDashboard): Promise<any>
    saveDashboardWidget(dashboard: Dashboard, widget: Widget)
    deleteDashboard(dashboard: IDashboard): Promise<any>
    toJson(): void
    fromJson(json: any): void
    // initDashboard(dashboard: IDashboard): void
    addDashboard(dashboard: IDashboard): void
    removeDashboard(dashboard: IDashboard): void
    getDashboard(dashboardId: string): IDashboard|null
    getDashboardCount(): void
    updateDashboard(dashboard: IDashboard): void
    selectDashboardById(dashboardId: string): void
    setSiteId(siteId: any): void
    selectDefaultDashboard(): Promise<IDashboard>

    saveMetric(metric: IWidget, dashboardId?: string): Promise<any>
    fetchTemplates(): Promise<any>
    deleteDashboardWidget(dashboardId: string, widgetId: string): Promise<any>
    addWidgetToDashboard(dashboard: IDashboard, metricIds: any): Promise<any>

    updatePinned(dashboardId: string): Promise<any>
    fetchMetricChartData(metric: IWidget, data: any, isWidget: boolean): Promise<any>
    setPeriod(period: any): void
}
export default class DashboardStore implements IDashboardSotre {
    siteId: any = null
    // Dashbaord / Widgets
    dashboards: Dashboard[] = []
    selectedDashboard: Dashboard | null = null
    dashboardInstance: IDashboard = new Dashboard()
    selectedWidgets: IWidget[] = [];
    currentWidget: Widget = new Widget()
    widgetCategories: any[] = []
    widgets: Widget[] = []
    period: Period = Period({ rangeName: LAST_7_DAYS })
    drillDownFilter: Filter = new Filter()
    startTimestamp: number = 0
    endTimestamp: number = 0

    // Metrics
    metricsPage: number = 1
    metricsPageSize: number = 10
    metricsSearch: string = ''

    // Loading states
    isLoading: boolean = true
    isSaving: boolean = false
    isDeleting: boolean = false
    fetchingDashboard: boolean = false
    sessionsLoading: boolean = false;

    showAlertModal: boolean = false;

    constructor() {
        makeAutoObservable(this, {
            dashboards: observable.ref,
            drillDownFilter: observable.ref,
            widgetCategories: observable.ref,
            selectedDashboard: observable.ref,
            resetCurrentWidget: action,
            addDashboard: action,
            removeDashboard: action,
            updateDashboard: action,
            getDashboard: action,
            getDashboardByIndex: action,
            getDashboardCount: action,
            selectDashboardById: action,
            selectDefaultDashboard: action,
            toJson: action,
            fromJson: action,
            setSiteId: action,
            editWidget: action,
            updateKey: action,
            save: action,

            selectWidgetsByCategory: action,
            toggleAllSelectedWidgets: action,
            removeSelectedWidgetByCategory: action,
            toggleWidgetSelection: action,
            fetchTemplates: action,
            updatePinned: action,
            setPeriod: action,

            fetchMetricChartData: action
        })

        const drillDownPeriod = Period({ rangeName: LAST_7_DAYS }).toTimestamps();
        this.drillDownFilter.updateKey('startTimestamp', drillDownPeriod.startTimestamp)
        this.drillDownFilter.updateKey('endTimestamp', drillDownPeriod.endTimestamp)
    }

    toggleAllSelectedWidgets(isSelected: boolean) {
        if (isSelected) {
            const allWidgets = this.widgetCategories.reduce((acc, cat) => {
                return acc.concat(cat.widgets)
            }, [])

            this.selectedWidgets = allWidgets
        } else {
            this.selectedWidgets = []
        }
    }

    selectWidgetsByCategory(category: string) {
        const selectedWidgetIds = this.selectedWidgets.map((widget: any) => widget.metricId);
        const widgets = this.widgetCategories.find(cat => cat.name === category)?.widgets.filter(widget => !selectedWidgetIds.includes(widget.metricId))
        this.selectedWidgets = this.selectedWidgets.concat(widgets) || []
    }

    removeSelectedWidgetByCategory = (category: any) => {
        const categoryWidgetIds = category.widgets.map(w => w.metricId)
        this.selectedWidgets = this.selectedWidgets.filter((widget: any) => !categoryWidgetIds.includes(widget.metricId));
    }

    toggleWidgetSelection = (widget: any) => {
        const selectedWidgetIds = this.selectedWidgets.map((widget: any) => widget.metricId);
        if (selectedWidgetIds.includes(widget.metricId)) {
            this.selectedWidgets =  this.selectedWidgets.filter((w: any) => w.metricId !== widget.metricId);
        } else {
            this.selectedWidgets.push(widget);
        }
    };

    findByIds(ids: string[]) {
        return this.dashboards.filter(d => ids.includes(d.dashboardId))
    }

    initDashboard(dashboard: Dashboard) {
        this.dashboardInstance = dashboard ? new Dashboard().fromJson(dashboard) : new Dashboard()
        this.selectedWidgets = []
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

    fetchList(): Promise<any> {
        this.isLoading = true

        return dashboardService.getDashboards()
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

    fetch(dashboardId: string): Promise<any> {
        this.fetchingDashboard = true
        return dashboardService.getDashboard(dashboardId).then(response => {
            // const widgets =  new Dashboard().fromJson(response).widgets
            this.selectedDashboard?.update({ 'widgets' : new Dashboard().fromJson(response).widgets})
        }).finally(() => {
            this.fetchingDashboard = false
        })
    }

    save(dashboard: IDashboard): Promise<any> {
        this.isSaving = true
        const isCreating = !dashboard.dashboardId

        dashboard.metrics = this.selectedWidgets.map(w => w.metricId)

        return new Promise((resolve, reject) => {
            dashboardService.saveDashboard(dashboard).then(_dashboard => {
                runInAction(() => {
                    if (isCreating) {
                        toast.success('Dashboard created successfully')
                        this.addDashboard(new Dashboard().fromJson(_dashboard))
                    } else {
                        toast.success('Dashboard updated successfully')
                        this.updateDashboard(new Dashboard().fromJson(_dashboard))
                    }
                    resolve(_dashboard)
                })
            }).catch(error => {
                toast.error('Error saving dashboard')
                reject()
            }).finally(() => {
                runInAction(() => {
                    this.isSaving = false
                })
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
        }
    }

    deleteDashboard(dashboard: Dashboard): Promise<any> {
        this.isDeleting = true
        return dashboardService.deleteDashboard(dashboard.dashboardId).then(() => {
            toast.success('Dashboard deleted successfully')
            runInAction(() => {
                this.removeDashboard(dashboard)
            })
        })
        .catch(() => {
            toast.error('Dashboard could not be deleted')
        })
        .finally(() => {
            runInAction(() => {
                this.isDeleting = false
            })
        })
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
        this.dashboards.push(new Dashboard().fromJson(dashboard))
    }

    removeDashboard(dashboard: Dashboard) {
        this.dashboards = this.dashboards.filter(d => d.dashboardId !== dashboard.dashboardId)
    }

    getDashboard(dashboardId: string): IDashboard|null {
        return this.dashboards.find(d => d.dashboardId === dashboardId) || null
    }

    getDashboardByIndex(index: number) {
        return this.dashboards[index]
    }

    getDashboardCount() {
        return this.dashboards.length
    }

    updateDashboard(dashboard: Dashboard) {
        const index = this.dashboards.findIndex(d => d.dashboardId === dashboard.dashboardId)
        if (index >= 0) {
            this.dashboards[index] = dashboard
            if (this.selectedDashboard?.dashboardId === dashboard.dashboardId) {
                this.selectDashboardById(dashboard.dashboardId)
            }
        }
    }

    selectDashboardById = (dashboardId: any) => {
        this.selectedDashboard = this.dashboards.find(d => d.dashboardId == dashboardId) || new Dashboard();
        // if (this.selectedDashboard.dashboardId) {
        //     this.fetch(this.selectedDashboard.dashboardId)
        // }
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

                resolve(this.selectedDashboard)
            }
            reject(new Error("No dashboards found"))
        })
    }

    fetchTemplates(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.widgetCategories.length > 0) {
                resolve(this.widgetCategories)
            } else {
                metricService.getTemplates().then(response => {
                    const categories: any[] = []
                    response.forEach(category => {
                        const widgets: any[] = []
                        // TODO speed_location is not supported yet
                        category.widgets.filter(w => w.predefinedKey !== 'speed_locations').forEach(widget => {
                            const w = new Widget().fromJson(widget)
                            widgets.push(w)
                        })
                        const c: any = {}
                        c.widgets = widgets
                        c.name = category.category
                        c.description = category.description
                        categories.push(c)
                    })
                    this.widgetCategories = categories
                    resolve(this.widgetCategories)
                }).catch(error => {
                    reject(error)
                })
            }
        })
    }

    deleteDashboardWidget(dashboardId: string, widgetId: string) {
        this.isDeleting = true
        return dashboardService.deleteWidget(dashboardId, widgetId).then(() => {
            toast.success('Dashboard updated successfully')
            runInAction(() => {
                this.selectedDashboard?.removeWidget(widgetId)
            })
        }).finally(() => {
            this.isDeleting = false
        })
    }

    addWidgetToDashboard(dashboard: IDashboard, metricIds: any) : Promise<any> {
        this.isSaving = true
        return dashboardService.addWidget(dashboard, metricIds)
            .then(response => {
                toast.success('Widget added successfully')
            }).catch(() => {
                toast.error('Widget could not be added')
            }).finally(() => {
                this.isSaving = false
            })

    }

    updatePinned(dashboardId: string): Promise<any> {
        // this.isSaving = true
        return dashboardService.updatePinned(dashboardId).then(() => {
            toast.success('Dashboard pinned successfully')
            this.dashboards.forEach(d => {
                if (d.dashboardId === dashboardId) {
                    d.isPinned = true
                } else {
                    d.isPinned = false
                }
            })
        }).catch(() => {
            toast.error('Dashboard could not be pinned')
        }).finally(() => {
            // this.isSaving = false
        })
    }

    setPeriod(period: any) {
        this.period = Period({ start: period.startDate, end: period.endDate, rangeName: period.rangeValue })
    }

    fetchMetricChartData(metric: IWidget, data: any, isWidget: boolean = false): Promise<any> {
        const period = this.period.toTimestamps()
        return new Promise((resolve, reject) => {
            // this.isLoading = true
            return metricService.getMetricChartData(metric, { ...period, ...data, key: metric.predefinedKey }, isWidget)
                .then(data => {
                    if (metric.metricType === 'predefined' && metric.viewType === 'overview') {
                        const _data = { ...data, chart: getChartFormatter(this.period)(data.chart) }
                        metric.setData(_data)
                        resolve(_data);
                    } else {
                        const _data = {
                            ...data,
                        }
                        if (data.hasOwnProperty('chart')) {
                            _data['chart'] = getChartFormatter(this.period)(data.chart)
                            _data['namesMap'] = data.chart
                                .map(i => Object.keys(i))
                                .flat()
                                .filter(i => i !== 'time' && i !== 'timestamp')
                                .reduce((unique: any, item: any) => {
                                    if (!unique.includes(item)) {
                                        unique.push(item);
                                    }
                                    return unique;
                                }, [])
                        } else {
                            _data['chart'] =  getChartFormatter(this.period)(Array.isArray(data) ? data : []);
                            _data['namesMap'] = Array.isArray(data) ? data.map(i => Object.keys(i))
                                .flat()
                                .filter(i => i !== 'time' && i !== 'timestamp')
                                .reduce((unique: any, item: any) => {
                                    if (!unique.includes(item)) {
                                        unique.push(item);
                                    }
                                    return unique;
                                }, []) : []
                        }

                        metric.setData(_data)
                        resolve(_data);
                    }
                }).catch((err) => {
                    reject(err)
                })
        })
    }
}
