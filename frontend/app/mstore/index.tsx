import React from 'react';
import DashboardStore, { IDashboardSotre } from './dashboardStore';
import MetricStore, { IMetricStore } from './metricStore';
import UserStore from './userStore';
import RoleStore from './roleStore';
import APIClient from 'App/api_client';
import { dashboardService, metricService, sessionService, userService } from 'App/services';
import SettingsStore from './settingsStore';

export class RootStore {
    dashboardStore: IDashboardSotre;
    metricStore: IMetricStore;
    settingsStore: SettingsStore;
    userStore: UserStore; 
    roleStore: RoleStore;

    constructor() {
        this.dashboardStore = new DashboardStore();
        this.metricStore = new MetricStore();
        this.settingsStore = new SettingsStore();
        this.userStore = new UserStore();
        this.roleStore = new RoleStore();
    }

    initClient() {
      const client  = new APIClient();
      dashboardService.initClient(client)
      metricService.initClient(client)
      sessionService.initClient(client)
      userService.initClient(client)
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
