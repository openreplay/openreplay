import Widget from "App/mstore/types/widget";
import APIClient from 'App/api_client';
import { fetchErrorCheck } from "App/utils";

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
        return this.client.get('/metrics')
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || []);
    }

    /**
     * Get a metric by metricId.
     * @param metricId
     * @returns {Promise<any>} 
     */
    getMetric(metricId: string): Promise<any> {
        return this.client.get('/metrics/' + metricId)
            .then(fetchErrorCheck)
            .then((response: { data: any; }) => response.data || {});
    }

    /**
     * Save a metric.
     * @param metric 
     * @returns 
     */
    saveMetric(metric: Widget, dashboardId?: string): Promise<any> {
        const data = metric.toJson()
        const isCreating = !data[Widget.ID_KEY];
        const method = isCreating ? 'post' : 'put';
        const url = isCreating ? '/metrics' : '/metrics/' + data[Widget.ID_KEY];
        return this.client[method](url, data)
            .then(fetchErrorCheck)
            .then((response: { data: any; }) => response.data || {})
    }

    /**
     * Delete a metric.
     * @param metricId
     * @returns {Promise<any>}
     */
    deleteMetric(metricId: string): Promise<any> {
        return this.client.delete('/metrics/' + metricId)
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data);
    }


    /**
     * Get all templates.
     * @returns {Promise<any>}
     */
    getTemplates(): Promise<any> {
        return this.client.get('/metrics/templates')
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || []);
    }

    getMetricChartData(metric: Widget, data: any, isWidget: boolean = false): Promise<any> {
        const path = isWidget ? `/metrics/${metric.metricId}/chart` : `/metrics/try`;
        return this.client.post(path, data)
            .then(fetchErrorCheck)
            .then((response: { data: any; }) => response.data || {});
    }

    /**
     * Fetch sessions from the server.
     * @param filter 
     * @returns 
     */
     fetchSessions(metricId: string, filter: any): Promise<any> {
        return this.client.post(metricId ? `/metrics/${metricId}/sessions` : '/metrics/try/sessions', filter)
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || []);
    }

    fetchIssues(filter: string): Promise<any> {
        return this.client.post(`/metrics/try/issues`, filter)
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || {});
    }

    fetchIssue(metricId: string, issueId: string, params: any): Promise<any> {
        return this.client.post(`/custom_metrics/${metricId}/issues/${issueId}/sessions`, params)
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || {});
    }
}
