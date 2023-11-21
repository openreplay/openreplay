import { makeAutoObservable, runInAction } from 'mobx';
import FilterSeries from './filterSeries';
import { DateTime } from 'luxon';
import Session from 'App/mstore/types/session';
import Funnelissue from 'App/mstore/types/funnelIssue';
import { issueOptions, issueCategories, issueCategoriesMap, pathAnalysisEvents } from 'App/constants/filterOptions';
import { FilterKey } from 'Types/filter/filterType';
import Period, { LAST_24_HOURS } from 'Types/app/period';
import Funnel from '../types/funnel';
import { metricService } from 'App/services';
import { FUNNEL, INSIGHTS, TABLE, USER_PATH, WEB_VITALS } from 'App/constants/card';
import Error from '../types/error';
import { getChartFormatter } from 'Types/dashboard/helper';
import FilterItem from './filterItem';
import { filtersMap } from 'Types/filter/newFilter';
import Issue from '../types/issue';
import { durationFormatted } from 'App/date';

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
    isNew = false
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
  metricValue: any = '';
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
  limit: number = 5;
  thumbnail?: string;
  params: any = { density: 70 };
  startType: string = 'start';
  startPoint: FilterItem = new FilterItem(filtersMap[FilterKey.LOCATION]);
  excludes: FilterItem[] = [];
  hideExcess?: boolean = false;

  period: Record<string, any> = Period({ rangeName: LAST_24_HOURS }); // temp value in detail view
  hasChanged: boolean = false;

  position: number = 0;
  data: any = {
    sessions: [],
    issues: [],
    total: 0,
    chart: [],
    namesMap: {},
    avg: 0,
    percentiles: []
  };
  isLoading: boolean = false;
  isValid: boolean = false;
  dashboardId: any = undefined;
  predefinedKey: string = '';

  constructor() {
    makeAutoObservable(this);

    const filterSeries = new FilterSeries();
    this.series.push(filterSeries);
  }

  updateKey(key: string, value: any) {
    this[key] = value;
  }

  removeSeries(index: number) {
    this.series.splice(index, 1);
  }

  addSeries() {
    const series = new FilterSeries();
    series.name = 'Series ' + (this.series.length + 1);
    this.series.push(series);
  }

  fromJson(json: any, period?: any) {
    json.config = json.config || {};
    runInAction(() => {
      this.metricId = json.metricId;
      this.widgetId = json.widgetId;
      this.metricValue = this.metricValueFromArray(json.metricValue, json.metricType);
      this.metricOf = json.metricOf;
      this.metricType = json.metricType;
      this.metricFormat = json.metricFormat;
      this.viewType = json.viewType;
      this.name = json.name;
      this.series =
        json.series && json.series.length > 0
          ? json.series.map((series: any) => new FilterSeries().fromJson(series))
          : [new FilterSeries()];
      this.dashboards = json.dashboards || [];
      this.owner = json.ownerEmail;
      this.lastModified =
        json.editedAt || json.createdAt
          ? DateTime.fromMillis(json.editedAt || json.createdAt)
          : null;
      this.config = json.config;
      this.position = json.config.position;
      this.predefinedKey = json.predefinedKey;
      this.category = json.category;
      this.thumbnail = json.thumbnail;
      this.isPublic = json.isPublic;

      if (this.metricType === FUNNEL) {
        this.series[0].filter.eventsOrder = 'then';
        this.series[0].filter.eventsOrderSupport = ['then'];
      }

      if (this.metricType === USER_PATH) {
        this.hideExcess = json.hideExcess;
        this.startType = json.startType;
        if (json.startPoint) {
          if (Array.isArray(json.startPoint) && json.startPoint.length > 0) {
            this.startPoint = new FilterItem().fromJson(json.startPoint[0]);
          }

          if (json.startPoint == typeof Object) {
            this.startPoint = json.startPoint;
          }
        }

        // TODO change this to excludes after the api change
        if (json.exclude) {
          this.series[0].filter.excludes = json.exclude.map((i: any) => new FilterItem().fromJson(i));
        }
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
        row: this.config.row
      }
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
      page: this.page,
      limit: this.limit,
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
            : this.metricType === WEB_VITALS
              ? 1
              : 2
      }
    };

    if (this.metricType === USER_PATH) {
      data.hideExcess = this.hideExcess;
      data.startType = this.startType;
      data.startPoint = [this.startPoint.toJson()];
      data.excludes = this.series[0].filter.excludes.map((i: any) => i.toJson());
      data.metricOf = 'sessionCount';
    }
    return data;
  }

  updateStartPoint(startPoint: any) {
    runInAction(() => {
      this.startPoint = new FilterItem(startPoint);
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

  exists() {
    return this.metricId !== undefined;
  }


  setData(data: any, period: any) {
    const _data: any = { ...data };

    if (this.metricType === USER_PATH) {
      _data['nodes'] = data.nodes.map((s: any) => ({
        ...s,
        avgTimeFromPrevious: s.avgTimeFromPrevious ? durationFormatted(s.avgTimeFromPrevious) : null,
        idd: Math.random().toString(36).substring(7),
      }));
      _data['links'] = data.links.map((s: any) => ({
        ...s,
        id: Math.random().toString(36).substring(7),
      }));

      Object.assign(this.data, _data);
      return _data;
    }
    if (this.metricOf === FilterKey.ERRORS) {
      _data['errors'] = data.errors.map((s: any) => new Error().fromJSON(s));
    } else if (this.metricType === INSIGHTS) {
      _data['issues'] = data
        .filter((i: any) => i.change > 0 || i.change < 0)
        .map(
          (i: any) =>
            new InsightIssue(i.category, i.name, i.ratio, i.oldValue, i.value, i.change, i.isNew)
        );
    } else if (this.metricType === FUNNEL) {
      _data.funnel = new Funnel().fromJSON(_data);
    } else {
      if (data.hasOwnProperty('chart')) {
        _data['value'] = data.value;
        _data['unit'] = data.unit;
        _data['chart'] = getChartFormatter(period)(data.chart);
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
        _data['chart'] = getChartFormatter(period)(Array.isArray(data) ? data : []);
        _data['namesMap'] = Array.isArray(data)
          ? data
            .map((i) => Object.keys(i))
            .flat()
            .filter((i) => i !== 'time' && i !== 'timestamp')
            .reduce((unique: any, item: any) => {
              if (!unique.includes(item)) {
                unique.push(item);
              }
              return unique;
            }, [])
          : [];
      }
    }

    Object.assign(this.data, _data);
    return _data;
  }

  fetchSessions(metricId: any, filter: any): Promise<any> {
    return new Promise((resolve) => {
      metricService.fetchSessions(metricId, filter).then((response: any[]) => {
        resolve(
          response.map((cat: { sessions: any[] }) => {
            return {
              ...cat,
              sessions: cat.sessions.map((s: any) => new Session().fromJson(s))
            };
          })
        );
      });
    });
  }


  async fetchIssues(card: any): Promise<any> {
    try {
      const response = await metricService.fetchIssues(card);

      if (card.metricType === USER_PATH) {
        return {
          total: response.count,
          issues: response.values.map((issue: any) => new Issue().fromJSON(issue))
        };
      } else {
        const mapIssue = (issue: any) => new Funnelissue().fromJSON(issue);
        const significantIssues = response.issues.significant?.map(mapIssue) || [];
        const insignificantIssues = response.issues.insignificant?.map(mapIssue) || [];

        return {
          issues: significantIssues.length > 0 ? significantIssues : insignificantIssues
        };
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
      return {
        issues: []
      };
    }
  }


  fetchIssue(funnelId: any, issueId: any, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      metricService
        .fetchIssue(funnelId, issueId, params)
        .then((response: any) => {
          resolve({
            issue: new Funnelissue().fromJSON(response.issue),
            sessions: response.sessions.sessions.map((s: any) => new Session().fromJson(s))
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
      return pathAnalysisEvents.filter((i: any) => metricValue.includes(i.value));
    }
  }

  private metricValueToArray(metricValue: any) {
    if (!Array.isArray(metricValue)) return metricValue;
    return metricValue.map((i: any) => i.value);
  }
}
