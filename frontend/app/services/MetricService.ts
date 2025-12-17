import Widget from 'App/mstore/types/widget';
import APIClient from 'App/api_client';
import { HEATMAP, USER_PATH } from 'App/constants/card';

export default class MetricService {
  private client: APIClient;

  constructor(client?: APIClient) {
    this.client = client || new APIClient();
  }

  initClient(client?: APIClient) {
    this.client = client || new APIClient();
  }

  /**
   * Get all metrics.
   * @returns {Promise<any>}
   */
  async getMetrics(): Promise<any> {
    const response = await this.client.get('/cards');
    const json = await response.json();
    return json.data || [];
  }

  /**
   * Get all metrics paginated.
   * @returns {Promise<any>}
   */
  async getMetricsPaginated(params: any): Promise<any> {
    const response = await this.client.get('/cards', params);
    const json = await response.json();
    return json.data || [];
  }

  /**
   * Get a metric by metricId.
   * @param metricId
   * @returns {Promise<any>}
   */
  async getMetric(metricId: string): Promise<any> {
    try {
      const r = await this.client.get(`/cards/${metricId}`);
      const response = await r.json();
      return response.data || {};
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Save a metric.
   * @param metric
   * @returns
   */
  async saveMetric(metric: Widget): Promise<any> {
    const data = metric.toJson();
    const isCreating = !data[Widget.ID_KEY];
    const url = isCreating ? '/cards' : `/cards/${data[Widget.ID_KEY]}`;
    try {
      const r = await this.client.post(url, data);
      const response = await r.json();
      return response.data || {};
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Delete a metric.
   * @param metricId
   * @returns {Promise<any>}
   */
  async deleteMetric(metricId: string): Promise<any> {
    const response = await this.client.delete(`/cards/${metricId}`);
    const json = await response.json();
    return json?.data || {};
  }

  /**
   * Get all templates.
   * @returns {Promise<any>}
   */
  async getTemplates(): Promise<any> {
    const response = await this.client.get('/cards/templates');
    const json = await response.json();
    return json.data || [];
  }

  async getMetricChartData(
    metric: Widget,
    data: any,
    isSaved: boolean = false,
    abortSignal?: AbortSignal,
  ): Promise<any> {
    if (
      metric.metricType === HEATMAP &&
      document.location.pathname.split('/').pop() === 'metrics' &&
      document.location.pathname.indexOf('dashboard') !== -1 &&
      document.location.pathname.indexOf('metric') === -1
    ) {
      return Promise.resolve({});
    }
    const path = isSaved
      ? // ? `/dashboards/${metric.dashboardId}/cards/${metric.metricId}/chart`
        `/PROJECT_ID/cards/${metric.metricId}/chart`
      : '/PROJECT_ID/cards/try';
    if (metric.metricType === USER_PATH) {
      data.density = 5;
      data.metricOf = 'sessionCount';
    }
    if (metric.metricType === HEATMAP) {
      data.density = 20;
    }
    try {
      const r = await this.client.post(
        path,
        data,
        undefined,
        undefined,
        abortSignal,
      );
      const response = await r.json();
      return response.data || {};
    } catch (e) {
      return await Promise.reject(e);
    }
  }

  /**
   * Fetch sessions from the server.
   * @param filter
   * @returns
   */
  async fetchSessions(filter: any): Promise<any> {
    const response = await this.client.post('/sessions/search', filter);
    const json = await response.json();
    return json.data || [];
  }

  async fetchIssues(filter: any): Promise<any> {
    if (filter.metricType === USER_PATH) {
      const widget = new Widget().fromJson(filter);
      const drillDownFilter = filter.filters;
      filter = { ...widget.toJson(), page: filter.page };
      filter.filters = drillDownFilter;
    }

    const resp: Response = await this.client.post('/cards/try/issues', filter);
    const json: any = await resp.json();
    return json.data || {};
  }

  async fetchIssue(
    metricId: string,
    issueId: string,
    params: any,
  ): Promise<any> {
    const response = await this.client.post(
      `/cards/${metricId}/issues/${issueId}/sessions`,
      params,
    );
    const json = await response.json();
    return json.data || {};
  }
}
