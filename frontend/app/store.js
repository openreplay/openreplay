import { configureStore } from '@reduxjs/toolkit';
import { Map } from 'immutable';

import apiMiddleware from './api_middleware';
import indexReducer from './duck';
import { UPDATE_JWT, initialState as initUserState } from './duck/user';
import LocalStorage from './local_storage';

const storage = new LocalStorage({
  user: Object,
});

const storageState = storage.state();
const initialState = Map({
  user: initUserState
    .update('jwt', () => storageState.user?.jwt || null)
    .update('spotJwt', () => storageState.user?.spotJwt || null),
});

const store = configureStore({
  reducer: indexReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }).concat(apiMiddleware),
  preloadedState: initialState,
  devTools: window.env.NODE_ENV === 'development',
});

store.subscribe(() => {
  const state = store.getState();
  storage.sync({
    user: state.get('user'),
  });
});

function copyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;

  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    const msg = successful ? 'successful' : 'unsuccessful';
    console.log('Token copy ' + msg);
  } catch (err) {
    console.error('unable to copy', err);
  }

  document.body.removeChild(textArea);
}

window.getJWT = () => {
  const jwtToken = storage.state().user?.jwt
    ? JSON.stringify(storage.state().user?.jwt)
    : null;
  if (jwtToken) {
    console.log(jwtToken);
    copyToClipboard(jwtToken);
  } else {
    console.log('not logged in');
  }
};

window.setJWT = (jwt) => {
  store.dispatch({ type: UPDATE_JWT, data: { jwt } });
};

export default store;
