import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import { Map } from 'immutable';
import indexReducer from './duck';
import apiMiddleware from './api_middleware';
import LocalStorage from './local_storage';

const storage = new LocalStorage({
  jwt: String,
});

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ && window.env.NODE_ENV === "development" 
  ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ : compose;

const storageState = storage.state();
const initialState = Map({
  jwt: storageState.jwt,
  // TODO: store user
});

const store = createStore(indexReducer, initialState, composeEnhancers(applyMiddleware(thunk, apiMiddleware)));
store.subscribe(() => {
  const state = store.getState();
  storage.sync({
    jwt: state.get('jwt')
  });
});

export default store;
