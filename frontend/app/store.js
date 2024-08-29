import { createStore, applyMiddleware, compose } from 'redux';
import { thunk } from 'redux-thunk';
import { Map } from 'immutable';
import indexReducer from './duck';
import apiMiddleware from './api_middleware';
import LocalStorage from './local_storage';
import { initialState as initUserState, UPDATE_JWT } from './duck/user'

const storage = new LocalStorage({
  user: Object,
});

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ && window.env.NODE_ENV === "development" 
  ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ : compose;

const storageState = storage.state();
const initialState = Map({ user:
    initUserState
      .update('jwt', () => storageState.user?.jwt || null)
      .update('spotJwt', () => storageState.user?.spotJwt || null)
});

const store = createStore(indexReducer, initialState, composeEnhancers(applyMiddleware(thunk, apiMiddleware)));
store.subscribe(() => {
  const state = store.getState();

  storage.sync({
    user: state.get('user')
  });
});

function copyToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;

  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

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
  const jwtToken = storage.state().user?.jwt ? JSON.stringify(storage.state().user?.jwt) : null
  if (jwtToken) {
    console.log(jwtToken);
    copyToClipboard(jwtToken)
  } else {
    console.log('not logged in')
  }
}
window.setJWT = (jwt) => {
  store.dispatch({ type: UPDATE_JWT, data: jwt })
}

export default store;
