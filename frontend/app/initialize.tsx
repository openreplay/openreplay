import { ConfirmMountPoint } from '@/ui/overlays/confirm';
import { ToastProvider } from '@/ui/overlays/toast';
import { TooltipProvider } from '@/ui/overlays/tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { configurePlayer } from 'Player/config';
import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createRoot } from 'react-dom/client';

import logger from 'App/logger';
import { BrowserRouter, LocationSync } from 'App/routing';

import ENV from '../env';
import Router from './Router';
import { ThemeProvider } from './ThemeContext';
import { i18nReady } from './i18n';
import './init';
import { RootStore, StoreProvider, client, userStore } from './mstore';
import { queryClient } from './queryClient';
import './styles/global.css';
import './styles/index.css';

configurePlayer({
  logger,
  efsClient: client,
  getUserName: () => userStore.account?.name ?? 'Agent',
  getApiEndpoint: () => (ENV as any).API_EDP || window.location.origin,
});

(window as any).env = (window as any).env ?? {};
(window as any).env.PRODUCTION = ENV.NODE_ENV === 'production';
// @ts-ignore
window.getCommitHash = () =>
  console.log(`Version: ${ENV.VERSION}, Commit: ${ENV.COMMIT_HASH}`);

const ThemedApp: React.FC = () => (
  <TooltipProvider delayDuration={200} skipDelayDuration={300}>
    <ToastProvider>
      <StoreProvider store={new RootStore()}>
        <DndProvider backend={HTML5Backend}>
          <BrowserRouter>
            <LocationSync />
            <Router />
          </BrowserRouter>
        </DndProvider>
        <ConfirmMountPoint />
      </StoreProvider>
    </ToastProvider>
  </TooltipProvider>
);

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  // @ts-ignore
  const root = createRoot(container);

  const render = () =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </QueryClientProvider>,
    );

  // Settles on a microtask for `en`; any other language fetches its file first,
  // which avoids a flash of raw i18n keys. The timeout is the floor: a locale
  // chunk that never resolves must not hold the app on the loading shell.
  void Promise.race([
    i18nReady,
    new Promise<void>((resolve) => setTimeout(resolve, 5000)),
  ]).then(render, render);
});
