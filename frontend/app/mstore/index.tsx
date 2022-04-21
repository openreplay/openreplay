import React from 'react';
import DashboardStore, { IDashboardSotre } from './dashboardStore';
import MetricStore, { IMetricStore } from './metricStore';
import APIClient from 'App/api_client';
import { dashboardService, funnelService, metricService } from 'App/services';
import FunnelStore from './funnelStore';

export class RootStore {
    dashboardStore: IDashboardSotre;
    metricStore: IMetricStore;
    funnelStore: FunnelStore;

    constructor() {
        this.dashboardStore = new DashboardStore();
        this.metricStore = new MetricStore();
        this.funnelStore = new FunnelStore();
    }

    initClient() {
      const client  = new APIClient();
      dashboardService.initClient(client)
      metricService.initClient(client)
      funnelService.initClient(client)
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
