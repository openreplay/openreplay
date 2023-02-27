import Widget from "App/mstore/types/widget";
import APIClient from 'App/api_client';
import { CLICKMAP } from "App/constants/card";

export default class MetricService {
    private client: APIClient;

    constructor(client?: APIClient) {
        this.client = client ? client : new APIClient();
    }

    initClient(client?: APIClient) {
        this.client = client || new APIClient();
    }

    /**
     * Get all metrics.
     * @returns {Promise<any>}
     */
    getMetrics(): Promise<any> {
        return this.client.get('/cards')
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || []);
    }

    /**
     * Get a metric by metricId.
     * @param metricId
     * @returns {Promise<any>} 
     */
    getMetric(metricId: string): Promise<any> {
        return this.client.get('/cards/' + metricId)
            .then(r => r.json())
            .then((response: { data: any; }) => response.data || {})
            .catch(e => Promise.reject(e))
    }

    /**
     * Save a metric.
     * @param metric
     * @returns 
     */
    saveMetric(metric: Widget): Promise<any> {
        const data = metric.toJson()
        const isCreating = !data[Widget.ID_KEY];
        const url = isCreating ? '/cards' : '/cards/' + data[Widget.ID_KEY];
        return this.client.post(url, data)
            .then(r => r.json())
            .then((response: { data: any; }) => response.data || {})
            .catch(e => Promise.reject(e))
    }

    /**
     * Delete a metric.
     * @param metricId
     * @returns {Promise<any>}
     */
    deleteMetric(metricId: string): Promise<any> {
        return this.client.delete('/cards/' + metricId)
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data);
    }


    /**
     * Get all templates.
     * @returns {Promise<any>}
     */
    getTemplates(): Promise<any> {
        return this.client.get('/cards/templates')
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || []);
    }

    getMetricChartData(metric: Widget, data: any, isWidget: boolean = false): Promise<any> {
        if (
          metric.metricType === CLICKMAP
          && document.location.pathname.split('/').pop() === 'metrics'
          && (document.location.pathname.indexOf('dashboard') !== -1 && document.location.pathname.indexOf('metric') === -1)
        ) {
            return Promise.resolve({})
        }
        const path = isWidget ? `/cards/${metric.metricId}/chart` : `/cards/try`;
        return this.client.post(path, data)
            .then(r => r.json())
            .then((response: { data: any; }) => response.data || {})
            .catch(e => Promise.reject(e))
    }

    /**
     * Fetch sessions from the server.
     * @param metricId {String}
     * @param filter
     * @returns 
     */
     fetchSessions(metricId: string, filter: any): Promise<any> {
        return this.client.post(metricId ? `/cards/${metricId}/sessions` : '/cards/try/sessions', filter)
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || []);
    }

    fetchIssues(filter: string): Promise<any> {
        return this.client.post(`/cards/try/issues`, filter)
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || {});
    }

    fetchIssue(metricId: string, issueId: string, params: any): Promise<any> {
        return this.client.post(`/cards/${metricId}/issues/${issueId}/sessions`, params)
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || {});
    }
}
