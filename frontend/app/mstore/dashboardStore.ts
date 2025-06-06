import { makeAutoObservable, runInAction, reaction } from 'mobx';
import { dashboardService, metricService } from 'App/services';
import { toast } from 'react-toastify';
import Period, { LAST_24_HOURS } from 'Types/app/period';
import { getRE } from 'App/utils';
import Filter from './types/filter';
import Widget from './types/widget';
import Dashboard from './types/dashboard';
import { calculateGranularities } from '@/components/Dashboard/components/WidgetDateRange/RangeGranularity';
import { CUSTOM_RANGE } from '@/dateRange';

interface DashboardFilter {
  query?: string;
  showMine?: boolean;
}
export default class DashboardStore {
  siteId: any = null;

  dashboards: Dashboard[] = [];

  selectedDashboard: Dashboard | null = null;

  dashboardInstance: Dashboard = new Dashboard();

  selectedWidgets: Widget[] = [];

  currentWidget: Widget = new Widget();

  widgetCategories: any[] = [];

  widgets: Widget[] = [];

  period: Record<string, any> = Period({ rangeName: LAST_24_HOURS });

  drillDownFilter: Filter = new Filter();

  comparisonFilter: Filter = new Filter();

  drillDownPeriod: Record<string, any> = Period({ rangeName: LAST_24_HOURS });

  selectedDensity: number = 7;

  comparisonPeriods: Record<string, any> = {};

  startTimestamp: number = 0;

  endTimestamp: number = 0;

  pendingRequests: number = 0;

  filter: DashboardFilter = { showMine: false, query: '' };

  // Metrics
  metricsPage: number = 1;

  metricsPageSize: number = 10;

  metricsSearch: string = '';

  // Loading states
  isLoading: boolean = true;

  isSaving: boolean = false;

  isDeleting: boolean = false;

  loadingTemplates: boolean = false;

  fetchingDashboard: boolean = false;

  sessionsLoading: boolean = false;

  showAlertModal: boolean = false;

  // Pagination
  page: number = 1;

  pageSize: number = 10;

  dashboardsSearch: string = '';

  sort: any = { by: 'desc' };

  constructor() {
    makeAutoObservable(this);

    this.resetDrillDownFilter();

    this.createDensity(this.period.getDuration());
    reaction(
      () => this.period,
      (period) => {
        this.createDensity(period.getDuration());
      },
    );
  }

  resetDensity = () => {
    this.createDensity(this.period.getDuration());
  };

  createDensity = (duration: number) => {
    const densityOpts = calculateGranularities(duration);
    const defaultOption = densityOpts[densityOpts.length - 2];

    this.setDensity(defaultOption.key);
  };

  setDensity = (density: number) => {
    this.selectedDensity = density;
  };

  get sortedDashboards() {
    const sortOrder = this.sort.by;
    return [...this.dashboards].sort((a, b) =>
      sortOrder === 'desc'
        ? b.createdAt - a.createdAt
        : a.createdAt - b.createdAt,
    );
  }

  resetDrillDownFilter() {
    this.drillDownFilter = new Filter();

    // back to previous
    const timeStamps = this.drillDownPeriod.toTimestamps();
    this.drillDownFilter.updateKey('startTimestamp', timeStamps.startTimestamp);
    this.drillDownFilter.updateKey('endTimestamp', timeStamps.endTimestamp);
    this.updateKey('metricsPage', 1);
  }

  get filteredList() {
    const filterRE = this.filter.query ? getRE(this.filter.query, 'i') : null;
    return this.dashboards
      .filter(
        (dashboard) =>
          (this.filter.showMine ? !dashboard.isPublic : true) &&
          (!filterRE ||
            // @ts-ignore
            ['name', 'owner', 'description'].some((key) =>
              filterRE.test(dashboard[key]),
            )),
      )
      .sort((a, b) =>
        this.sort.by === 'desc'
          ? b.createdAt - a.createdAt
          : a.createdAt - b.createdAt,
      );
  }

  toggleAllSelectedWidgets(isSelected: boolean) {
    if (isSelected) {
      const allWidgets = this.widgetCategories.reduce(
        (acc, cat) => acc.concat(cat.widgets),
        [],
      );

      this.selectedWidgets = allWidgets;
    } else {
      this.selectedWidgets = [];
    }
  }

  selectWidgetsByCategory(category: string) {
    const selectedWidgetIds = this.selectedWidgets.map(
      (widget: any) => widget.metricId,
    );
    const widgets = this.widgetCategories
      .find((cat) => cat.name === category)
      ?.widgets.filter(
        (widget: any) => !selectedWidgetIds.includes(widget.metricId),
      );
    this.selectedWidgets = this.selectedWidgets.concat(widgets) || [];
  }

  removeSelectedWidgetByCategory = (category: any) => {
    const categoryWidgetIds = category.widgets.map((w: Widget) => w.metricId);
    this.selectedWidgets = this.selectedWidgets.filter(
      (widget: any) => !categoryWidgetIds.includes(widget.metricId),
    );
  };

  toggleWidgetSelection = (widget: any) => {
    const selectedWidgetIds = this.selectedWidgets.map(
      (widget: any) => widget.metricId,
    );
    if (selectedWidgetIds.includes(widget.metricId)) {
      this.selectedWidgets = this.selectedWidgets.filter(
        (w: any) => w.metricId !== widget.metricId,
      );
    } else {
      this.selectedWidgets.push(widget);
    }
  };

  findByIds(ids: string[]) {
    return this.dashboards.filter((d) => ids.includes(d.dashboardId));
  }

  initDashboard(dashboard?: Dashboard) {
    this.dashboardInstance = dashboard
      ? new Dashboard().fromJson(dashboard)
      : new Dashboard();
    this.selectedWidgets = [];
  }

  updateKey(key: string, value: any) {
    // @ts-ignore
    this[key] = value;
  }

  resetCurrentWidget() {
    this.currentWidget = new Widget();
  }

  editWidget(widget: any) {
    this.currentWidget.update(widget);
  }

  fetchList(): Promise<any> {
    this.isLoading = true;

    return dashboardService
      .getDashboards()
      .then((list: any) => {
        runInAction(() => {
          this.dashboards = list.map((d: Record<string, any>) =>
            new Dashboard().fromJson(d),
          );
        });
      })
      .finally(() => {
        runInAction(() => {
          this.isLoading = false;
        });
      });
  }

  async fetch(dashboardId: string): Promise<any> {
    this.setFetchingDashboard(true);
    try {
      const response = await dashboardService.getDashboard(dashboardId);
      this.selectedDashboard?.update({
        widgets: new Dashboard().fromJson(response).widgets,
      });
    } finally {
      this.setFetchingDashboard(false);
    }
  }

  setFetchingDashboard(value: boolean) {
    this.fetchingDashboard = value;
  }

  save(dashboard: Dashboard): Promise<any> {
    this.isSaving = true;
    const isCreating = !dashboard.dashboardId;

    dashboard.metrics = this.selectedWidgets.map((w) => w.metricId);

    return new Promise((resolve, reject) => {
      dashboardService
        .saveDashboard(dashboard)
        .then((_dashboard: any) => {
          runInAction(() => {
            if (isCreating) {
              toast.success('Dashboard created successfully');
              this.addDashboard(new Dashboard().fromJson(_dashboard));
            } else {
              toast.success('Dashboard successfully updated ');
              this.syncDashboardInfo(_dashboard.dashboardId!, _dashboard);
            }
            resolve(_dashboard);
          });
        })
        .catch(() => {
          toast.error('Error saving dashboard');
          reject();
        })
        .finally(() => {
          runInAction(() => {
            this.isSaving = false;
          });
        });
    });
  }

  syncDashboardInfo(
    id: string,
    info: {
      name: string;
      description: string;
      isPublic: boolean;
      createdAt: number;
    },
  ) {
    if (this.selectedDashboard !== null) {
      this.selectedDashboard.updateInfo(info);
    }
    const index = this.dashboards.findIndex((d) => d.dashboardId === id);
    this.dashboards[index].updateInfo(info);
  }

  saveMetric(metric: Widget, dashboardId: string): Promise<any> {
    const isCreating = !metric.widgetId;
    return dashboardService.saveMetric(metric, dashboardId).then((metric) => {
      runInAction(() => {
        if (isCreating) {
          this.selectedDashboard?.widgets.push(metric);
        } else {
          this.selectedDashboard?.widgets.map((w) => {
            if (w.widgetId === metric.widgetId) {
              w.update(metric);
            }
          });
        }
      });
    });
  }

  deleteDashboard(dashboard: Dashboard): Promise<any> {
    this.isDeleting = true;
    return dashboardService
      .deleteDashboard(dashboard.dashboardId)
      .then(() => {
        toast.success('Dashboard deleted successfully');
        runInAction(() => {
          this.removeDashboard(dashboard);
        });
      })
      .catch(() => {
        toast.error('Dashboard could not be deleted');
      })
      .finally(() => {
        runInAction(() => {
          this.isDeleting = false;
        });
      });
  }

  toJson() {
    return {
      dashboards: this.dashboards.map((d) => d.toJson()),
    };
  }

  fromJson(json: any) {
    runInAction(() => {
      this.dashboards = json.dashboards.map((d: Record<string, any>) =>
        new Dashboard().fromJson(d),
      );
    });
    return this;
  }

  addDashboard(dashboard: Dashboard) {
    this.dashboards.push(new Dashboard().fromJson(dashboard));
  }

  removeDashboard(dashboard: Dashboard) {
    this.dashboards = this.dashboards.filter(
      (d) => d.dashboardId !== dashboard.dashboardId,
    );
  }

  getDashboard(dashboardId: string | number): Dashboard | null {
    return this.dashboards.find((d) => d.dashboardId == dashboardId) || null;
  }

  getDashboardByIndex(index: number) {
    return this.dashboards[index];
  }

  getDashboardCount() {
    return this.dashboards.length;
  }

  updateDashboard(dashboard: Dashboard) {
    const index = this.dashboards.findIndex(
      (d) => d.dashboardId === dashboard.dashboardId,
    );
    if (index >= 0) {
      this.dashboards[index] = dashboard;
      if (this.selectedDashboard?.dashboardId === dashboard.dashboardId) {
        this.selectDashboardById(dashboard.dashboardId);
      }
    }
  }

  selectDashboardById = (dashboardId: any) => {
    this.selectedDashboard =
      this.dashboards.find((d) => d.dashboardId == dashboardId) ||
      new Dashboard();
  };

  getDashboardById = (dashboardId: string) => {
    const dashboard = this.dashboards.find((d) => d.dashboardId == dashboardId);

    if (dashboard) {
      this.selectedDashboard = dashboard;
      return true;
    }
    this.selectedDashboard = null;
    return false;
  };

  resetSelectedDashboard = () => {
    this.selectedDashboard = null;
  };

  setSiteId = (siteId: any) => {
    this.siteId = siteId;
  };

  fetchTemplates(hardRefresh: boolean): Promise<any> {
    this.loadingTemplates = true;
    return new Promise((resolve, reject) => {
      if (this.widgetCategories.length > 0 && !hardRefresh) {
        resolve(this.widgetCategories);
      } else {
        metricService
          .getTemplates()
          .then((response) => {
            const categories: any[] = [];
            response.forEach((category: any) => {
              const widgets: any[] = [];
              category.widgets.forEach((widget: any) => {
                const w = new Widget().fromJson(widget);
                widgets.push(w);
              });
              const c: any = {};
              c.widgets = widgets;
              c.name = category.category;
              c.description = category.description;
              categories.push(c);
            });
            this.widgetCategories = categories;
            resolve(this.widgetCategories);
          })
          .catch((error) => {
            reject(error);
          })
          .finally(() => {
            this.loadingTemplates = false;
          });
      }
    });
  }

  async deleteDashboardWidget(dashboardId: string, widgetId: string) {
    this.isDeleting = true;
    try {
      await dashboardService.deleteWidget(dashboardId, widgetId);
      toast.success('Dashboard updated successfully');
      runInAction(() => {
        this.selectedDashboard?.removeWidget(widgetId);
      });
    } finally {
      this.isDeleting = false;
    }
  }

  async addWidgetToDashboard(
    dashboard: Dashboard,
    metricIds: any,
  ): Promise<any> {
    this.isSaving = true;
    try {
      try {
        await dashboardService.addWidget(dashboard, metricIds);
        toast.success('Card added to dashboard.');
      } catch {
        toast.error('Card could not be added.');
      }
    } finally {
      this.isSaving = false;
    }
  }

  resetPeriod = () => {
    if (this.period) {
      const range = this.period.rangeName;
      if (range !== CUSTOM_RANGE) {
        this.period = Period({ rangeName: this.period.rangeName });
      } else {
        this.period = Period({ rangeName: LAST_24_HOURS });
      }
    }
  };

  setPeriod(period: any) {
    this.period = Period({
      start: period.start,
      end: period.end,
      rangeName: period.rangeName,
    });
  }

  setDrillDownPeriod(period: any) {
    this.drillDownPeriod = Period({
      start: period.start,
      end: period.end,
      rangeName: period.rangeName,
    });
  }

  setComparisonPeriod(period: any, metricId: string) {
    if (!period) {
      return (this.comparisonPeriods[metricId] = null);
    }
    this.comparisonPeriods[metricId] = period;
  }

  cloneCompFilter() {
    const filterData = this.drillDownFilter.toData();
    this.comparisonFilter = new Filter().fromData(filterData);

    return this.comparisonFilter;
  }

  toggleAlertModal(val: boolean) {
    this.showAlertModal = val;
  }

  upPendingRequests = () => {
    this.pendingRequests += 1;
  };

  downPendingRequests = () => {
    this.pendingRequests -= 1;
  };

  fetchMetricChartData(
    metric: Widget,
    data: any,
    isSaved: boolean = false,
    period: Record<string, any>,
    isComparison?: boolean,
  ): Promise<any> {
    period = period.toTimestamps();
    const { density } = data;
    const params = { ...period, ...data, key: metric.predefinedKey };

    if (!isComparison && metric.page && metric.limit) {
      params.page = metric.page;
      params.limit = metric.limit;
    }

    return new Promise(async (resolve, reject) => {
      this.upPendingRequests();

      if (
        !isComparison &&
        metric.metricType === 'table' &&
        metric.metricOf === 'jsException'
      ) {
        params.limit = 5;
      }

      try {
        const data = await metricService.getMetricChartData(
          metric,
          params,
          isSaved,
        );
        resolve(metric.setData(data, period, isComparison, density));
      } catch (error) {
        reject(error);
      } finally {
        setTimeout(() => {
          this.downPendingRequests();
        }, 100);
      }
    });
  }
}
