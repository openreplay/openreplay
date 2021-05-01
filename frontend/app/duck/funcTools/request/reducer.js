import { List, Map } from 'immutable';
import { RequestType } from './types';
import { request, success, failure } from '../tools'; //

export const ROOT_KEY = '_';
const defaultReducer = (state = Map()) => state;


const simpleRequestInitialState = Map({
  loading: false,
  errors: null,
});

const getKeys = types => Object.keys(types).filter(key => key !== ROOT_KEY);

export function getRequestInitialState(types) {
  if (typeof types === 'string' || Array.isArray(types)) {
    return simpleRequestInitialState;
  }
  let initialState = Map();
  if (types[ ROOT_KEY ]) {
    initialState = getRequestInitialState(types[ ROOT_KEY ]);
  }
  return getKeys(types).reduce(
    (accumState, key) => accumState.set(key, getRequestInitialState(types[ key ])), 
    initialState,
  );
}

function createSimpleRequestReducer(types, reducer) {
  const typesArray = Array.isArray(types) ? types : [ types ];
  const requestEvents = typesArray.map(t => t.request || request(t));  // back compat.
  const successEvents = typesArray.map(t => t.success || success(t));
  const failureEvents = typesArray.map(t => t.failure || failure(t));

  let loadingCounter = 0;

  return (state, action = {}) => {
    if (state === undefined) { 
      if (typeof reducer === "function") { // flow?
        state = reducer(state, action).merge(simpleRequestInitialState);
      } else {
        state = simpleRequestInitialState;
      }
    }
    if (requestEvents.includes(action.type)) {
      loadingCounter += 1;
      return state.set('loading', loadingCounter > 0).set('errors', null);
    }
    if (successEvents.includes(action.type)) {
      loadingCounter -= 1;
      return state.set('loading', loadingCounter > 0).set('errors', null);
    }
    if (failureEvents.includes(action.type)) {
      loadingCounter -= 1;
      return state.set('loading', loadingCounter > 0).set('errors', List(action.errors));
    }
    return state;
  };
};

/**
 * @types: RequestTypes - array or single
 *           or object like {'state1': RequestTypes, 'state2': [RequestTypes] ... }
 * */
export function createRequestReducer(types, reducer = defaultReducer) {
  if (typeof types === 'string' || types instanceof RequestType || Array.isArray(types)) {
    return createSimpleRequestReducer(types);
  }

  const keys = getKeys(types);
  const reducers = {};
  keys.map((key) => { reducers[ key ] = createRequestReducer(types[ key ]); });

  let rootReducer = typeof reducer === 'function' ? reducer : defaultReducer;
  // TODO: remove  ROOT_KEY logic
  if (types[ ROOT_KEY ]) {
    rootReducer = createRequestReducer(types[ ROOT_KEY ], rootReducer);
  }
  return (state, action = {}) => {
    state = rootReducer(state, action);
    keys.map((key) => {
      state = state.update(key, subState => reducers[ key ](subState, action));
    });
    return state;
  };
};


