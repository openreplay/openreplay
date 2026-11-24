import Widget from 'App/mstore/types/widget';
import { HEATMAP, USER_PATH } from 'App/constants/card';
import BaseService from './BaseService';

export default class MetricService extends BaseService {
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
    const r = await this.client.get(`/cards/${metricId}`);
    const response = await r.json();
    return response.data || {};
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
    const r = await this.client.post(url, data);
    const response = await r.json();
    return response.data || {};
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
    // the saved endpoint draws a card as stored, so a journey saved as a
    // sunburst gets its flow chart from its definition, like the dashboard would
    const asFlow =
      isSaved && metric.metricType === USER_PATH && metric.savedAsSunburst;
    const path =
      isSaved && !asFlow
        ? `/PROJECT_ID/cards/${metric.metricId}/chart`
        : '/PROJECT_ID/cards/try';
    if (metric.metricType === USER_PATH) {
      data.density = 5;
      data.metricOf = 'sessionCount';
    }
    if (asFlow) {
      data = { ...metric.toJson(), ...data, hideExcess: true, rows: 5 };
    }
    if (metric.metricType === HEATMAP) {
      data.density = 20;
    }
    const r = await this.client.post(
      path,
      data,
      undefined,
      undefined,
      abortSignal,
    );
    const response = await r.json();
    return response.data || {};
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
}
