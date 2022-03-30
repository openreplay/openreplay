import { IDashboard } from "App/components/Dashboard/store/dashboard";
import APIClient from 'App/api_client';
import { IWidget } from "App/components/Dashboard/store/widget";

export interface IDashboardService {
    initClient(): void
    getWidgets(dashboardId: string): Promise<any>
    
    getDashboards(): Promise<any[]>
    getDashboard(dashboardId: string): Promise<any>

    saveDashboard(dashboard: IDashboard): Promise<any>
    deleteDashboard(dashboardId: string): Promise<any>

    saveMetric(metric: IWidget, dashboardId?: string): Promise<any>
    deleteMetric(metricId: string): Promise<any>

    saveWidget(dashboardId: string, widget: IWidget): Promise<any>
    deleteWidget(dashboardId: string, widgetId: string): Promise<any>
}


export class DashboardService implements IDashboardService {
    private client: APIClient;

    constructor(client?: APIClient) {
        this.client = client ? client : new APIClient();
    }

    initClient() {
        this.client = new APIClient();
    }

    /**
     * Get all widgets from a dashboard.
     * @param dashboardId Required
     * @returns 
     */
    getWidgets(dashboardId: string): Promise<any> {
        return this.client.get(`/dashboards/${dashboardId}/widgets`)
            .then(response => response.json())
            .then(response => response.data || []);
    }


    /**
     * Get all dashboards.
     * @returns {Promise<any>}
     */
    getDashboards(): Promise<any[]> {
        return this.client.get('/dashboards')
            .then(response => response.json())
            .then(response => response.data || []);
    }
    
    /**
     * Get a dashboard by dashboardId.
     * @param dashboardId 
     * @returns {Promise<any>}
     */
    getDashboard(dashboardId: string): Promise<any> {
        return this.client.get('/dashboards/' + dashboardId)
            .then(response => response.json())
            .then(response => response.data || {});
    }

    /**
     * Create or update a dashboard.
     * @param dashboard Required
     * @returns {Promise<any>}
     */
    saveDashboard(dashboard: IDashboard): Promise<any> {
        const data = dashboard.toJson();
        if (dashboard.dashboardId) {
            return this.client.put(`/dashboards/${dashboard.dashboardId}`, data)
                .then(response => response.json())
                .then(response => response.data || {});
        } else {
            return this.client.post('/dashboards', data)
                .then(response => response.json())
                .then(response => response.data || {});
        }
    }

    /**
     * Delete a dashboard.
     * @param dashboardId 
     * @returns {Promise<any>}
     */
    deleteDashboard(dashboardId: string): Promise<any> {
        return this.client.delete(`/dashboards/${dashboardId}`)
    }


    /**
     * Create a new Meitrc, if the dashboardId is not provided, 
     * it will add the metric to the dashboard.
     * @param metric Required
     * @param dashboardId Optional
     * @returns {Promise<any>}
     */
    saveMetric(metric: IWidget, dashboardId?: string): Promise<any> {
        const data = metric.toJson();

        const path = dashboardId ? `/metrics` : '/metrics'; // TODO change to /dashboards/:dashboardId/widgets
        // const path = dashboardId ? `/dashboards/${dashboardId}/widgets` : '/widgets';
        if (metric.widgetId) {
            return this.client.put(path + '/' + metric.widgetId, data)
        } else {
            return this.client.post(path, data)
        }
    }

    /**
     * Delete a Metric by metricId.
     * @param metricId 
     * @returns {Promise<any>}
     */
    deleteMetric(metricId: string): Promise<any> {
        return this.client.delete(`/metrics/${metricId}`)
    }

    /**
     * Remove a widget from a dashboard.
     * @param dashboardId Required
     * @param widgetId Required
     * @returns {Promise<any>}
     */
    deleteWidget(dashboardId: string, widgetId: string): Promise<any> {
        return this.client.delete(`/dashboards/${dashboardId}/widgets/${widgetId}`)
    }

    /**
     * Add a widget to a dashboard.
     * @param dashboardId Required
     * @param widget Required
     * @returns {Promise<any>}
     */
    saveWidget(dashboardId: string, widget: IWidget): Promise<any> {
        return this.client.post(`/dashboards/${dashboardId}/widgets`, widget.toJson())
    }
}