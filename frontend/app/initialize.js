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
import { ConfigProvider, theme } from 'antd';
import colors from 'App/theme/colors';

// @ts-ignore
window.getCommitHash = () => console.log(window.env.COMMIT_HASH);

const customTheme = {
  // algorithm: theme.darkAlgorithm,
  token: {
    // Seed Token
    colorPrimary: colors.teal,
    colorPrimaryActive: '#394EFF',
    colorSecondary: '#3EAAAF',
    colorBgLayout: colors['gray-lightest'],
    colorBgContainer: colors['white'],
    colorLink: colors['teal'],
    colorLinkHover: colors['teal-dark'],

    borderRadius: 4,
    fontSize: 14,
    fontFamily: '\'Roboto\', \'ArialMT\', \'Arial\''

    // Alias Token
    // colorBgContainer: '#f6ffed'
  }
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
