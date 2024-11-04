import { Map } from 'immutable';

export function reduceReducers(...args) {
  const initialState = args[ args.length - 1 ];
  const reducers = args.slice(0, -1);
  return (state = initialState, action) =>
    reducers.reduce((accumState, reducer) => reducer(accumState, action), state);
}

export function reduceDucks(...ducks) {
  const accumulatedInitialState = ducks
    .reduce((accumState, { initialState }) => accumState.merge(initialState), Map());
  const accumulatedReducer = (state = accumulatedInitialState, action) =>
    ducks.reduce((accumState, { reducer }) => reducer(accumState, action), state); 
  return {
    initialState: accumulatedInitialState,
    reducer: accumulatedReducer,
  };
}
