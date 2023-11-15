import { makeAutoObservable, runInAction } from 'mobx';
import Dashboard from './types/dashboard';
import Widget from './types/widget';
import { dashboardService, metricService } from 'App/services';
import { toast } from 'react-toastify';
import Period, { LAST_24_HOURS, LAST_7_DAYS } from 'Types/app/period';
import Filter from './types/filter';
import { getRE } from 'App/utils';

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
  drillDownPeriod: Record<string, any> = Period({ rangeName: LAST_7_DAYS });
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
  }

  get sortedDashboards() {
    const sortOrder = this.sort.by;
    return [...this.dashboards].sort((a, b) =>
      sortOrder === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
    );
  }

  resetDrillDownFilter() {
    this.drillDownFilter = new Filter();
    this.drillDownPeriod = Period({ rangeName: LAST_7_DAYS });
    const timeStamps = this.drillDownPeriod.toTimestamps();
    this.drillDownFilter.updateKey('startTimestamp', timeStamps.startTimestamp);
    this.drillDownFilter.updateKey('endTimestamp', timeStamps.endTimestamp);
  }

  get filteredList() {
    const filterRE = this.filter.query ? getRE(this.filter.query, 'i') : null;
    return this.dashboards
      .filter(
        (dashboard) =>
          (this.filter.showMine ? !dashboard.isPublic : true) &&
          (!filterRE ||
            // @ts-ignore
            ['name', 'owner', 'description'].some((key) => filterRE.test(dashboard[key])))
      )
      .sort((a, b) =>
        this.sort.by === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
      );
  }

  toggleAllSelectedWidgets(isSelected: boolean) {
    if (isSelected) {
      const allWidgets = this.widgetCategories.reduce((acc, cat) => {
        return acc.concat(cat.widgets);
      }, []);

      this.selectedWidgets = allWidgets;
    } else {
      this.selectedWidgets = [];
    }
  }

  selectWidgetsByCategory(category: string) {
    const selectedWidgetIds = this.selectedWidgets.map((widget: any) => widget.metricId);
    const widgets = this.widgetCategories
      .find((cat) => cat.name === category)
      ?.widgets.filter((widget: any) => !selectedWidgetIds.includes(widget.metricId));
    this.selectedWidgets = this.selectedWidgets.concat(widgets) || [];
  }

  removeSelectedWidgetByCategory = (category: any) => {
    const categoryWidgetIds = category.widgets.map((w: Widget) => w.metricId);
    this.selectedWidgets = this.selectedWidgets.filter(
      (widget: any) => !categoryWidgetIds.includes(widget.metricId)
    );
  };

  toggleWidgetSelection = (widget: any) => {
    const selectedWidgetIds = this.selectedWidgets.map((widget: any) => widget.metricId);
    if (selectedWidgetIds.includes(widget.metricId)) {
      this.selectedWidgets = this.selectedWidgets.filter(
        (w: any) => w.metricId !== widget.metricId
      );
    } else {
      this.selectedWidgets.push(widget);
    }
  };

  findByIds(ids: string[]) {
    return this.dashboards.filter((d) => ids.includes(d.dashboardId));
  }

  initDashboard(dashboard?: Dashboard) {
    this.dashboardInstance = dashboard ? new Dashboard().fromJson(dashboard) : new Dashboard();
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
          this.dashboards = list.map((d: Record<string, any>) => new Dashboard().fromJson(d));
        });
      })
      .finally(() => {
        runInAction(() => {
          this.isLoading = false;
        });
      });
  }

  fetch(dashboardId: string): Promise<any> {
    this.setFetchingDashboard(true);
    return dashboardService
      .getDashboard(dashboardId)
      .then((response) => {
        this.selectedDashboard?.update({
          widgets: new Dashboard().fromJson(response).widgets,
        });
      })
      .finally(() => {
        this.setFetchingDashboard(false);
      });
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

  syncDashboardInfo(id: string, info: { name: string, description: string, isPublic: boolean, createdAt: number }) {
    if (this.selectedDashboard !== null) {
      this.selectedDashboard.updateInfo(info)
      const index = this.dashboards.findIndex((d) => d.dashboardId === id);
      this.dashboards[index].updateInfo(info);
    }
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
        new Dashboard().fromJson(d)
      );
    });
    return this;
  }

  addDashboard(dashboard: Dashboard) {
    this.dashboards.push(new Dashboard().fromJson(dashboard));
  }

  removeDashboard(dashboard: Dashboard) {
    this.dashboards = this.dashboards.filter((d) => d.dashboardId !== dashboard.dashboardId);
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
    const index = this.dashboards.findIndex((d) => d.dashboardId === dashboard.dashboardId);
    if (index >= 0) {
      this.dashboards[index] = dashboard;
      if (this.selectedDashboard?.dashboardId === dashboard.dashboardId) {
        this.selectDashboardById(dashboard.dashboardId);
      }
    }
  }

  selectDashboardById = (dashboardId: any) => {
    this.selectedDashboard =
      this.dashboards.find((d) => d.dashboardId == dashboardId) || new Dashboard();
  };

  getDashboardById = (dashboardId: string) => {
    const dashboard = this.dashboards.find((d) => d.dashboardId == dashboardId);

    if (dashboard) {
      this.selectedDashboard = dashboard;
      return true;
    } else {
      this.selectedDashboard = null;
      return false;
    }
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

  deleteDashboardWidget(dashboardId: string, widgetId: string) {
    this.isDeleting = true;
    return dashboardService
      .deleteWidget(dashboardId, widgetId)
      .then(() => {
        toast.success('Dashboard updated successfully');
        runInAction(() => {
          this.selectedDashboard?.removeWidget(widgetId);
        });
      })
      .finally(() => {
        this.isDeleting = false;
      });
  }

  addWidgetToDashboard(dashboard: Dashboard, metricIds: any): Promise<any> {
    this.isSaving = true;
    return dashboardService
      .addWidget(dashboard, metricIds)
      .then((response) => {
        toast.success('Card added to dashboard.');
      })
      .catch(() => {
        toast.error('Card could not be added.');
      })
      .finally(() => {
        this.isSaving = false;
      });
  }

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

  toggleAlertModal(val: boolean) {
    this.showAlertModal = val;
  }

  fetchMetricChartData(
    metric: Widget,
    data: any,
    isWidget: boolean = false,
    period: Record<string, any>
  ): Promise<any> {
    period = period.toTimestamps();
    const params = { ...period, ...data, key: metric.predefinedKey };

    if (metric.page && metric.limit) {
      params['page'] = metric.page;
      params['limit'] = metric.limit;
    }

    return new Promise(async (resolve, reject) => {
      this.pendingRequests += 1;

      try {
        const data = await metricService.getMetricChartData(metric, params, isWidget);
        resolve(metric.setData(data, period));
      } catch (error) {
        reject(error);
      } finally {
        setTimeout(() => {
          this.pendingRequests -= 1;
        }, 100);
      }
    });
  }
}
