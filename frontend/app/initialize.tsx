import './styles/index.css';
import './styles/global.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import './init';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import { ConfigProvider, App, theme, ThemeConfig } from 'antd';
import colors from 'App/theme/colors';
import { BrowserRouter } from 'react-router-dom';
import { Notification, MountPoint } from 'UI';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StoreProvider, RootStore } from './mstore';
import Router from './Router';
import './i18n';

// @ts-ignore
window.getCommitHash = () => console.log(window.env.COMMIT_HASH);

const queryClient = new QueryClient();
const customTheme: ThemeConfig = {
  // algorithm: theme.compactAlgorithm,
  components: {
    Layout: {
      headerBg: colors['gray-lightest'],
      siderBg: colors['gray-lightest'],
    },
    Segmented: {
      itemSelectedBg: '#FFFFFF',
      itemSelectedColor: colors.main,
    },
    Menu: {
      colorPrimary: colors.teal,
      colorBgContainer: colors['gray-lightest'],
      colorFillTertiary: colors['gray-lightest'],
      colorBgLayout: colors['gray-lightest'],
      subMenuItemBg: colors['gray-lightest'],

      itemHoverBg: colors['active-blue'],
      itemHoverColor: colors.teal,

      itemActiveBg: colors['active-blue'],
      itemSelectedBg: colors['active-blue'],
      itemSelectedColor: colors.teal,

      itemMarginBlock: 0,
      // itemPaddingInline: 50,
      // iconMarginInlineEnd: 14,
      collapsedWidth: 180,
    },
    Button: {
      colorPrimary: colors.teal,
    },
  },
  token: {
    colorPrimary: colors.teal,
    colorPrimaryActive: '#394EFF',
    colorBgLayout: colors['gray-lightest'],
    colorBgContainer: colors.white,
    colorLink: colors.teal,
    colorLinkHover: colors['teal-dark'],

    borderRadius: 4,
    fontSize: 14,
    fontFamily: "'Roboto', 'ArialMT', 'Arial'",
    fontWeightStrong: 400,
  },
};

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  // @ts-ignore
  const root = createRoot(container);

  // const theme = window.localStorage.getItem('theme');
  root.render(
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={customTheme}>
          <App>
            <StoreProvider store={new RootStore()}>
              <DndProvider backend={HTML5Backend}>
                <BrowserRouter>
                  <Notification />
                  <Router />
                </BrowserRouter>
              </DndProvider>
              <MountPoint />
            </StoreProvider>
          </App>
        </ConfigProvider>
      </QueryClientProvider>,
  );
});
