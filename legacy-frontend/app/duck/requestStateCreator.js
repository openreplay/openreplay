import { List, Map } from 'immutable';

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

const defaultReducer = (state = Map()) => state;
const initialState = Map({
  loading: false,
  errors: null,
});

const addRequestState = (
  types,
  reducer = defaultReducer,
) => {
  const typesArray = Array.isArray(types) ? types : [ types ];
  const requestEvents = typesArray.map(a => a.REQUEST);
  const successEvents = typesArray.map(a => a.SUCCESS);
  const failureEvents = typesArray.map(a => a.FAILURE);

  let loadingCounter = 0;

  return (inputState, action = {}) => {
    let state = reducer(inputState, action);
    // initialization
    state = inputState ? state : state.merge(initialState);

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

// TODO: Errors

/**
 * @types: RequestTypes - array or single
 *           or object like {'state1': RequestTypes, 'state2': [RequestTypes] ... }
 * @reducer: wrapped reducer
 * */
export default (
  types,
  reducer = defaultReducer,
) => {
  if (types instanceof RequestTypes || types instanceof Array) {
    return addRequestState(types, reducer);
  }

  const keys = Object.keys(types).filter(key => key !== '_');
  const reducers = {};
  keys.map((key) => { reducers[ key ] = addRequestState(types[ key ]); });

  const actualReducer = types._ ? addRequestState(types._, reducer) : reducer;

  return (inputState, action = {}) => {
    let state = actualReducer(inputState, action);
    keys.map((key) => {
      state = state.update(key, subState => reducers[ key ](subState, action));
    });
    return state;
  };
};
