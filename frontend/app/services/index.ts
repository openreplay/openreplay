import DashboardService from "./DashboardService";
import MetricService from "./MetricService";
import FunnelService from "./FunnelService";
import SessionSerivce from "./SessionService";
import UserService from "./UserService";
import AuditService from './AuditService';
import ErrorService from "./ErrorService";
import NotesService from "./NotesService";

export const dashboardService  = new DashboardService();
export const metricService = new MetricService();
export const sessionService = new SessionSerivce();
export const userService = new UserService();
export const funnelService = new FunnelService();
export const auditService = new AuditService();
export const errorService = new ErrorService();
export const notesService = new NotesService();
