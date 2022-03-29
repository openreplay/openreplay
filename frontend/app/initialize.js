import './init';

import { render } from 'react-dom';
import { Provider } from 'react-redux';

import store from './store';
import Router from './Router';
import DashboardStore from './components/Dashboard/store';
import { DashboardStoreProvider } from './components/Dashboard/store/store';
import { ModalProvider } from './components/Modal/ModalContext';
import ModalRoot from './components/Modal/ModalRoot';
import { HTML5Backend } from 'react-dnd-html5-backend'
import { DndProvider } from 'react-dnd'



document.addEventListener('DOMContentLoaded', () => {
  const dashboardStore = new DashboardStore();
  render(
    (
      <Provider store={ store }>
        <DndProvider backend={HTML5Backend}>
          <DashboardStoreProvider store={ dashboardStore }>
            <ModalProvider>
                <ModalRoot />
                <Router />
            </ModalProvider>
          </DashboardStoreProvider>
        </DndProvider>
      </Provider>
    ),
    document.getElementById('app'),
  );
});
