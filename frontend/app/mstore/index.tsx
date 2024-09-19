import React from 'react';
import DashboardStore from './dashboardStore';
import MetricStore from './metricStore';
import UserStore from './userStore';
import RoleStore from './roleStore';
import APIClient from 'App/api_client';
import FunnelStore from './funnelStore';
import { services } from 'App/services';
import SettingsStore from './settingsStore';
import AuditStore from './auditStore';
import NotificationStore from './notificationStore';
import ErrorStore from './errorStore';
import SessionStore from './sessionStore';
import NotesStore from './notesStore';
import RecordingsStore from './recordingsStore';
import AssistMultiviewStore from './assistMultiviewStore';
import WeeklyReportStore from './weeklyReportConfigStore';
import AlertStore from './alertsStore';
import FeatureFlagsStore from './featureFlagsStore';
import UxtestingStore from './uxtestingStore';
import TagWatchStore from './tagWatchStore';
import AiSummaryStore from './aiSummaryStore';
import AiFiltersStore from './aiFiltersStore';
import SpotStore from './spotStore';
import LoginStore from './loginStore';
import FilterStore from './filterStore';
import UiPlayerStore from './uiPlayerStore';
import IssueReportingStore from './issueReportingStore';
import CustomFieldStore from './customFieldStore';
import { IntegrationsStore } from "./integrationsStore";
import ProjectsStore from './projectsStore';

export const projectStore = new ProjectsStore();
export const sessionStore = new SessionStore();

export class RootStore {
  dashboardStore: DashboardStore;
  metricStore: MetricStore;
  funnelStore: FunnelStore;
  settingsStore: SettingsStore;
  userStore: UserStore;
  roleStore: RoleStore;
  auditStore: AuditStore;
  errorStore: ErrorStore;
  notificationStore: NotificationStore;
  sessionStore: SessionStore;
  notesStore: NotesStore;
  recordingsStore: RecordingsStore;
  assistMultiviewStore: AssistMultiviewStore;
  weeklyReportStore: WeeklyReportStore;
  alertsStore: AlertStore;
  featureFlagsStore: FeatureFlagsStore;
  uxtestingStore: UxtestingStore;
  tagWatchStore: TagWatchStore;
  aiSummaryStore: AiSummaryStore;
  aiFiltersStore: AiFiltersStore;
  spotStore: SpotStore;
  loginStore: LoginStore;
  filterStore: FilterStore;
  uiPlayerStore: UiPlayerStore;
  issueReportingStore: IssueReportingStore;
  customFieldStore: CustomFieldStore;
  integrationsStore: IntegrationsStore
  projectsStore: ProjectsStore;

  constructor() {
    this.dashboardStore = new DashboardStore();
    this.metricStore = new MetricStore();
    this.funnelStore = new FunnelStore();
    this.settingsStore = new SettingsStore();
    this.userStore = new UserStore();
    this.roleStore = new RoleStore();
    this.auditStore = new AuditStore();
    this.errorStore = new ErrorStore();
    this.notificationStore = new NotificationStore();
    this.sessionStore = sessionStore;
    this.notesStore = new NotesStore();
    this.recordingsStore = new RecordingsStore();
    this.assistMultiviewStore = new AssistMultiviewStore();
    this.weeklyReportStore = new WeeklyReportStore();
    this.alertsStore = new AlertStore();
    this.featureFlagsStore = new FeatureFlagsStore();
    this.uxtestingStore = new UxtestingStore();
    this.tagWatchStore = new TagWatchStore();
    this.aiSummaryStore = new AiSummaryStore();
    this.aiFiltersStore = new AiFiltersStore();
    this.spotStore = new SpotStore();
    this.loginStore = new LoginStore();
    this.filterStore = new FilterStore();
    this.uiPlayerStore = new UiPlayerStore();
    this.issueReportingStore = new IssueReportingStore();
    this.customFieldStore = new CustomFieldStore();
    this.integrationsStore = new IntegrationsStore();
    this.projectsStore = projectStore;
  }

  initClient() {
    const client = new APIClient();
    services.forEach((service) => {
      service.initClient(client);
    });
    client.setSiteIdCheck(this.projectsStore.getSiteId)
  }
}

const StoreContext = React.createContext<RootStore>({} as RootStore);

export const StoreProvider = ({ children, store }: any) => {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};

export const useStore = () => React.useContext(StoreContext);

export const withStore = (Component: any) => (props: any) => {
  return <Component {...props} mstore={useStore()} />;
};
