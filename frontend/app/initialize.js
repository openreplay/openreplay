import './init';

import { render } from 'react-dom';
import { Provider } from 'react-redux';

import store from './store';
import Router from './Router';
import DashboardStore from './components/Dashboard/store';
import { DashboardStoreProvider } from './components/Dashboard/store/store';


document.addEventListener('DOMContentLoaded', () => {
  const dashboardStore = new DashboardStore();
  render(
    (
      <Provider store={ store }>
        <DashboardStoreProvider store={ dashboardStore }>
          <Router />
        </DashboardStoreProvider>
      </Provider>
    ),
    document.getElementById('app'),
  );
});
