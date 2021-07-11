import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { Map } from 'immutable';
import indexReducer from './duck';
import apiMiddleware from './api_middleware';
import LocalStorage from './local_storage';

const storage = new LocalStorage({
  jwt: String,
  stkJWT: String,
});

const storageState = storage.state();
const initialState = Map({
  jwt: storageState.jwt,
  stkJWT: storageState.stkJWT,
  // TODO: store user
});

const store = createStore(indexReducer, initialState, applyMiddleware(thunk, apiMiddleware));
store.subscribe(() => {
  const state = store.getState();
  storage.sync({
    jwt: state.get('jwt'),
    stkJWT: state.get('stkJWT')
  });
});

export default store;
