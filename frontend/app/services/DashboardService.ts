import Dashboard from 'App/mstore/types/dashboard';
import Widget from 'App/mstore/types/widget';
import BaseService from './BaseService';

export default class DashboardService extends BaseService {
  /**
   * Get all widgets from a dashboard.
   * @param dashboardId Required
   * @returns
   */
  getWidgets(dashboardId: string): Promise<any> {
    return this.client
      .get(`/dashboards/${dashboardId}/widgets`)
      .then((response) => response.json())
      .then((response) => response.data || []);
  }

  /**
   * Get all dashboards.
   * @returns {Promise<any>}
   */
  getDashboards(): Promise<any[]> {
    return this.client
      .get('/dashboards')
      .then((response) => response.json())
      .then((response) => response.data || []);
  }

  /**
   * Get a dashboard by dashboardId.
   * @param dashboardId
   * @returns {Promise<any>}
   */
  getDashboard(dashboardId: string): Promise<any> {
    return this.client
      .get(`/dashboards/${dashboardId}`)
      .then((response) => response.json())
      .then((response) => response.data || {});
  }

  /**
   * Create or update a dashboard.
   * @param dashboard Required
   * @returns {Promise<any>}
   */
  saveDashboard(dashboard: Dashboard): Promise<any> {
    const data = dashboard.toJson();
    if (dashboard.dashboardId) {
      return this.client
        .put(`/dashboards/${dashboard.dashboardId}`, data)
        .then((response) => response.json())
        .then((response) => response.data || {});
    }
    return this.client
      .post('/dashboards', data)
      .then((response) => response.json())
      .then((response) => response.data || {});
  }

  /**
   * Add a widget to a dashboard.
   * @param dashboard
   * @param metricIds
   * @returns
   */
  addWidget(dashboard: Dashboard, metricIds: any): Promise<any> {
    const data = dashboard.toJson();
    data.metrics = metricIds;
    return this.client
      .put(`/dashboards/${dashboard.dashboardId}`, data)
      .then((response) => response.json())
      .then((response) => response.data || {});
  }

  /**
   * Delete a dashboard.
   * @param dashboardId
   * @returns {Promise<any>}
   */
  deleteDashboard(dashboardId: string): Promise<any> {
    return this.client.delete(`/dashboards/${dashboardId}`);
  }

  /**
   * Create a new Meitrc, if the dashboardId is not provided,
   * it will add the metric to the dashboard.
   * @param metric Required
   * @param dashboardId Optional
   * @returns {Promise<any>}
   */
  saveMetric(metric: Widget, dashboardId?: string): Promise<any> {
    const data = metric.toJson();
    const path = dashboardId
      ? `/dashboards/${dashboardId}/metrics`
      : '/metrics';
    if (metric.widgetId) {
      return this.client.put(`${path}/${metric.widgetId}`, data);
    }
    return this.client.post(path, data);
  }

  /**
   * Remove a widget from a dashboard.
   * @param dashboardId Required
   * @param widgetId Required
   * @returns {Promise<any>}
   */
  deleteWidget(dashboardId: string, widgetId: string): Promise<any> {
    return this.client.delete(`/dashboards/${dashboardId}/widgets/${widgetId}`);
  }

  /**
   * Add a widget to a dashboard.
   * @param dashboardId Required
   * @param widget Required
   * @returns {Promise<any>}
   */
  saveWidget(dashboardId: string, widget: Widget): Promise<any> {
    if (widget.widgetId) {
      return this.client
        .put(
          `/dashboards/${dashboardId}/widgets/${widget.widgetId}`,
          widget.toWidget(),
        )
        .then((response) => response.json())
        .then((response) => response.data || {});
    }
    return this.client
      .post(`/dashboards/${dashboardId}/widgets`, widget.toWidget())
      .then((response) => response.json())
      .then((response) => response.data || {});
  }
}
