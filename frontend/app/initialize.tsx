import './styles/index.css';
import './styles/global.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import './init';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import { App, ConfigProvider } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import { MountPoint, Notification } from 'UI';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootStore, StoreProvider } from './mstore';
import Router from './Router';
import './i18n';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

// @ts-ignore
window.getCommitHash = () => console.log(window.env.COMMIT_HASH);

const queryClient = new QueryClient();

const ThemedApp = () => {
    const { theme } = useTheme();

    return (
        <ConfigProvider theme={theme}>
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
        </QueryClientProvider>,
    );
});
