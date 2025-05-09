import './styles/index.css';
import './styles/global.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import './init';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import { ConfigProvider, App, theme as antdTheme, ThemeConfig } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import { Notification, MountPoint } from 'UI';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StoreProvider, RootStore } from './mstore';
import Router from './Router';
import './i18n';
import { ThemeProvider, useTheme } from './ThemeContext';

// @ts-ignore
window.getCommitHash = () => console.log(window.env.COMMIT_HASH);

const queryClient = new QueryClient();

const cssVar = (name: string) => `var(--color-${name})`;

const ThemedApp: React.FC = () => {
  const { theme } = useTheme();

  // Create theme based on current theme setting
  const customTheme: ThemeConfig = {
    algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    components: {
      Layout: {
        headerBg: cssVar('gray-lightest'),
        siderBg: cssVar('gray-lightest'),
      },
      Segmented: {
        itemSelectedBg: theme === 'dark' ? cssVar('gray-darkest') : '#FFFFFF',
        itemSelectedColor: cssVar('main'),
      },
      Menu: {
        colorPrimary: cssVar('teal'),
        colorBgContainer: cssVar('gray-lightest'),
        colorFillTertiary: cssVar('gray-lightest'),
        colorBgLayout: cssVar('gray-lightest'),
        subMenuItemBg: cssVar('gray-lightest'),
        itemHoverBg: cssVar('active-blue'),
        itemHoverColor: cssVar('teal'),
        itemActiveBg: cssVar('tealx-light'),
        itemSelectedBg: cssVar('tealx-light'),
        itemSelectedColor: cssVar('teal'),
        itemColor: cssVar('gray-darkest'),
        itemMarginBlock: 0,
        collapsedWidth: 180,
      },
      Button: {
        colorPrimary: cssVar('main'),
      },
      Select: {
        colorBgContainer: cssVar('white'),
        colorBgElevated: cssVar('white'),
        colorBorder: cssVar('gray-light'),
        colorPrimaryHover: cssVar('main'),
        colorPrimary: cssVar('main'),
        colorText: cssVar('gray-darkest'),
        colorTextPlaceholder: cssVar('gray-medium'),
        colorTextQuaternary: cssVar('gray-medium'),
        controlItemBgActive: cssVar('active-blue'),
        controlItemBgHover: cssVar('active-blue'),
      },
      Radio: {
        colorPrimary: cssVar('main'),
        colorBorder: cssVar('gray-medium'),
        colorBgContainer: cssVar('white'),
      },
      Switch: {
        colorPrimary: cssVar('main'),
        colorPrimaryHover: cssVar('teal-dark'),
        colorTextQuaternary: cssVar('gray-light'),
        colorTextTertiary: cssVar('gray-medium'),
        colorBgContainer: cssVar('white'),
      },
      Input: {
        colorBgContainer: cssVar('white'),
        colorBorder: cssVar('gray-light'),
        colorText: cssVar('gray-darkest'),
        colorTextPlaceholder: cssVar('gray-medium'),
        activeBorderColor: cssVar('main'),
        hoverBorderColor: cssVar('main'),
      },
      Checkbox: {
        colorPrimary: cssVar('main'),
        colorBgContainer: cssVar('white'),
        colorBorder: cssVar('gray-medium'),
      },
      Table: {
        colorBgContainer: cssVar('white'),
        colorText: cssVar('gray-darkest'),
        colorTextHeading: cssVar('gray-darkest'),
        colorBorderSecondary: cssVar('gray-light'),
        headerBg: cssVar('gray-lightest'),
        rowHoverBg: cssVar('gray-lightest'),
        headerSortHoverBg: cssVar('gray-lighter'),
        headerSortActiveBg: cssVar('gray-lighter')
      },
      Modal: {
        colorBgElevated: cssVar('white'),
        colorText: cssVar('gray-darkest'),
      },
      Card: {
        colorBgContainer: cssVar('white'),
        colorBorderSecondary: cssVar('gray-light'),
      },
      Tooltip: {
        colorBgSpotlight: cssVar('white'),
        colorTextLightSolid: cssVar('gray-darkest'),
      },
      Tabs: {
        itemActiveColor: cssVar('main'),
        inkBarColor: cssVar('main'),
        itemSelectedColor: cssVar('main')
      },
      Tag: {
        defaultBg: cssVar('gray-lightest'),
        defaultColor: cssVar('gray-darkest')
      }
    },
    token: {
      colorPrimary: cssVar('main'),
      colorPrimaryActive: cssVar('teal-dark'),
      colorPrimaryHover: cssVar('main'),
      colorPrimaryBorder: cssVar('main'),
      colorBorder: cssVar('gray-light'),
      colorBgLayout: cssVar('gray-lightest'),
      colorBgContainer: cssVar('white'),
      controlItemBgActive: cssVar('active-blue'),
      controlItemBgActiveHover: cssVar('active-blue'),
      controlItemBgHover: cssVar('active-blue'),
      colorLink: cssVar('teal'),
      colorLinkHover: cssVar('teal-dark'),
      colorText: cssVar('gray-darkest'),
      colorTextSecondary: cssVar('gray-dark'),
      colorTextDisabled: cssVar('disabled-text'),
      borderRadius: 4,
      fontSize: 14,
      fontFamily: "'Roboto', 'ArialMT', 'Arial'",
      fontWeightStrong: 400,
      colorSplit: cssVar('gray-light')
    },
  };

  return (
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
  );
};

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  // @ts-ignore
  const root = createRoot(container);

  root.render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </QueryClientProvider>
  );
});
