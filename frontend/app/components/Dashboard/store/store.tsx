import React from 'react'

const StoreContext = React.createContext(null)

export const DashboardStoreProvider = ({ children, store }) => {
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};

export const useDashboardStore = () => React.useContext(StoreContext);

export const withDashboardStore = (Component) => (props) => {
  return <Component {...props} store={useDashboardStore()} />;
};