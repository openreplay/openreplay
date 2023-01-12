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

window.getJWT = () => {
  console.log(JSON.stringify(storage.state().user?.jwt  || 'not logged in'));
}
window.setJWT = (jwt) => {
  store.dispatch({ type: UPDATE_JWT, data: jwt })
}

export default store;
