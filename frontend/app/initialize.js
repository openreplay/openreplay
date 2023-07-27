import './styles/index.scss';
import React from 'react';
import { createRoot } from 'react-dom/client';
import './init';
import { Provider } from 'react-redux';
import store from './store';
import Router from './Router';
import { StoreProvider, RootStore } from './mstore';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import { ConfigProvider } from 'antd';

// @ts-ignore
window.getCommitHash = () => console.log(window.env.COMMIT_HASH);

// Custom theme configuration
const customTheme = {
  '@primary-color': 'red', // Change the primary color to red
  '@text-color': 'red', // Change the default text color to red
  '@font-size-base': '20px', // Change the base font size
  // Add more custom variables as needed...
};

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  const root = createRoot(container);

  const theme = window.localStorage.getItem('theme');
  root.render(
    <ConfigProvider theme={customTheme}>
      <Provider store={store}>
        <StoreProvider store={new RootStore()}>
          <DndProvider backend={HTML5Backend}>
            <Router />
          </DndProvider>
        </StoreProvider>
      </Provider>
    </ConfigProvider>
  );
});
