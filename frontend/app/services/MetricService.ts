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
  getMetrics(): Promise<any> {
    return this.client
      .get('/cards')
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || []);
  }

  /**
   * Get all metrics paginated.
   * @returns {Promise<any>}
   */
  getMetricsPaginated(params: any): Promise<any> {
    return this.client
      .post('/cards/search', params)
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || []);
  }

  /**
   * Get a metric by metricId.
   * @param metricId
   * @returns {Promise<any>}
   */
  getMetric(metricId: string): Promise<any> {
    return this.client
      .get(`/cards/${metricId}`)
      .then((r) => r.json())
      .then((response: { data: any }) => response.data || {})
      .catch((e) => Promise.reject(e));
  }

  /**
   * Save a metric.
   * @param metric
   * @returns
   */
  saveMetric(metric: Widget): Promise<any> {
    const data = metric.toJson();
    const isCreating = !data[Widget.ID_KEY];
    const url = isCreating ? '/cards' : `/cards/${data[Widget.ID_KEY]}`;
    return this.client
      .post(url, data)
      .then((r) => r.json())
      .then((response: { data: any }) => response.data || {})
      .catch((e) => Promise.reject(e));
  }

  /**
   * Delete a metric.
   * @param metricId
   * @returns {Promise<any>}
   */
  deleteMetric(metricId: string): Promise<any> {
    return this.client
      .delete(`/cards/${metricId}`)
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data);
  }

  /**
   * Get all templates.
   * @returns {Promise<any>}
   */
  getTemplates(): Promise<any> {
    return this.client
      .get('/cards/templates')
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || []);
  }

  async getMetricChartData(
    metric: Widget,
    data: any,
    isSaved: boolean = false,
  ): Promise<any> {
    if (
      metric.metricType === HEATMAP &&
      document.location.pathname.split('/').pop() === 'metrics' &&
      document.location.pathname.indexOf('dashboard') !== -1 &&
      document.location.pathname.indexOf('metric') === -1
    ) {
      return Promise.resolve({});
    }
    const path = isSaved ? `/cards/${metric.metricId}/chart` : '/cards/try';
    if (metric.metricType === USER_PATH) {
      data.density = 5;
      data.metricOf = 'sessionCount';
    }
    try {
      const r = await this.client.post(path, data);
      const response = await r.json();
      return response.data || {};
    } catch (e) {
      return await Promise.reject(e);
    }
  }

  /**
   * Fetch sessions from the server.
   * @param metricId {String}
   * @param filter
   * @returns
   */
  fetchSessions(metricId: string | null, filter: any): Promise<any> {
    return this.client
      .post(
        metricId ? `/cards/${metricId}/sessions` : '/cards/try/sessions',
        filter,
      )
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || []);
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
    return (await json.data) || {};
  }

  fetchIssue(metricId: string, issueId: string, params: any): Promise<any> {
    return this.client
      .post(`/cards/${metricId}/issues/${issueId}/sessions`, params)
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || {});
  }
}
