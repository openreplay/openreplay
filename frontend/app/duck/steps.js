import { List, Map } from 'immutable';
import { RequestTypes } from 'Duck/requestStateCreator';
import Step from 'Types/step';
import Event from 'Types/filter/event';
import { getRE } from 'App/utils';
import Test from 'Types/appTest';
import { countries } from 'App/constants';
import { KEYS } from 'Types/filter/customFilter';

const countryOptions = Object.keys(countries).map(c => ({filterKey: KEYS.USER_COUNTRY, label: KEYS.USER_COUNTRY, type: KEYS.USER_COUNTRY, value: c, actualValue: countries[c], isFilter: true }));

const INIT = 'steps/INIT';
const EDIT = 'steps/EDIT';

const SET_TEST = 'steps/SET_TEST';
const FETCH_LIST = new RequestTypes('steps/FETCH_LIST');

const initialState = Map({
  list: List(),
  test: Test(),
  instance: Step(),
  editingIndex: null,
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case FETCH_LIST.SUCCESS: {      
      return state.set('list', List(action.data).map(i => {
        const type = i.type === 'navigate' ? i.type : 'location';
        return {...i, type: type.toUpperCase()}
      }))
    }
    case INIT:
      return state
        .set('instance', Step(action.instance))
        .set('editingIndex', action.index)
        .set('test', Test());
    case EDIT:
      return state.mergeIn([ 'instance' ], action.instance);
    case SET_TEST:
      return state.set('test', Test(action.test));
  }
  return state;
};

export default reducer;

export function init(instance, index) {
  return {
    type: INIT,
    instance,
    index,
  };
}

export function edit(instance) {
  return {
    type: EDIT,
    instance,
  };
}

export function setTest(test) {
  return {
    type: SET_TEST,
    test,
  };
}


export function fetchList(params) {
  return {
    types: FETCH_LIST.toArray(),
    call: client => client.get('/tests/steps/search', params),
    params,
  };
}
