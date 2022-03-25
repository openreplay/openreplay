import './init';

import { render } from 'react-dom';
import { Provider } from 'react-redux';

import store from './store';
import Router from './Router';
import DashboardStore from './components/Dashboard/store';
import { DashboardStoreProvider } from './components/Dashboard/store/store';
import { ModalProvider } from './components/Modal/ModalContext';
import ModalRoot from './components/Modal/ModalRoot';


document.addEventListener('DOMContentLoaded', () => {
  const dashboardStore = new DashboardStore();
  render(
    (
      <Provider store={ store }>
        <DashboardStoreProvider store={ dashboardStore }>
          <ModalProvider>
              <ModalRoot />
              <Router />
          </ModalProvider>
        </DashboardStoreProvider>
      </Provider>
    ),
    document.getElementById('app'),
  );
});
