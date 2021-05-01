import { List, Map } from 'immutable';

const ROOT_KEY = '_';
const defaultReducer = (state = Map()) => state;
const defaultInitialState = Map({
  loading: false,
  errors: null,
});

export class RequestTypes {
  constructor(type) {
    this.REQUEST = `${ type }_REQUEST`;
    this.SUCCESS = `${ type }_SUCCESS`;
    this.FAILURE = `${ type }_FAILURE`;
  }
  toArray() {
    return [ this.REQUEST, this.SUCCESS, this.FAILURE ];
  }
}

function simpleRequestDuck (
  types,
  customReducer = defaultReducer,
) {
  const typesArray = Array.isArray(types) ? types : [ types ];
  const requestEvents = typesArray.map(a => a.REQUEST);
  const successEvents = typesArray.map(a => a.SUCCESS);
  const failureEvents = typesArray.map(a => a.FAILURE);

  let loadingCounter = 0;

  const reducer = (inputState, action = {}) => {
    let state = customReducer(inputState, action);
    state = inputState ? state : state.merge(defaultInitialState);

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

  return { reducer, initialState: defaultInitialState };
};

// TODO: Errors

/**
 * @types: RequestTypes - array or single
 *           or object like {'state1': RequestTypes, 'state2': [RequestTypes] ... }
 * @reducer: wrapped reducer
 * */
export default function requestDuck(
  types,
  customReducer = defaultReducer,
) {
  if (types instanceof RequestTypes || types instanceof Array) {
    return simpleRequestDuck(types, customReducer);
  }

  const keys = Object.keys(types).filter(key => key !== ROOT_KEY);
  const ducks = {};
  keys.map((key) => { ducks[ key ] = simpleRequestDuck(types[ key ]); });

  let initialState = Map();
  let actualReducer = customReducer;
  if (types[ ROOT_KEY ]) {
    ({ initialState, reducer: actualReducer } = 
      simpleRequestDuck(types[ ROOT_KEY ], customReducer));
  }
  initialState = keys.reduce(
    (accumState, key) => accumState.set(key, ducks[ key ].initialState), 
    initialState,
  );

  const reducer = (inputState, action = {}) => {
    let state = actualReducer(inputState, action);
    keys.map((key) => {
      state = state.update(key, subState => ducks[ key ].reducer(subState, action));
    });
    return state;
  };

  return { reducer, initialState };
};
