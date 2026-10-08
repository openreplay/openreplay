import BillingService from '@/services/BillingService';

import AiService from 'App/services/AiService';
import SearchService from 'App/services/SearchService';
import TagWatchService from 'App/services/TagWatchService';

import AlertsService from './AlertsService';
import AnalyticsService from './AnalyticsService';
import AssistStatsService from './AssistStatsService';
import AuditService from './AuditService';
import ConfigService from './ConfigService';
import CustomFieldService from './CustomFieldService';
import DashboardService from './DashboardService';
import ErrorService from './ErrorService';
import FilterService from './FilterService';
import FunnelService from './FunnelService';
import HealthService from './HealthService';
import IntegrationsService from './IntegrationsService';
import IssueReportsService from './IssueReportsService';
import MetricService from './MetricService';
import ProjectsService from './ProjectsService';
import RecordingsService from './RecordingsService';
import SessionService from './SessionService';
import SignalService from './SignalService';
import UserService from './UserService';
import WebhookService from './WebhookService';
import LoginService from './loginService';
import SpotService from './spotService';

export const dashboardService = new DashboardService();
export const metricService = new MetricService();
export const sessionService = new SessionService();
export const userService = new UserService();
export const funnelService = new FunnelService();
export const auditService = new AuditService();
export const errorService = new ErrorService();
export const recordingsService = new RecordingsService();
export const configService = new ConfigService();
export const alertsService = new AlertsService();
export const webhookService = new WebhookService();
export const signalService = new SignalService();

export const healthService = new HealthService();
export const assistStatsService = new AssistStatsService();
export const tagWatchService = new TagWatchService();
export const aiService = new AiService();
export const spotService = new SpotService();
export const loginService = new LoginService();
export const filterService = new FilterService();
export const issueReportsService = new IssueReportsService();
export const customFieldService = new CustomFieldService();
export const integrationsService = new IntegrationsService();
export const searchService = new SearchService();
export const projectsService = new ProjectsService();
export const billingService = new BillingService();
export const analyticsService = new AnalyticsService();

export const services = [
  projectsService,
  dashboardService,
  metricService,
  sessionService,
  userService,
  funnelService,
  auditService,
  errorService,
  recordingsService,
  configService,
  alertsService,
  webhookService,
  signalService,
  healthService,
  assistStatsService,
  tagWatchService,
  aiService,
  spotService,
  loginService,
  filterService,
  issueReportsService,
  customFieldService,
  integrationsService,
  searchService,
  billingService,
  analyticsService,
];
