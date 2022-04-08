import './init';

import { render } from 'react-dom';
import { Provider } from 'react-redux';

import store from './store';
import Router from './Router';
import { StoreProvider, RootStore  } from './mstore';
import { ModalProvider } from './components/Modal';
import ModalRoot from './components/Modal/ModalRoot';
import { HTML5Backend } from 'react-dnd-html5-backend'
import { DndProvider } from 'react-dnd'

document.addEventListener('DOMContentLoaded', () => {
  render(
    (
      <Provider store={ store }>
        <StoreProvider store={new RootStore()}>
          <DndProvider backend={HTML5Backend}>
            {/* <ModalProvider> */}
              {/* <ModalRoot /> */}
              <Router />
            {/* </ModalProvider> */}
          </DndProvider>
        </StoreProvider>
      </Provider>
    ),
    document.getElementById('app'),
  );
});
