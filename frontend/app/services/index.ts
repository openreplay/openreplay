import DashboardService, { IDashboardService } from "./DashboardService";
import MetricService, { IMetricService } from "./MetricService";
import FunnelService, { IFunnelService } from "./FunnelService";

export const dashboardService: IDashboardService  = new DashboardService();
export const metricService: IMetricService = new MetricService();
export const funnelService: IFunnelService = new FunnelService();