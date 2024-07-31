import AiService from 'App/services/AiService';
import FFlagsService from 'App/services/FFlagsService';
import TagWatchService from 'App/services/TagWatchService';

import AlertsService from './AlertsService';
import AssistStatsService from './AssistStatsService';
import AuditService from './AuditService';
import ConfigService from './ConfigService';
import DashboardService from './DashboardService';
import ErrorService from './ErrorService';
import FunnelService from './FunnelService';
import HealthService from './HealthService';
import MetricService from './MetricService';
import NotesService from './NotesService';
import RecordingsService from './RecordingsService';
import SessionService from './SessionService';
import UserService from './UserService';
import UxtestingService from './UxtestingService';
import WebhookService from './WebhookService';
import SpotService from './spotService';
import LoginService from "./loginService";

export const dashboardService = new DashboardService();
export const metricService = new MetricService();
export const sessionService = new SessionService();
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
export const assistStatsService = new AssistStatsService();
export const uxtestingService = new UxtestingService();
export const tagWatchService = new TagWatchService();
export const aiService = new AiService();
export const spotService = new SpotService();
export const loginService = new LoginService();

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
  fflagsService,
  assistStatsService,
  uxtestingService,
  tagWatchService,
  aiService,
  spotService,
  loginService,
];
