import React from 'react';
import DashboardStore, { IDashboardSotre } from 'App/components/Dashboard/store/DashboardStore';

export class RootStore {
    dashboardStore: IDashboardSotre;
    constructor() {
        this.dashboardStore = new DashboardStore();
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
  return <Component {...props} store={useStore()} />;
};

