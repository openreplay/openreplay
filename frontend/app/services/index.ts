import DashboardService from "./DashboardService";
import MetricService from "./MetricService";
import FunnelService from "./FunnelService";
import SessionSerivce from "./SessionService";
import UserService from "./UserService";
import AuditService from './AuditService';
import ErrorService from "./ErrorService";
import NotesService from "./NotesService";
import RecordingsService from "./RecordingsService";
import ConfigService from './ConfigService'
import AlertsService from './AlertsService'
import WebhookService from './WebhookService'
import HealthService from "./HealthService";
import FFlagsService from "App/services/FFlagsService";

export const dashboardService  = new DashboardService();
export const metricService = new MetricService();
export const sessionService = new SessionSerivce();
export const userService = new UserService();
export const funnelService = new FunnelService();
export const auditService = new AuditService();
export const errorService = new ErrorService();
export const notesService = new NotesService();
export const recordingsService = new RecordingsService();
export const configService = new ConfigService();
export const alertsService = new AlertsService();
export const webhookService = new WebhookService();

export const healthService = new HealthService();

export const fflagsService = new FFlagsService();

export const services = [
  dashboardService,
  metricService,
  sessionService,
  userService,
  funnelService,
  auditService,
  errorService,
  notesService,
  recordingsService,
  configService,
  alertsService,
  webhookService,
  healthService,
  fflagsService
]