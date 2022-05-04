import DashboardService, { IDashboardService } from "./DashboardService";
import MetricService, { IMetricService } from "./MetricService";
import SessionSerivce from "./SessionService";
import UserService from "./UserService";

export const dashboardService: IDashboardService  = new DashboardService();
export const metricService: IMetricService = new MetricService();
export const sessionService: SessionSerivce = new SessionSerivce();
export const userService: UserService = new UserService();