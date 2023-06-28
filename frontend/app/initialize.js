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


// @ts-ignore
window.getCommitHash = () => console.log(window.env.COMMIT_HASH)

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('app');
    const root = createRoot(container);
    root.render(
        <Provider store={store}>
            <StoreProvider store={new RootStore()}>
                <DndProvider backend={HTML5Backend}>
                    <Router />
                </DndProvider>
            </StoreProvider>
        </Provider>
    );
});
