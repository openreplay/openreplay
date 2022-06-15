import DashboardService, { IDashboardService } from "./DashboardService";
import MetricService, { IMetricService } from "./MetricService";
import FunnelService, { IFunnelService } from "./FunnelService";
import SessionSerivce from "./SessionService";
import UserService from "./UserService";
import AuditService from './AuditService';
import ErrorService from "./ErrorService";

export const dashboardService: IDashboardService  = new DashboardService();
export const metricService: IMetricService = new MetricService();
export const sessionService: SessionSerivce = new SessionSerivce();
export const userService: UserService = new UserService();
export const funnelService: IFunnelService = new FunnelService();
export const auditService: AuditService = new AuditService();
export const errorService: ErrorService = new ErrorService();
