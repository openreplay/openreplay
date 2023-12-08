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
import { ConfigProvider, theme, ThemeConfig } from 'antd';
import colors from 'App/theme/colors';
import { BrowserRouter } from 'react-router-dom';
import { Notification } from 'UI';

// @ts-ignore
window.getCommitHash = () => console.log(window.env.COMMIT_HASH);

const customTheme: ThemeConfig = {
  // algorithm: theme.compactAlgorithm,
  components: {
    Layout: {
      headerBg: colors['gray-lightest'],
      siderBg: colors['gray-lightest']
    },
    Segmented: {
      itemSelectedBg: '#FFFFFF',
    },
    Menu: {
      colorPrimary: colors.teal,
      colorBgContainer: colors['gray-lightest'],
      colorFillTertiary: colors['gray-lightest'],
      colorBgLayout: colors['gray-lightest'],
      subMenuItemBg: colors['gray-lightest'],

      itemHoverBg: colors['active-blue'],
      itemHoverColor: colors['teal'],

      itemActiveBg: colors['active-blue'],
      itemSelectedBg: colors['active-blue'],
      itemSelectedColor: colors['teal'],

      itemMarginBlock: 0,
      itemPaddingInline: 50,
      iconMarginInlineEnd: 14,
      collapsedWidth: 180,
    },
    Button: {
      colorPrimary: colors.teal
    }
  },
  token: {
    colorPrimary: colors.teal,
    colorPrimaryActive: '#394EFF',
    colorBgLayout: colors['gray-lightest'],
    colorBgContainer: colors['white'],
    colorLink: colors['teal'],
    colorLinkHover: colors['teal-dark'],

    borderRadius: 4,
    fontSize: 14,
    fontFamily: '\'Roboto\', \'ArialMT\', \'Arial\''
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  // @ts-ignore
  const root = createRoot(container);


  // const theme = window.localStorage.getItem('theme');
  root.render(
    <ConfigProvider theme={customTheme}>
      <Provider store={store}>
        <StoreProvider store={new RootStore()}>
          <DndProvider backend={HTML5Backend}>
            <BrowserRouter>
              <Notification />
              <Router />
            </BrowserRouter>
          </DndProvider>
        </StoreProvider>
      </Provider>
    </ConfigProvider>
  );
});
