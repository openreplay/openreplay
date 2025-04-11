import { makeAutoObservable, runInAction } from 'mobx';
import { metricService, errorService } from 'App/services';
import { toast } from 'react-toastify';
import {
  TIMESERIES,
  TABLE,
  FUNNEL,
  ERRORS,
  INSIGHTS,
  HEATMAP,
  USER_PATH,
  RETENTION,
  CATEGORIES
} from 'App/constants/card';
import { clickmapFilter } from 'App/types/filter/newFilter';
import { getRE } from 'App/utils';
import { FilterKey } from 'Types/filter/filterType';
import { ErrorInfo } from './types/error';
import Widget from './types/widget';

const handleFilter = (card: Widget, filterType?: string) => {
  const { metricType } = card;
  if (filterType === 'all' || !filterType || !metricType) {
    return true;
  }
  if ([CATEGORIES.monitors, CATEGORIES.web_analytics].includes(filterType)) {
    if (metricType !== 'table') return false;
    const { metricOf } = card;
    if (filterType === CATEGORIES.monitors) {
      return [
        FilterKey.ERRORS,
        FilterKey.FETCH,
        `${TIMESERIES}_4xx_requests`,
        `${TIMESERIES}_slow_network_requests`
      ].includes(metricOf);
    }
    if (filterType === CATEGORIES.web_analytics) {
      return [
        FilterKey.LOCATION,
        FilterKey.USER_BROWSER,
        FilterKey.REFERRER,
        FilterKey.USERID,
        FilterKey.LOCATION,
        FilterKey.USER_DEVICE
      ].includes(metricOf);
    }
  } else {
    return filterType === metricType;
  }
};

const cardToCategory = (cardType: string) => {
  switch (cardType) {
    case TIMESERIES:
    case FUNNEL:
    case USER_PATH:
    case HEATMAP:
      return CATEGORIES.product_analytics;
    case FilterKey.ERRORS:
    case FilterKey.FETCH:
    case `${TIMESERIES}_4xx_requests`:
    case `${TIMESERIES}_slow_network_requests`:
      return CATEGORIES.monitors;
    case FilterKey.LOCATION:
    case FilterKey.USER_BROWSER:
    case FilterKey.REFERRER:
    case FilterKey.USERID:
      return CATEGORIES.web_analytics;
    default:
      return CATEGORIES.product_analytics;
  }
};

interface MetricFilter {
  query?: string;
  showMine?: boolean;
  type?: string;
  // dashboard?: [];
}

export default class MetricStore {
  isLoading: boolean = false;
  isSaving: boolean = false;
  metrics: Widget[] = [];
  instance = new Widget();
  page: number = 1;
  total: number = 0;
  pageSize: number = 10;
  metricsSearch: string = '';
  sort: any = { columnKey: '', field: '', order: false };
  filter: any = { type: '', query: '' };
  sessionsPage: number = 1;
  sessionsPageSize: number = 10;
  listView?: boolean = true;
  clickMapFilter: boolean = false;
  clickMapSearch = '';
  clickMapLabel = '';
  cardCategory: string | null = CATEGORIES.product_analytics;
  focusedSeriesName: string | null = null;
  disabledSeries: string[] = [];
  drillDown = false;

  constructor() {
    makeAutoObservable(this);
  }

  // get sortedWidgets() {
  //   return [...this.metrics].sort((a, b) =>
  //     this.sort.by === 'desc'
  //       ? b.lastModified - a.lastModified
  //       : a.lastModified - b.lastModified
  //   );
  // }

  get filteredCards() {
    const filterRE = this.filter.query ? getRE(this.filter.query, 'i') : null;
    const dbIds = this.filter.dashboard
      ? this.filter.dashboard.map((i: any) => i.value)
      : [];
    return this.metrics
      .filter(
        (card) =>
          (this.filter.showMine
            ? card.owner ===
            JSON.parse(localStorage.getItem('user')!).account.email
            : true) &&
          handleFilter(card, this.filter.type) &&
          (!dbIds.length ||
            card.dashboards
              .map((i) => i.dashboardId)
              .some((id) => dbIds.includes(id))) &&
          // @ts-ignore
          (!filterRE ||
            ['name', 'owner'].some((key) => filterRE.test(card[key])))
      );
    // .sort((a, b) =>
    //   this.sort.by === 'desc'
    //     ? b.lastModified - a.lastModified
    //     : a.lastModified - b.lastModified
    // );
  }

  // State Actions
  init(metric?: Widget | null) {
    this.instance.update(metric || new Widget());
  }

  setDrillDown(val: boolean) {
    this.drillDown = val;
  }

  setFocusedSeriesName(name: string | null, resetOnSame = true) {
    if (this.focusedSeriesName === name && resetOnSame) {
      this.focusedSeriesName = null;
    } else {
      this.focusedSeriesName = name;
    }
  }

  setDisabledSeries(series: string[]) {
    this.disabledSeries = series;
  }

  setCardCategory(category: string) {
    this.cardCategory = category;
  }

  updateKey(key: string, value: any) {
    // @ts-ignore
    this[key] = value;

    if (key === 'filter') {
      this.page = 1;
    }
  }

  setClickMapsRage(val: boolean) {
    this.clickMapFilter = val;
  }

  changeClickMapSearch(val: string, label: string) {
    this.clickMapSearch = val;
    this.clickMapLabel = label;
  }

  merge(obj: any, updateChangeFlag: boolean = true) {
    const type = obj.metricType;

    if (obj.hasOwnProperty('metricType') && type !== this.instance.metricType) {
      this.instance.series.forEach((s: any, i: number) => {
        this.instance.series[i].filter.eventsOrderSupport = [
          'then',
          'or',
          'and'
        ];
      });
      if (type === HEATMAP && 'series' in obj) {
        delete obj.series;
      }
      this.changeType(type);
    }

    if (
      obj.hasOwnProperty('metricOf') &&
      obj.metricOf !== this.instance.metricOf
    ) {
      if (obj.metricOf === 'sessions' || obj.metricOf === 'jsErrors') {
        obj.viewType = 'table';
      }

      if (this.instance.metricType === USER_PATH) {
        this.instance.series[0].filter.eventsHeader =
          obj.metricOf === 'start-point' ? 'START POINT' : 'END POINT';
      }
    }

    // handle metricValue change
    if (
      obj.hasOwnProperty('metricValue') &&
      obj.metricValue !== this.instance.metricValue
    ) {
      if (Array.isArray(obj.metricValue) && obj.metricValue.length > 0) {
        obj.metricValue = obj.metricValue.filter((i: any) => i.value !== 'all');
      }
    }

    Object.assign(this.instance, obj);
    this.instance.updateKey('hasChanged', updateChangeFlag);
  }

  changeType(value: string, metricOf?: string) {
    const defaultData = {
      sessionId: '',
      sessions: [],
      issues: [],
      total: 0,
      chart: [],
      namesMap: {},
      avg: 0,
      percentiles: [],
      values: []
    };
    const obj: any = { metricType: value, data: defaultData };
    obj.series = this.instance.series;

    obj.series = obj.series.slice(0, 1);
    obj.series[0].filter.filters = [];

    obj.metricValue = [];

    if (value === TABLE) {
      obj.metricOf = 'userId';
    }

    if (value === TABLE || value === TIMESERIES) {
      obj.viewType = 'table';
    }
    if (value === TIMESERIES) {
      obj.viewType = 'lineChart';
    }
    if (value === RETENTION) {
      obj.viewType = 'cohort';
    }
    if (value === ERRORS || value === HEATMAP) {
      obj.viewType = 'chart';
    }

    if (value === FUNNEL) {
      obj.metricOf = 'sessionCount';
      obj.series[0].filter.eventsOrder = 'then';
      obj.series[0].filter.eventsOrderSupport = ['then'];
    }

    if (value === USER_PATH) {
      obj.series[0].filter.eventsHeader = 'START POINT';
    } else {
      obj.series[0].filter.eventsHeader = 'EVENTS';
    }

    if (value === INSIGHTS) {
      obj.metricOf = 'issueCategories';
      obj.viewType = 'list';
    }

    if (value === USER_PATH) {
      // obj['startType'] = 'start';
    }

    if (value === HEATMAP) {
      obj.series = obj.series.slice(0, 1);
      if (this.instance.metricType !== HEATMAP) {
        obj.series[0].filter.removeFilter(0);
      }

      if (obj.series[0] && obj.series[0].filter.filters.length < 1) {
        obj.series[0].filter.addFilter({
          ...clickmapFilter,
          value: ['']
        });
      }
    }

    if (metricOf) {
      obj.metricOf = metricOf;
    }

    this.instance.update(obj);
  }

  reset(id: string) {
    const metric = this.findById(id);
    if (metric) {
      this.instance = metric;
    }
  }

  setInstance(metric: Widget) {
    this.instance = metric;
  }

  addToList(metric: Widget) {
    this.metrics.push(metric);
  }

  updateInList(metric: Widget) {
    // @ts-ignore
    const index = this.metrics.findIndex(
      (m: Widget) => m[Widget.ID_KEY] === metric[Widget.ID_KEY]
    );
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

  // API Communication
  async save(metric: Widget): Promise<Widget> {
    this.isSaving = true;
    try {
      const metricData = await metricService.saveMetric(metric);
      const _metric = new Widget().fromJson(metricData);
      if (!metric.exists()) {
        toast.success('Card created successfully');
        this.instance.updateKey('metricId', _metric.metricId);
        this.addToList(_metric);
      } else {
        toast.success('Card updated successfully');
        this.updateInList(_metric);
      }
      this.instance.updateKey('hasChanged', false);
      return _metric;
    } catch (error) {
      toast.error('Error saving metric');
      throw error;
    } finally {
      this.isSaving = false;
    }
  }

  setLoading(val: boolean) {
    this.isLoading = val;
  }

  setMetrics(metrics: Widget[]) {
    this.metrics = metrics;
  }

  async fetchList() {
    this.setLoading(true);
    try {
      const resp = await metricService
        .getMetricsPaginated({
          page: this.page,
          limit: this.pageSize,
          sort: {
            field: this.sort.field,
            order: this.sort.order === 'ascend' ? 'asc' : 'desc'
          },
          filter: {
            query: this.filter.query,
            type: this.filter.type === 'all' ? '' : this.filter.type,
          }
        });
      this.total = resp.total;
      this.setMetrics(resp.list.map((m) => new Widget().fromJson(m)));
    } finally {
      this.setLoading(false);
    }
  }

  fetch(id: string, period?: any) {
    this.setLoading(true);
    return metricService
      .getMetric(id)
      .then((metric: any) => {
        const inst = new Widget().fromJson(metric, period);
        runInAction(() => {
          this.instance = inst;
          const type =
            inst.metricType === 'table' ? inst.metricOf : inst.metricType;
          this.cardCategory = cardToCategory(type);
        });
        return inst;
      })
      .finally(() => {
        this.setLoading(false);
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
        toast.success('Card deleted successfully');
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
          resolve(new ErrorInfo(error));
        })
        .catch((error: any) => {
          toast.error('Failed to fetch error details.');
          reject(error);
        });
    });
  }
}
