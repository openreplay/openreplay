import React from 'react';
import DashboardStore, { IDashboardSotre } from './dashboardStore';
import MetricStore, { IMetricStore } from './metricStore';
import UserStore from './userStore';
import RoleStore from './roleStore';
import APIClient from 'App/api_client';
import { makeAutoObservable, observable, action } from "mobx"
import { dashboardService, metricService, sessionService, userService, auditService } from 'App/services';
import SettingsStore from './settingsStore';
import AuditStore from './auditStore';
import NotificationStore from './notificationStore';

export class RootStore {
    dashboardStore: IDashboardSotre;
    metricStore: IMetricStore;
    settingsStore: SettingsStore;
    userStore: UserStore;
    roleStore: RoleStore;
    auditStore: AuditStore;
    notificationStore: NotificationStore

    limits: any;

    constructor() {
        this.dashboardStore = new DashboardStore();
        this.metricStore = new MetricStore();
        this.settingsStore = new SettingsStore();
        this.userStore = new UserStore();
        this.roleStore = new RoleStore();
        this.auditStore = new AuditStore();
        this.notificationStore = new NotificationStore();
        makeAutoObservable(this, {
          limits: observable,
          fetchLimits: action,
        });
    }

    initClient() {
      const client  = new APIClient();
      dashboardService.initClient(client)
      metricService.initClient(client)
      sessionService.initClient(client)
      userService.initClient(client)
    }
    
    fetchLimits(): Promise<any> {
      return new Promise((resolve, reject) => {
          userService.getLimits()
              .then((response: any) => {
                  this.limits = response;
                  resolve(response);
              }).catch((error: any) => {
                  reject(error);
              });
      });
    }
}

const StoreContext = React.createContext<RootStore>({} as RootStore);

export const StoreProvider = ({ children, store }: any) => {
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};

export const useStore = () => React.useContext(StoreContext);

export const withStore = (Component: any) => (props: any) => {
  return <Component {...props} mstore={useStore()} />;
};
