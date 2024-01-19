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
import BugReportStore from './bugReportStore';
import RecordingsStore from './recordingsStore';
import AssistMultiviewStore from './assistMultiviewStore';
import WeeklyReportStore from './weeklyReportConfigStore';
import AlertStore from './alertsStore';
import FeatureFlagsStore from './featureFlagsStore';
import UxtestingStore from './uxtestingStore';
import TagWatchStore from './tagWatchStore';

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
  bugReportStore: BugReportStore;
  recordingsStore: RecordingsStore;
  assistMultiviewStore: AssistMultiviewStore;
  weeklyReportStore: WeeklyReportStore;
  alertsStore: AlertStore;
  featureFlagsStore: FeatureFlagsStore;
  uxtestingStore: UxtestingStore;
  tagWatchStore: TagWatchStore;

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
    this.sessionStore = new SessionStore();
    this.notesStore = new NotesStore();
    this.bugReportStore = new BugReportStore();
    this.recordingsStore = new RecordingsStore();
    this.assistMultiviewStore = new AssistMultiviewStore();
    this.weeklyReportStore = new WeeklyReportStore();
    this.alertsStore = new AlertStore();
    this.featureFlagsStore = new FeatureFlagsStore();
    this.uxtestingStore = new UxtestingStore();
    this.tagWatchStore = new TagWatchStore();
  }

  initClient() {
    const client = new APIClient();
    services.forEach((service) => {
      service.initClient(client);
    });
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
