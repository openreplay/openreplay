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
  // algorithm: theme.compactAlgorithm,
  components: {
    Layout: {
      colorBgBody: colors['gray-lightest'],
      colorBgHeader: colors['gray-lightest']
    },
    Menu: {
      // algorithm: true,
      // itemColor: colors['red'],
      // "itemActiveBg": "rgb(242, 21, 158)",
      // itemBgHover: colors['red'],

      // colorText: colors['red'],
      // colorIcon: colors['red'],
      // colorBg: colors['gray-lightest'],
      // colorItemText: '#394EFF',
      // colorItemTextSelected: colors['teal'],
      // colorItemBg: colors['gray-lightest']
    },
    Button: {
      colorPrimary: colors.teal,
      algorithm: true, // Enable algorithm
    },
  },
  token: {
    colorPrimary: colors.teal,
    colorPrimaryActive: '#394EFF',
    colorSecondary: '#3EAAAF',
    colorBgLayout: colors['gray-lightest'],
    colorBgContainer: colors['white'],
    colorLink: colors['teal'],
    colorLinkHover: colors['teal-dark'],

    borderRadius: 4,
    fontSize: 14,
    fontFamily: '\'Roboto\', \'ArialMT\', \'Arial\'',
    siderBackgroundColor: colors['gray-lightest'],
    siderCollapsedWidth: 800
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  const root = createRoot(container);

  // const theme = window.localStorage.getItem('theme');
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
