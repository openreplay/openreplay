import { List, Map } from 'immutable';
import { createRequestReducer } from './funcTools/request';
import { mergeReducers, } from './funcTools/tools';
import { RequestTypes } from 'Duck/requestStateCreator';

const SET_SHOW_ALERTS = 'dashboard/SET_SHOW_ALERTS';
const FETCH_PERFORMANCE_SEARCH = 'dashboard/FETCH_PERFORMANCE_SEARCH';
const ON_BOARD = new RequestTypes('plan/ON_BOARD');

const initialState = Map({
  showAlerts: false,
  boarding: undefined,
  boardingCompletion: undefined,
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case SET_SHOW_ALERTS:
      return state.set('showAlerts', action.state);
    case ON_BOARD.SUCCESS:
      const tasks = List(action.data);
      const completion = tasks.filter(task => task.done).size * 100 / tasks.size;
      return state.set('boarding', tasks).set('boardingCompletion', Math.trunc(completion));
  }
  return state;
};

export default mergeReducers(
  reducer,
  createRequestReducer({
    performanceSearchRequest: FETCH_PERFORMANCE_SEARCH,
  }),
);


export function setShowAlerts(state) {
  return {
    type: SET_SHOW_ALERTS,
    state,
  }
}
