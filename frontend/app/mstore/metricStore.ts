import { makeAutoObservable, runInAction, observable, action, reaction, computed } from "mobx"
import Widget, { IWidget } from "./types/widget";
import { metricService } from "App/services";
import { toast } from 'react-toastify';

export interface IMetricStore {
    paginatedList: any;

    isLoading: boolean
    isSaving: boolean

    metrics: IWidget[]
    instance: IWidget

    page: number
    pageSize: number
    metricsSearch: string
    sort: any
    
    // State Actions
    init(metric?: IWidget|null): void
    updateKey(key: string, value: any): void
    merge(object: any): void
    reset(meitricId: string): void
    addToList(metric: IWidget): void
    updateInList(metric: IWidget): void
    findById(metricId: string): void
    removeById(metricId: string): void

    // API
    save(metric: IWidget, dashboardId?: string): Promise<any>
    fetchList(): void
    fetch(metricId: string)
    delete(metric: IWidget)
}

export default class MetricStore implements IMetricStore {
    isLoading: boolean = false
    isSaving: boolean = false

    metrics: IWidget[] = []
    instance: IWidget = new Widget()

    page: number = 1
    pageSize: number = 4
    metricsSearch: string = ""
    sort: any = {}

    constructor() {
        makeAutoObservable(this, {
            isLoading: observable,
            metrics: observable,
            instance: observable,
            page: observable,
            pageSize: observable,
            metricsSearch: observable,
            sort: observable,

            init: action,
            updateKey: action,
            merge: action,
            reset: action,
            addToList: action,
            updateInList: action,
            findById: action,
            removeById: action,

            save: action,
            fetchList: action,
            fetch: action,
            delete: action,

            paginatedList: computed,
        })

        reaction(
            () => this.metricsSearch,
            (metricsSearch) => { // TODO filter the list for View
                console.log('metricsSearch', metricsSearch)
                this.page = 1
                this.paginatedList
            }
        )
    }

    // State Actions
    init(metric?: IWidget|null) {
        this.instance.update(metric || new Widget())
    }

    updateKey(key: string, value: any) {
        this[key] = value
    }

    merge(object: any) {
        this.instance = Object.assign(this.instance, object)
    }

    reset(id: string) {
        const metric = this.findById(id)
        if (metric) {
            this.instance = metric
        }
    }

    addToList(metric: IWidget) {
        this.metrics.push(metric)
    }

    updateInList(metric: IWidget) {
        const index = this.metrics.findIndex((m: IWidget) => m[Widget.ID_KEY] === metric[Widget.ID_KEY])
        if (index >= 0) {
            this.metrics[index] = metric
        }
    }

    findById(id: string) {
        return this.metrics.find(m => m[Widget.ID_KEY] === id)
    }

    removeById(id: string): void {
        this.metrics = this.metrics.filter(m => m[Widget.ID_KEY] !== id)
    }

    get paginatedList(): IWidget[] {
        const start = (this.page - 1) * this.pageSize
        const end = start + this.pageSize
        return this.metrics.slice(start, end)
    }

    // API Communication
    save(metric: IWidget, dashboardId?: string): Promise<any> {
        const wasCreating = !metric.exists()
        this.isSaving = true
        return metricService.saveMetric(metric, dashboardId)
            .then((metric) => {
                const _metric = new Widget().fromJson(metric)
                if (wasCreating) {
                    toast.success('Metric created successfully')
                    this.addToList(_metric)
                    this.instance = _metric
                } else {
                    toast.success('Metric updated successfully')
                    this.updateInList(_metric)
                }
                return _metric
            }).catch(() => {
                toast.error('Error saving metric')
            }).finally(() => {
                this.isSaving = false
            })
    }

    fetchList() {
        this.isLoading = true
        return metricService.getMetrics()
            .then(metrics => {
                this.metrics = metrics.map(m => new Widget().fromJson(m))
            }).finally(() => {
                this.isLoading = false
            })
    }

    fetch(id: string) {
        this.isLoading = true
        return metricService.getMetric(id)
            .then(metric => {
                return this.instance = new Widget().fromJson(metric)
            }).finally(() => {
                this.isLoading = false
            })
    }

    delete(metric: IWidget) {
        this.isSaving = true
        return metricService.deleteMetric(metric[Widget.ID_KEY])
            .then(() => {
                this.removeById(metric[Widget.ID_KEY])
                toast.success('Metric deleted successfully')
            }).finally(() => {
                this.isSaving = false
            })
    }
}