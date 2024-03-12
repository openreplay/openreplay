import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import { Map } from 'immutable';
import indexReducer from './duck';
import apiMiddleware from './api_middleware';
import LocalStorage from './local_storage';
import { initialState as initUserState, UPDATE_JWT } from './duck/user'

// TODO @remove after few days
localStorage.removeItem('jwt')

const storage = new LocalStorage({
  user: Object,
});

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ && window.env.NODE_ENV === "development" 
  ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ : compose;

const storageState = storage.state();
const initialState = Map({ user: initUserState.update('jwt', () => storageState.user?.jwt || null) });

const store = createStore(indexReducer, initialState, composeEnhancers(applyMiddleware(thunk, apiMiddleware)));
store.subscribe(() => {
  const state = store.getState();

  storage.sync({
    user: state.get('user')
  });
});

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Copied to clipboard');
  } catch (err) {
    console.error('Could not copy text: ', err);
  }
}


window.getJWT = () => {
  const jwtToken = storage.state().user?.jwt ? JSON.stringify(storage.state().user?.jwt) : null
  if (jwtToken) {
    console.log(jwtToken);
    void copyToClipboard(jwtToken)
  } else {
    console.log('not logged in')
  }
}
window.setJWT = (jwt) => {
  store.dispatch({ type: UPDATE_JWT, data: jwt })
}

export default store;
