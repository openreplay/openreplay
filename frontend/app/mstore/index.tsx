import React from 'react';
import DashboardStore from './dashboardStore';
import MetricStore from './metricStore';
import UserStore from './userStore';
import RoleStore from './roleStore';
import APIClient from 'App/api_client';
import FunnelStore from './funnelStore';
import {
  dashboardService,
  metricService,
  sessionService,
  userService,
  auditService,
  funnelService,
  errorService,
  notesService,
} from 'App/services';
import SettingsStore from './settingsStore';
import AuditStore from './auditStore';
import NotificationStore from './notificationStore';
import ErrorStore from './errorStore';
import SessionStore from './sessionStore';
import NotesStore from './notesStore';

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
  }

  initClient() {
    const client = new APIClient();
    dashboardService.initClient(client);
    metricService.initClient(client);
    funnelService.initClient(client);
    sessionService.initClient(client);
    userService.initClient(client);
    auditService.initClient(client);
    errorService.initClient(client);
    notesService.initClient(client)
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
