import React from 'react';
import DashboardStore, { IDashboardSotre } from './dashboardStore';
import MetricStore, { IMetricStore } from './metricStore';
import UserStore from './userStore';
import RoleStore from './roleStore';
import APIClient from 'App/api_client';
import FunnelStore from './funnelStore';
import { dashboardService, metricService, funnelService, sessionService, userService, auditService } from 'App/services';
import SettingsStore from './settingsStore';
import AuditStore from './auditStore';

export class RootStore {
    dashboardStore: IDashboardSotre;
    metricStore: IMetricStore;
    funnelStore: FunnelStore;
    settingsStore: SettingsStore;
    userStore: UserStore; 
    roleStore: RoleStore;
    auditStore: AuditStore;

    constructor() {
        this.dashboardStore = new DashboardStore();
        this.metricStore = new MetricStore();
        this.funnelStore = new FunnelStore();
        this.settingsStore = new SettingsStore();
        this.userStore = new UserStore();
        this.roleStore = new RoleStore();
        this.auditStore = new AuditStore();
    }

    initClient() {
      const client  = new APIClient();
      dashboardService.initClient(client)
      metricService.initClient(client)
      funnelService.initClient(client)
      sessionService.initClient(client)
      userService.initClient(client)
      auditService.initClient(client)
    }
}

const StoreContext = React.createContext<RootStore>({} as RootStore);

export const StoreProvider = ({ children, store }) => {
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};

export const useStore = () => React.useContext(StoreContext);

export const withStore = (Component) => (props) => {
  return <Component {...props} mstore={useStore()} />;
};
