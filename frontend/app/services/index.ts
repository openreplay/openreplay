import DashboardService, { IDashboardService } from "./DashboardService";
import MetricService, { IMetricService } from "./MetricService";
import SessionSerivce from "./SessionService";

export const dashboardService: IDashboardService  = new DashboardService();
export const metricService: IMetricService = new MetricService();
export const sessionService: SessionSerivce = new SessionSerivce();