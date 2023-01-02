import { makeAutoObservable } from 'mobx';
import Widget from './types/widget';
import { metricService, errorService } from 'App/services';
import { toast } from 'react-toastify';
import Error from './types/error';
import { TIMESERIES, TABLE, CLICKMAP, FUNNEL, ERRORS, RESOURCE_MONITORING, PERFORMANCE, WEB_VITALS } from 'App/constants/card';

export default class MetricStore {
  isLoading: boolean = false;
  isSaving: boolean = false;

  metrics: Widget[] = [];
  instance = new Widget();

  page: number = 1;
  pageSize: number = 10;
  metricsSearch: string = '';
  sort: any = { by: 'desc' };

  sessionsPage: number = 1;
  sessionsPageSize: number = 10;
  listView?: boolean = true
  clickMapFilter: boolean = false

  clickMapSearch = ''
  clickMapLabel = ''

  constructor() {
    makeAutoObservable(this);
  }

  get sortedWidgets() {
    return [...this.metrics].sort((a, b) => this.sort.by === 'desc' ? b.lastModified - a.lastModified : a.lastModified - b.lastModified)
  }

  // State Actions
  init(metric?: Widget | null) {
    this.instance.update(metric || new Widget());
  }

  updateKey(key: string, value: any) {
    // @ts-ignore
    this[key] = value;
  }

  setClickMaps(val: boolean) {
    this.clickMapFilter = val
  }

  changeClickMapSearch(val: string, label: string) {
    this.clickMapSearch = val
    this.clickMapLabel = label
  }

  merge(object: any) {
    Object.assign(this.instance, object);
    this.instance.updateKey('hasChanged', true);
  }

  changeType(value: string) {
    const obj: any = { metricType: value};
    if (value === TABLE || value === TIMESERIES) {
      obj['viewType'] = 'table';
    }
    if (value === TIMESERIES) {
      obj['viewType'] = 'lineChart';
    }
    if (value === ERRORS || value === RESOURCE_MONITORING || value === PERFORMANCE || value === WEB_VITALS) {
      obj['viewType'] = 'chart';
    } 

    if (value === FUNNEL) {
      obj['metricOf'] = 'sessionCount';
    }
    this.instance.update(obj)
  }

  reset(id: string) {
    const metric = this.findById(id);
    if (metric) {
      this.instance = metric;
    }
  }

  addToList(metric: Widget) {
    this.metrics.push(metric);
  }

  updateInList(metric: Widget) {
    // @ts-ignore
    const index = this.metrics.findIndex((m: Widget) => m[Widget.ID_KEY] === metric[Widget.ID_KEY]);
    if (index >= 0) {
      this.metrics[index] = metric;
    }
  }

  findById(id: string) {
    // @ts-ignore
    return this.metrics.find((m) => m[Widget.ID_KEY] === id);
  }

  removeById(id: string): void {
    // @ts-ignore
    this.metrics = this.metrics.filter((m) => m[Widget.ID_KEY] !== id);
  }

  get paginatedList(): Widget[] {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.metrics.slice(start, end);
  }

  // API Communication
  async save(metric: Widget): Promise<Widget> {
    this.isSaving = true;
    try {
      const metricData = await metricService.saveMetric(metric);
      const _metric = new Widget().fromJson(metricData);
      if (!metric.exists()) {
        toast.success('Metric created successfully');
        this.addToList(_metric);
      } else {
        toast.success('Metric updated successfully');
        this.updateInList(_metric);
      }
      this.instance = _metric;
      this.instance.updateKey('hasChanged', false);
      return _metric;
    } catch (error) {
      toast.error('Error saving metric');
      throw error;
    } finally {
      this.isSaving = false;
    }
  }

  fetchList() {
    this.isLoading = true;
    return metricService
      .getMetrics()
      .then((metrics: any[]) => {
        this.metrics = metrics.map((m) => new Widget().fromJson(m));
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  fetch(id: string, period?: any) {
    this.isLoading = true;
    return metricService
      .getMetric(id)
      .then((metric: any) => {
        return (this.instance = new Widget().fromJson(metric, period));
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  delete(metric: Widget) {
    this.isSaving = true;
    // @ts-ignore
    return metricService
      .deleteMetric(metric[Widget.ID_KEY])
      .then(() => {
        // @ts-ignore
        this.removeById(metric[Widget.ID_KEY]);
        toast.success('Metric deleted successfully');
      })
      .finally(() => {
        this.instance.updateKey('hasChanged', false);
        this.isSaving = false;
      });
  }

  fetchError(errorId: any): Promise<any> {
    return new Promise((resolve, reject) => {
      errorService
        .one(errorId)
        .then((error: any) => {
          resolve(new Error().fromJSON(error));
        })
        .catch((error: any) => {
          toast.error('Failed to fetch error details.');
          reject(error);
        });
    });
  }
}
