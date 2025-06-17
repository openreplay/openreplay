import { makeAutoObservable, runInAction } from 'mobx';
import FilterSeries from './filterSeries';
import { DateTime } from 'luxon';
import Session from 'App/mstore/types/session';
import Funnelissue from 'App/mstore/types/funnelIssue';
import {
  issueOptions,
  issueCategories,
  issueCategoriesMap,
  pathAnalysisEvents,
} from 'App/constants/filterOptions';
import { FilterKey } from 'Types/filter/filterType';
import Period, { LAST_24_HOURS } from 'Types/app/period';
import Funnel from '../types/funnel';
import { metricService } from 'App/services';
import {
  FUNNEL,
  HEATMAP,
  INSIGHTS,
  TABLE,
  TIMESERIES,
  USER_PATH,
} from 'App/constants/card';
import { ErrorInfo } from '../types/error';
import { getChartFormatter } from 'Types/dashboard/helper';
import FilterItem from './filterItem';
import { filtersMap } from 'Types/filter/newFilter';
import Issue from '../types/issue';
import { durationFormatted } from 'App/date';
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
  startPoint: FilterItem = new FilterItem(filtersMap[FilterKey.LOCATION]);
  excludes: FilterItem[] = [];
  hideExcess?: boolean = false;
  compareTo: [startDate?: string, endDate?: string] | null = null;

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
          ? DateTime.fromMillis(json.editedAt || json.createdAt)
          : null;
      this.config = json.config;
      this.position = json.config.position;
      this.predefinedKey = json.predefinedKey;
      this.category = json.category;
      this.thumbnail = json.thumbnail;
      this.data.sessionId = json.sessionId;
      this.isPublic = json.isPublic;

      if (this.metricType === FUNNEL) {
        this.series[0].filter.eventsOrder = 'then';
        this.series[0].filter.eventsOrderSupport = ['then'];
      }

      if (this.metricType === USER_PATH) {
        this.hideExcess = json.hideExcess;
        this.startType = json.startType;
        this.metricValue =
          json.metricValue && json.metricValue.length > 0
            ? json.metricValue
            : ['location'];
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
          this.series[0].filter.excludes = json.exclude.map((i: any) =>
            new FilterItem().fromJson(i),
          );
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
      limit: this.limit,
      compareTo: this.compareTo,
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
      },
    };

    if (this.metricType === USER_PATH) {
      data.hideExcess = this.hideExcess;
      data.startType = this.startType;
      data.startPoint = [this.startPoint.toJson()];
      data.excludes = this.series[0].filter.excludes.map((i: any) =>
        i.toJson(),
      );
      data.metricOf = 'sessionCount';
    }
    return data;
  }

  updateStartPoint(startPoint: any) {
    runInAction(() => {
      this.startPoint = new FilterItem(startPoint);
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

  setData(
    data: { timestamp: number; [seriesName: string]: number }[],
    period: any,
    isComparison: boolean = false,
    density?: number,
  ) {
    if (!data) return;
    const _data: any = {};
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
      };
      if (!data || !data.domURL) {
        this.data = defaults;
      }
      Object.assign(this.data, data);
      return data;
    }

    if (this.metricType === USER_PATH) {
      const _data = processData(data);
      Object.assign(this.data, _data);
      return _data;
    }

    if (this.metricOf === FilterKey.ERRORS) {
      _data['errors'] = data.errors.map((s: any) => new ErrorInfo(s));
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
      const count = data[0]['count'];
      _data['values'] = data[0]['values'].map((s: any) =>
        new SessionsByRow().fromJson(s, count, this.metricOf),
      );
      _data['total'] = data[0]['total'];
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
      runInAction(() => {
        Object.assign(this.data, _data);
      });
    }
    return _data;
  }

  fetchSessions(metricId: any, filter: any): Promise<any> {
    return new Promise((resolve) => {
      metricService.fetchSessions(metricId, filter).then((response: any[]) => {
        resolve(
          response.map((cat: { sessions: any[] }) => {
            return {
              ...cat,
              sessions: cat.sessions.map((s: any) => new Session().fromJson(s)),
            };
          }),
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
