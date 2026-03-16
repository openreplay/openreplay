import Period, { LAST_24_HOURS } from 'Types/app/period';
import { getChartFormatter } from 'Types/dashboard/helper';
import { FilterKey } from 'Types/filter/filterType';
import { DateTime } from 'luxon';
import { makeAutoObservable, observable, runInAction } from 'mobx';

import {
  FUNNEL,
  HEATMAP,
  INSIGHTS,
  TABLE,
  TIMESERIES,
  USER_PATH,
  WEBVITALS,
} from 'App/constants/card';
import {
  issueCategories,
  issueCategoriesMap,
  issueOptions,
  pathAnalysisEvents,
} from 'App/constants/filterOptions';
import { durationFormatted } from 'App/date';
import { filterStore } from 'App/mstore';
import Funnelissue from 'App/mstore/types/funnelIssue';
import Session from 'App/mstore/types/session';
import { metricService } from 'App/services';
import {
  collectChartLines,
  collectTimestamps,
  isLeaf,
  sortByTotal,
  stripOverall,
} from 'App/utils/breakdownTree';

import { ErrorInfo } from '../types/error';
import Funnel from '../types/funnel';
import Issue from '../types/issue';
import Filter from './filter';
import FilterItem from './filterItem';
import FilterSeries from './filterSeries';
import { SessionsByRow } from './sessionsCardData';

export class InsightIssue {
  icon: string;
  iconColor: string;
  change: number;
  isNew = false;
  category: string;
  label: string;
  value: number;
  oldValue: number;
  isIncreased?: boolean;

  constructor(
    category: string,
    public name: string,
    public ratio: number,
    oldValue = 0,
    value = 0,
    change = 0,
    isNew = false,
  ) {
    this.category = category;
    this.value = Math.round(value);
    this.oldValue = Math.round(oldValue);
    // @ts-ignore
    this.label = issueCategoriesMap[category];
    this.icon = `ic-${category}`;

    this.change = parseInt(change.toFixed(2));
    this.isIncreased = this.change > 0;
    this.iconColor = 'gray-dark';
    this.isNew = isNew;
  }
}

function cleanFilter(filter: any) {
  delete filter['operatorOptions'];
  delete filter['placeholder'];
  delete filter['category'];
  delete filter['label'];
  delete filter['icon'];
  delete filter['key'];
}

export default class Widget {
  public static get ID_KEY(): string {
    return 'metricId';
  }

  metricId: any = undefined;
  widgetId: any = undefined;
  category?: string = undefined;
  name: string = 'Untitled Card';
  metricType: string = 'timeseries';
  metricOf: string = 'sessionCount';
  metricValue: [] = [];
  viewType: string = 'lineChart';
  metricFormat: string = 'sessionCount';
  series: FilterSeries[] = [];
  sessions: [] = [];
  isPublic: boolean = true;
  owner: string = '';
  lastModified: DateTime | null = new Date().getTime();
  dashboards: any[] = [];
  dashboardIds: any[] = [];
  config: any = {};
  page: number = 1;
  limit: number = 20;
  thumbnail?: string;
  params: any = { density: 35 };
  startType: string = 'start';
  stepsBefore: number = 0; // specific to user journey
  stepsAfter: number = 5; // specific to user journey
  rows: number = 5;
  columns: number = 4;
  startPoint: FilterItem | null = null;
  excludes: FilterItem[] = [];
  hideExcess?: boolean = true;
  compareTo: [startDate?: string, endDate?: string] | null = null;
  sortBy?: string = '';
  sortOrder?: string = 'desc';
  includeClickRage?: boolean = false;
  breakdowns: string[] = [];

  period: Record<string, any> = Period({ rangeName: LAST_24_HOURS }); // temp value in detail view
  hasChanged: boolean = false;

  position: number = 0;
  data: any = {
    sessionId: '',
    sessions: [],
    issues: [],
    total: 0,
    values: [],
    chart: [],
    namesMap: [],
    avg: 0,
    percentiles: [],
    urlPath: null,
  };
  isLoading: boolean = false;
  isValid: boolean = false;
  dashboardId: any = undefined;
  predefinedKey: string = '';

  constructor() {
    makeAutoObservable(this);

    const filterSeries = new FilterSeries();
    this.series.push(filterSeries);

    // if (this.metricType === USER_PATH) {
    //   const f = filterStore.findEvent({
    //     name: FilterKey.LOCATION,
    //     autoCaptured: true,
    //   });

    //   this.updateStartPoint(f);
    // }
  }

  updateKey(key: string, value: any) {
    this[key] = value;
  }

  removeSeries(index: number) {
    this.series.splice(index, 1);
    this.hasChanged = true;
  }

  setSeries(series: FilterSeries[]) {
    this.series = series;
  }

  addSeries() {
    this.hasChanged = true;
    const series = new FilterSeries();
    series.name = 'Series ' + (this.series.length + 1);
    this.series.push(series);
  }

  addBreakdown(filter: any) {
    this.breakdowns = [...this.breakdowns, filter.name];
    this.hasChanged = true;
  }

  updateBreakdown(index: number, filter: any) {
    const next = [...this.breakdowns];
    next[index] = filter.name;
    this.breakdowns = next;
    this.hasChanged = true;
  }

  removeBreakdown(index: number) {
    this.breakdowns = this.breakdowns.filter(
      (_: any, i: number) => i !== index,
    );
    this.hasChanged = true;
  }

  moveBreakdown(fromIndex: number, toIndex: number) {
    const next = [...this.breakdowns];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    this.breakdowns = next;
    this.hasChanged = true;
  }

  createSeries(filters: Record<string, any>) {
    const series = new FilterSeries().fromData({
      filter: { filters },
      name: 'AI Query',
      seriesId: 1,
    });
    this.setSeries([series]);
  }

  fromJson(json: any, period?: any) {
    json.config = json.config || {};
    runInAction(() => {
      this.dashboardId = json.dashboardId;
      this.metricId = json.metricId;
      this.widgetId = json.widgetId;
      this.metricValue = this.metricValueFromArray(
        json.metricValue,
        json.metricType,
      );
      this.metricOf = json.metricOf;
      this.metricType = json.metricType;
      this.metricFormat = json.metricFormat;
      this.viewType = json.viewType;
      this.name = json.name;
      this.compareTo = json.compareTo || null;
      this.series =
        json.series && json.series.length > 0
          ? json.series.map((series: any) =>
              new FilterSeries().fromJson(series, this.metricType === HEATMAP),
            )
          : [new FilterSeries()];
      this.dashboards = json.dashboards || [];
      this.owner = json.ownerName;
      this.lastModified =
        json.editedAt || json.createdAt
          ? DateTime.fromISO(json.editedAt || json.createdAt)
          : null;
      this.config = json.config;
      this.position = json.config.position;
      this.predefinedKey = json.predefinedKey;
      this.category = json.category;
      this.thumbnail = json.thumbnail;
      this.data.sessionId = json.sessionId;
      this.isPublic = json.isPublic;
      this.sortBy = json.sortBy || '';
      this.sortOrder = json.sortOrder || 'desc';
      this.breakdowns = json.breakdowns || [];

      if (this.metricType === FUNNEL) {
        this.series[0].filter.eventsOrder = 'then';
        this.series[0].filter.eventsOrderSupport = ['then'];
      }

      if (this.metricType === USER_PATH) {
        if (json.viewType === 'chart') {
          this.viewType = 'lineChart';
        }
        this.hideExcess = json.hideExcess;
        this.startType = json.startType;
        this.rows = json.rows;
        this.stepsBefore = json.stepsBefore;
        this.stepsAfter = json.stepsAfter;
        this.columns = json.columns;
        this.metricValue =
          json.metricValue && json.metricValue.length > 0
            ? json.metricValue
            : ['LOCATION'];
        if (json.startPoint) {
          if (Array.isArray(json.startPoint) && json.startPoint.length > 0) {
            const sp = json.startPoint[0];
            const event = filterStore.findEvent({
              name: sp.name,
              autoCaptured: sp.autoCaptured,
            });

            event.filters = sp.filters;
            this.startPoint = new FilterItem().fromJson(event);
          }

          if (json.startPoint == typeof Object) {
            this.startPoint = json.startPoint;
          }
        }

        this.excludes =
          Array.isArray(json.excludes) && json.excludes.length > 0
            ? new Filter().fromJson({ filters: json.excludes }).filters
            : [];

        // TODO change this to excludes after the api change
        // if (json.excludes) {
        //   this.series[0].filter.excludes = json.excludes.map((i: any) =>
        //     new FilterItem().fromJson(i),
        //   );
        // }
      }

      if (this.metricType === HEATMAP) {
        this.series[0].maxEvents = 1;
        this.includeClickRage = json.includeClickRage;
      }

      if (this.metricType === WEBVITALS) {
        this.series[0].maxEvents = 1;
      }

      if (period) {
        this.period = period;
      }
    });
    return this;
  }

  toWidget(): any {
    return {
      config: {
        position: this.position,
        col: this.config.col,
        row: this.config.row,
      },
    };
  }

  toJson() {
    const data: any = {
      metricId: this.metricId,
      widgetId: this.widgetId,
      metricOf: this.metricOf,
      metricValue: this.metricValueToArray(this.metricValue),
      metricType: this.metricType,
      metricFormat: this.metricFormat,
      viewType: this.viewType,
      name: this.name,
      series: this.series.map((series: any) => series.toJson()),
      thumbnail: this.thumbnail,
      sessionId: this.data.sessionId,
      page: this.page,
      rows: this.rows,
      stepsBefore: this.stepsBefore,
      stepsAfter: this.stepsAfter,
      columns: 4,
      limit: this.limit,
      compareTo: this.compareTo,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      breakdowns: this.breakdowns,
      config: {
        ...this.config,
        col:
          this.metricType === FUNNEL ||
          this.metricOf === FilterKey.ERRORS ||
          this.metricOf === FilterKey.SESSIONS ||
          this.metricOf === FilterKey.SLOWEST_RESOURCES ||
          this.metricOf === FilterKey.MISSING_RESOURCES ||
          this.metricOf === FilterKey.PAGES_RESPONSE_TIME_DISTRIBUTION ||
          this.metricType === USER_PATH
            ? 4
            : 2,
        row: this.metricType === USER_PATH ? 2 : 1,
      },
    };

    if (this.metricType === USER_PATH) {
      data.hideExcess = this.hideExcess;
      data.startType = this.startType;
      data.startPoint = this.startPoint ? [this.startPoint.toJson()] : [];
      data.excludes = this.excludes.map((i: any) => i.toJson());
      data.metricOf = 'sessionCount';
    }

    if (this.metricType === HEATMAP) {
      data.includeClickRage = this.includeClickRage;
    }
    return data;
  }

  updateStartPoint(startPoint: any) {
    runInAction(() => {
      if (!startPoint.filters.length) {
        filterStore.getEventFilters(startPoint.id).then((filters) => {
          const matching = filters?.filter((p) => p.defaultProperty) || [];
          const newFilter = new FilterItem(startPoint);
          // @ts-ignore
          newFilter.filters = matching;
          this.startPoint = newFilter;
          this.hasChanged = true;
        });
      } else {
        this.startPoint = new FilterItem(startPoint);
        this.hasChanged = true;
      }
    });
  }

  updateExcludes(excludes: any[]) {
    runInAction(() => {
      this.excludes = excludes.map((i: any) => new FilterItem(i));
      this.hasChanged = true;
    });
  }

  updateExcludeByIndex(index: number, exclude: any) {
    runInAction(() => {
      const newExcludes = this.excludes.toSpliced(
        index,
        1,
        new FilterItem(exclude),
      );
      this.excludes = newExcludes;
      this.hasChanged = true;
    });
  }

  removeExcludeByIndex(index: number) {
    runInAction(() => {
      this.excludes.splice(index, 1);
      this.hasChanged = true;
    });
  }

  validate() {
    this.isValid = this.name.length > 0;
  }

  update(data: any) {
    runInAction(() => {
      Object.assign(this, data);
    });
  }

  resetDefaults() {
    if (this.metricType === FUNNEL) {
      this.series = [];
      this.series.push(new FilterSeries());
      this.series[0].filter.addFunnelDefaultFilters();
      this.series[0].filter.eventsOrder = 'then';
      this.series[0].filter.eventsOrderSupport = ['then'];
    }
  }

  exists() {
    return this.metricId !== undefined;
  }

  calculateTotalSeries = (data: any): any => {
    return Array.isArray(data)
      ? data.map((entry) => {
          const total = Object.keys(entry)
            .filter((key) => key !== 'timestamp' && key !== 'time')
            .reduce((sum, key) => sum + entry[key], 0);
          return { ...entry, Total: total };
        })
      : [];
  };

  setPage(page: number) {
    this.page = page;
  }

  /**
   * Detect whether `data` uses the new series-based format:
   * { series: { seriesName: { "$overall": { timestamp: value }, breakdownKey: { timestamp: value } } } }
   */
  private isNewSeriesFormat(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      data.series &&
      typeof data.series === 'object'
    );
  }

  private transformNewSeriesFormat(
    seriesObj: Record<string, any>,
    isComparison: boolean,
  ): {
    chart: Record<string, any>[];
    namesMap: string[];
    breakdownData: Record<string, any> | null;
  } {
    const seriesNames = Object.keys(seriesObj);
    const tsSet = new Set<string>();
    const allLines: { name: string; data: Record<string, number> }[] = [];

    seriesNames.forEach((seriesName) => {
      const seriesContent = seriesObj[seriesName];
      collectTimestamps(seriesContent, tsSet);
      const lines = collectChartLines(seriesContent, seriesName);
      allLines.push(...lines);
    });

    const timestamps = Array.from(tsSet).sort((a, b) => Number(a) - Number(b));

    // its easier to sort now for "show top X" functionality + readability in table
    allLines.sort((a, b) => {
      const sumA = Object.values(a.data).reduce((s, v) => s + v, 0);
      const sumB = Object.values(b.data).reduce((s, v) => s + v, 0);
      return sumB - sumA;
    });

    const namesMap = allLines.map((l) =>
      isComparison ? `Previous ${l.name}` : l.name,
    );

    const chart = timestamps.map((ts) => {
      const point: Record<string, any> = { timestamp: Number(ts) };
      allLines.forEach((line) => {
        const finalName = isComparison ? `Previous ${line.name}` : line.name;
        point[finalName] = line.data[ts] ?? 0;
      });
      return point;
    });

    // no breakdown: { seriesName: { ts: value } }
    // with breakdown: { seriesName: { key: { ... } } } (stripped of $overall)
    const breakdownData: Record<string, any> = {};
    seriesNames.forEach((seriesName) => {
      const seriesContent = seriesObj[seriesName];

      if (isLeaf(seriesContent)) {
        breakdownData[seriesName] = seriesContent;
        return;
      }

      // use $overall as flat series data, overlay with stripped breakdown
      const sorted = sortByTotal(seriesContent);
      const stripped = stripOverall(sorted);
      breakdownData[seriesName] = stripped ?? seriesContent.$overall ?? {};
    });

    return {
      chart,
      namesMap,
      breakdownData,
    };
  }

  private transformFunnelSeriesFormat(seriesObj: Record<string, any>): {
    funnel: Funnel;
    funnelBreakdown?: Record<string, Funnel>;
  } {
    const seriesKeys = Object.keys(seriesObj);
    if (seriesKeys.length === 0) {
      return { funnel: new Funnel() };
    }

    const seriesContent = seriesObj[seriesKeys[0]];

    // No breakdown — stages directly on the series
    if (seriesContent?.stages) {
      return { funnel: new Funnel().fromJSON(seriesContent) };
    }

    // With breakdown — $overall is the main funnel
    if (seriesContent?.$overall?.stages) {
      const funnel = new Funnel().fromJSON(seriesContent.$overall);

      const bdEntries = Object.entries(seriesContent)
        .filter(
          ([key, val]: [string, any]) =>
            key !== '$overall' && (val?.stages || val?.$overall?.stages),
        )
        .sort(([, a]: any, [, b]: any) => {
          const aStages = a.stages ?? a.$overall?.stages;
          const bStages = b.stages ?? b.$overall?.stages;
          return (bStages?.[0]?.count ?? 0) - (aStages?.[0]?.count ?? 0);
        });

      if (bdEntries.length > 0) {
        const funnelBreakdown: Record<string, Funnel> = {};
        for (const [key, val] of bdEntries) {
          const valAny = val as any;
          funnelBreakdown[key] = new Funnel().fromJSON(
            valAny.stages ? valAny : valAny.$overall,
          );
        }
        return { funnel, funnelBreakdown };
      }

      return { funnel };
    }

    return { funnel: new Funnel() };
  }

  /**
   * Recursively collect breakdown sub-rows for a given value name.
   * Each node may have $overall + nested breakdown keys, or be a leaf
   * with { total, count, values }.
   */
  private collectBreakdownRows(
    node: Record<string, any>,
    valueName: string,
  ): { key: string; total: number; children: any[] }[] {
    const rows: { key: string; total: number; children: any[] }[] = [];
    for (const [key, child] of Object.entries(node)) {
      if (key === '$overall') continue;
      const childObj = child as any;

      if (childObj?.$overall?.values) {
        // Nested breakdown level
        const match = childObj.$overall.values.find(
          (v: any) => v.name === valueName,
        );
        const total = match?.total ?? 0;
        const children = this.collectBreakdownRows(childObj, valueName);
        rows.push({ key, total, children });
      } else if (childObj?.values) {
        // Leaf level
        const match = childObj.values.find(
          (v: any) => v.name === valueName,
        );
        const total = match?.total ?? 0;
        rows.push({ key, total, children: [] });
      }
    }
    rows.sort((a, b) => b.total - a.total);
    return rows;
  }

  private transformTableSeriesFormat(seriesObj: Record<string, any>): {
    values: any[];
    total: number;
    count: number;
    hasBreakdown: boolean;
  } {
    const seriesKeys = Object.keys(seriesObj);
    if (seriesKeys.length === 0) {
      return { values: [], total: 0, count: 0, hasBreakdown: false };
    }

    const seriesContent = seriesObj[seriesKeys[0]];

    // Has breakdown ($overall + breakdown keys)
    if (seriesContent?.$overall?.values) {
      const overall = seriesContent.$overall;
      const count = overall.count ?? 0;
      const breakdownKeys = Object.keys(seriesContent).filter(
        (k) => k !== '$overall',
      );

      const values = (overall.values || []).map((s: any) => {
        const row = new SessionsByRow().fromJson(s, count, this.metricOf);
        (row as any).breakdownRows = this.collectBreakdownRows(
          seriesContent,
          s.name,
        );
        return row;
      });

      return {
        values,
        total: overall.total ?? 0,
        count,
        hasBreakdown: breakdownKeys.length > 0,
      };
    }

    // No breakdown — flat { total, count, values }
    if (seriesContent?.values) {
      const count = seriesContent.count ?? 0;
      const values = seriesContent.values.map((s: any) =>
        new SessionsByRow().fromJson(s, count, this.metricOf),
      );
      return {
        values,
        total: seriesContent.total ?? 0,
        count,
        hasBreakdown: false,
      };
    }

    return { values: [], total: 0, count: 0, hasBreakdown: false };
  }

  setData(
    data: any,
    period: any,
    isComparison: boolean = false,
    density?: number,
  ) {
    if (!data) return;
    const _data: any = {};

    // 3.0 format with possible breakdown
    if (
      this.isNewSeriesFormat(data) &&
      (this.metricType === TIMESERIES ||
        this.metricType === FUNNEL ||
        this.metricType === TABLE)
    ) {
      // Funnels have stages arrays (not NestedData), so skip transformNewSeriesFormat
      // which would crash on sortByTotal/isLeaf/sumAll with non-timestamp data.
      if (this.metricType === FUNNEL) {
        const result = this.transformFunnelSeriesFormat(data.series);
        _data.funnel = result.funnel;
        if (result.funnelBreakdown) {
          _data.funnelBreakdown = result.funnelBreakdown;
        }
        if (!isComparison) {
          this.setDataValue(_data);
        }
        return _data;
      }

      if (this.metricType === TABLE) {
        const tableResult = this.transformTableSeriesFormat(data.series);
        _data['values'] = tableResult.values;
        _data['total'] = tableResult.total;
        _data['hasBreakdown'] = tableResult.hasBreakdown;
      } else {
        const { chart, namesMap, breakdownData } =
          this.transformNewSeriesFormat(data.series, isComparison);

        _data['chart'] = (getChartFormatter(period, density) as any)(chart);
        _data['namesMap'] = namesMap;
        _data['value'] = data.value;
        _data['unit'] = data.unit;
        if (breakdownData) {
          _data['breakdownData'] = breakdownData;
        }
      }

      if (!isComparison) {
        this.setDataValue(_data);
      }
      return _data;
    }

    // Legacy format
    if (isComparison && this.metricType === TIMESERIES) {
      data.forEach((point, i) => {
        Object.keys(point).forEach((key) => {
          if (key === 'timestamp') return;
          point[`Previous ${key}`] = point[key];
          delete point[key];
        });
      });
    }

    if (this.metricType === HEATMAP) {
      const defaults = {
        domURL: undefined,
        duration: 0,
        events: [],
        mobsUrl: [],
        path: '',
        projectId: 0,
        sessionId: null,
        startTs: 0,
        urlPath: null,
      };
      if (!data || !data.domURL) {
        this.data = defaults;
      }
      Object.assign(this.data, data);
      return data;
    }

    if (this.metricType === WEBVITALS) {
      const result: any = { ...data, raw: data };
      this.data = result;
      return result;
    }

    // sunburst data is a tree-like structure,
    // flowchart is linked flat arrays
    if (this.metricType === USER_PATH) {
      if (this.viewType === 'sunburst') {
        Object.assign(this.data, data);
        return data;
      } else {
        const _data = processData(data);
        Object.assign(this.data, _data);
        return _data;
      }
    }

    if (this.metricOf === FilterKey.ERRORS) {
      _data['errors'] = data.errors
        ? data.errors.map((s: any) => new ErrorInfo(s))
        : [];
      _data['total'] = data.total;
    } else if (this.metricType === INSIGHTS) {
      _data['issues'] = data
        .filter((i: any) => i.change > 0 || i.change < 0)
        .map(
          (i: any) =>
            new InsightIssue(
              i.category,
              i.name,
              i.ratio,
              i.oldValue,
              i.value,
              i.change,
              i.isNew,
            ),
        );
    } else if (this.metricType === FUNNEL) {
      _data.funnel = new Funnel().fromJSON(data);
    } else if (this.metricType === TABLE) {
      const count = data['count'];
      const vals = data['values']
        ? data['values'].map((s: any) =>
            new SessionsByRow().fromJson(s, count, this.metricOf),
          )
        : [];
      _data['values'] = vals;
      _data['total'] = data['total'];
    } else {
      if (data.hasOwnProperty('chart')) {
        _data['value'] = data.value;
        _data['unit'] = data.unit;
        _data['chart'] = getChartFormatter(period, density)(data.chart);
        _data['namesMap'] = data.chart
          .map((i: any) => Object.keys(i))
          .flat()
          .filter((i: any) => i !== 'time' && i !== 'timestamp')
          .reduce((unique: any, item: any) => {
            if (!unique.includes(item)) {
              unique.push(item);
            }
            return unique;
          }, []);
      } else {
        _data['chart'] = getChartFormatter(period, density)(data);
        _data['namesMap'] = Array.isArray(data)
          ? data
              .map((i) => Object.keys(i))
              .flat()
              .filter((i) => i !== 'time' && i !== 'timestamp')
              .reduce((unique: string[], item: string) => {
                if (!unique.includes(item)) {
                  unique.push(item);
                }
                return unique;
              }, [])
          : [];
      }
    }

    if (!isComparison) {
      this.setDataValue(_data);
    }
    return _data;
  }

  setDataValue = (data: any) => {
    this.data = observable({ ...data });
  };

  fetchSessions = async (_: any, filter: any): Promise<any> => {
    const newFilter = this.applyProperties(filter);
    const resp = await metricService.fetchSessions(newFilter);
    if (!resp.series?.length) {
      return null;
    }
    return resp.series.map((cat: { sessions: any[] }) => {
      return {
        ...cat,
        sessions: cat.sessions.map((s: any) => new Session().fromJson(s)),
      };
    });
  };

  // TODO this is a temporary solution until the API is fixed.
  applyProperties(data: any) {
    const updatedSeries =
      data.series?.map((series: any) => {
        const filter = { ...series.filter };

        if (filter.isEvent && Array.isArray(filter.filters)) {
          const nested = filter.filters.map((nestedFilter: any) => {
            const js = new FilterItem(nestedFilter).toJson();
            delete js.type;
            delete js.propertyOrder;
            return js;
          });
          delete filter.filters;
          filter.properties = {
            propertyOrder: filter.propertyOrder,
            operator: filter.propertyOrder,
            filters: nested,
          };
        }

        delete filter.propertyOrder;
        return { ...series, filter };
      }) || [];

    return { ...data, series: updatedSeries };
  }

  async fetchIssues(card: any): Promise<any> {
    try {
      const response = await metricService.fetchIssues(card);

      if (card.metricType === USER_PATH) {
        return {
          total: response.count,
          issues: response.values.map((issue: any) =>
            new Issue().fromJSON(issue),
          ),
        };
      } else {
        const mapIssue = (issue: any) => new Funnelissue().fromJSON(issue);
        const significantIssues =
          response.issues.significant?.map(mapIssue) || [];
        const insignificantIssues =
          response.issues.insignificant?.map(mapIssue) || [];

        return {
          issues:
            significantIssues.length > 0
              ? significantIssues
              : insignificantIssues,
        };
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
      return {
        issues: [],
      };
    }
  }

  setComparisonRange(range: [start: string, end?: string] | null) {
    this.compareTo = range;
  }

  fetchIssue(funnelId: any, issueId: any, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      metricService
        .fetchIssue(funnelId, issueId, params)
        .then((response: any) => {
          resolve({
            issue: new Funnelissue().fromJSON(response.issue),
            sessions: response.sessions.sessions.map((s: any) =>
              new Session().fromJson(s),
            ),
          });
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  }

  private metricValueFromArray(metricValue: any, metricType: string) {
    if (!Array.isArray(metricValue)) return metricValue;
    if (metricType === TABLE) {
      return issueOptions.filter((i: any) => metricValue.includes(i.value));
    } else if (metricType === INSIGHTS) {
      return issueCategories.filter((i: any) => metricValue.includes(i.value));
    } else if (metricType === USER_PATH) {
      return pathAnalysisEvents.filter((i: any) =>
        metricValue.includes(i.value),
      );
    }
  }

  private metricValueToArray(metricValue: any) {
    if (!Array.isArray(metricValue)) return metricValue;
    return metricValue.map((i: any) => i);
  }
}

interface Node {
  name: string;
  eventType: string;
  avgTimeFromPrevious: number | null;
  idd?: string; // Making idd optional since it might not be present in raw data
}

interface Link {
  eventType: string;
  value: number;
  source: number;
  target: number;
  id?: string; // Making id optional since it might not be present in raw data
}

interface Data {
  nodes: Node[];
  links: Link[];
}

const generateUniqueId = (): string =>
  Math.random().toString(36).substring(2, 15);

const processData = (
  data: Data,
): {
  nodes: Node[];
  links: { source: number; target: number; value: number; id: string }[];
} => {
  // Ensure nodes have unique IDs
  const nodes = data.nodes.map((node) => ({
    ...node,
    avgTimeFromPrevious: node.avgTimeFromPrevious
      ? durationFormatted(node.avgTimeFromPrevious)
      : null,
    idd: node.idd || generateUniqueId(),
  }));

  // Ensure links have unique IDs
  const links = data.links.map((link) => ({
    ...link,
    id: link.id || generateUniqueId(),
  }));

  // Sort links by source and then by target
  links.sort((a, b) => {
    if (a.source === b.source) {
      return a.target - b.target;
    }
    return a.source - b.source;
  });

  // Sort nodes based on their first appearance in the sorted links to maintain visual consistency
  const sortedNodes = nodes.slice().sort((a, b) => {
    const aIndex = links.findIndex(
      (link) =>
        link.source === nodes.indexOf(a) || link.target === nodes.indexOf(a),
    );
    const bIndex = links.findIndex(
      (link) =>
        link.source === nodes.indexOf(b) || link.target === nodes.indexOf(b),
    );
    return aIndex - bIndex;
  });

  return { nodes: sortedNodes, links };
};
