import DashboardService, { IDashboardService } from "./DashboardService";
import MetricService, { IMetricService } from "./MetricService";

export const dashboardService: IDashboardService  = new DashboardService();
export const metricService: IMetricService = new MetricService();