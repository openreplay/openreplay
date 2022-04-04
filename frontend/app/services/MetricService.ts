import Widget, { IWidget } from "App/mstore/types/widget";
import APIClient from 'App/api_client';

export interface IMetricService {
    initClient(client?: APIClient): void;

    getMetrics(): Promise<any>;
    getMetric(metricId: string): Promise<any>;
    saveMetric(metric: IWidget, dashboardId?: string): Promise<any>;
    deleteMetric(metricId: string): Promise<any>;

    getTemplates(): Promise<any>;
}

export default class MetricService implements IMetricService {
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
            .then(response => response.json())
            .then(response => response.data || []);
    }

    /**
     * Get a metric by metricId.
     * @param metricId
     * @returns {Promise<any>} 
     */
    getMetric(metricId: string): Promise<any> {
        return this.client.get('/metrics/' + metricId)
            .then(response => response.json())
            .then(response => response.data || {});
    }

    /**
     * Save a metric.
     * @param metric 
     * @returns 
     */
    saveMetric(metric: IWidget, dashboardId?: string): Promise<any> {
        const data = metric.toJson()
        const isCreating = !data[Widget.ID_KEY];
        const method = isCreating ? 'post' : 'put';
        
        if(dashboardId) {
            const url = `/dashboards/${dashboardId}/metrics`;
            return this.client[method](url, data)
                .then(response => response.json())
                .then(response => response.data || {});
        } else {
            const url = isCreating ? '/metrics' : '/metrics/' + data[Widget.ID_KEY];
            return this.client[method](url, data)
                .then(response => response.json())
                .then(response => response.data || {});
        }
    }

    /**
     * Delete a metric.
     * @param metricId
     * @returns {Promise<any>}
     */
    deleteMetric(metricId: string): Promise<any> {
        return this.client.delete('/metrics/' + metricId)
            .then(response => response.json())
            .then(response => response.data);
    }


    /**
     * Get all templates.
     * @returns {Promise<any>}
     */
    getTemplates(): Promise<any> {
        return this.client.get('/metrics/templates')
            .then(response => response.json())
            .then(response => response.data || []);
    }
}