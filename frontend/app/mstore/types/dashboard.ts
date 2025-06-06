import { makeAutoObservable, runInAction } from 'mobx';
import { dashboardService } from 'App/services';
import { toast } from 'react-toastify';
import { DateTime } from 'luxon';
import Widget from './widget';

export default class Dashboard {
  public static get ID_KEY(): string {
    return 'dashboardId';
  }

  dashboardId?: string = undefined;

  key: string = '';

  name: string = 'Untitled Dashboard';

  description: string = '';

  isPublic: boolean = true;

  widgets: Widget[] = [];

  metrics: any[] = [];

  isValid: boolean = false;

  id: string = '';

  currentWidget: Widget = new Widget();

  config: any = {};

  createdAt: number = new Date().getTime();

  owner: string = '';

  constructor() {
    makeAutoObservable(this);

    this.validate();
  }

  get updatedAt() {
    return this.createdAt as unknown as DateTime;
  }

  get updatedBy() {
    return 'no api';
  }

  update(data: any) {
    runInAction(() => {
      Object.assign(this, data);
    });
    this.validate();
  }

  updateInfo(data: any) {
    runInAction(() => {
      this.name = data.name || this.name;
      this.description = data.description || this.description;
      this.isPublic = data.isPublic;
    });
  }

  toJson() {
    return {
      dashboardId: this.dashboardId,
      name: this.name,
      isPublic: this.isPublic,
      metrics: this.metrics,
      description: this.description,
    };
  }

  fromJson(json: any) {
    runInAction(() => {
      this.dashboardId = json.dashboardId;
      this.name = json.name;
      this.description = json.description;
      this.isPublic = json.isPublic;
      this.key = json.dashboardId;
      this.createdAt = DateTime.fromMillis(new Date(json.createdAt).getTime());
      this.owner = json.ownerName;
      if (json.widgets) {
        const smallWidgets: any[] = json.widgets.filter(
          (wi) => wi.config.col === 1,
        );
        const otherWidgets: any[] = json.widgets.filter(
          (wi) => wi.config.col !== 1,
        );
        const widgets = [
          ...smallWidgets.sort((a, b) => a.config.position - b.config.position),
          ...otherWidgets.sort((a, b) => a.config.position - b.config.position),
        ];

        widgets.forEach((widget, index) => {
          widget.config.position = index;
        });

        this.widgets = widgets.map((w: Widget) => new Widget().fromJson(w));
      } else {
        this.widgets = [];
      }
    });
    return this;
  }

  validate() {
    return (this.isValid = this.name.length > 0);
  }

  addWidget(widget: Widget) {
    this.widgets.push(widget);
  }

  removeWidget(widgetId: string) {
    this.widgets = this.widgets.filter((w) => w.widgetId !== widgetId);
  }

  updateWidget(widget: Widget) {
    const index = this.widgets.findIndex((w) => w.widgetId === widget.widgetId);
    if (index >= 0) {
      this.widgets[index] = widget;
    }
  }

  getWidget(widgetId: string) {
    return this.widgets.find((w) => w.widgetId === widgetId);
  }

  getWidgetIndex(widgetId: string) {
    return this.widgets.findIndex((w) => w.widgetId === widgetId);
  }

  getWidgetByIndex(index: number) {
    return this.widgets[index];
  }

  getWidgetCount() {
    return this.widgets.length;
  }

  getWidgetIndexByWidgetId(widgetId: string) {
    return this.widgets.findIndex((w) => w.widgetId === widgetId);
  }

  swapWidgetPosition(positionA: number, positionB: number): Promise<any> {
    const widgetA = this.widgets[positionA];
    const widgetB = this.widgets[positionB];
    this.widgets[positionA] = widgetB;
    this.widgets[positionB] = widgetA;

    widgetA.position = positionB;
    widgetB.position = positionA;

    return new Promise<void>((resolve, reject) => {
      Promise.all([
        dashboardService.saveWidget(this.dashboardId, widgetA),
        dashboardService.saveWidget(this.dashboardId, widgetB),
      ])
        .then(() => {
          toast.success('Dashboard successfully updated');
          resolve();
        })
        .catch(() => {
          toast.error('Error updating widget position');
          reject();
        });
    });
  }

  sortWidgets() {
    this.widgets = this.widgets.sort((a, b) => {
      if (a.position > b.position) {
        return 1;
      }
      if (a.position < b.position) {
        return -1;
      }
      return 0;
    });
  }

  exists() {
    return this.dashboardId !== undefined;
  }

  toggleMetrics(metricId: string) {
    if (this.metrics.includes(metricId)) {
      this.metrics = this.metrics.filter((m) => m !== metricId);
    } else {
      this.metrics.push(metricId);
    }
  }
}
