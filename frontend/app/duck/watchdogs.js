import { List, Map } from 'immutable';
import Watchdog from 'Types/watchdog';
import { mergeReducers, success, array, request } from './funcTools/tools';
import { createRequestReducer } from './funcTools/request';
import { 
	createCRUDReducer, 
	getCRUDRequestTypes,
	createFetchList,
	createInit,
	createEdit,
	createRemove,
	createSave,
} from './funcTools/crud';

const name = 'issue_type';
const idKey = 'id';
const SET_ACTIVE_TAB = 'watchdogs/SET_ACTIVE_TAB';
const FETCH_WATCHDOG_STATUS = 'watchdogs/FETCH_WATCHDOG_STATUS';
const FETCH_WATCHDOG_STATUS_SUCCESS = success(FETCH_WATCHDOG_STATUS);
const FETCH_RULES = 'watchdogs/FETCH_RULES';
const FETCH_RULES_SUCCESS = success(FETCH_RULES);
const SAVE_CAPTURE_RATE = 'watchdogs/SAVE_CAPTURE_RATE';
const EDIT_CAPTURE_RATE = 'watchdogs/SAVE_CAPTURE_RATE';

const initialState = Map({
  activeTab: Map(),
  instance: Watchdog(),
  list: List(),
  rules: List(),
  captureRate: Map()
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case SET_ACTIVE_TAB:
      return state.set('activeTab', action.instance);
    case FETCH_RULES_SUCCESS:
      return state.set('rules', action.data);
    case FETCH_WATCHDOG_STATUS_SUCCESS:
    case success(SAVE_CAPTURE_RATE):
      return state.set('captureRate', Map(action.data));
    case request(SAVE_CAPTURE_RATE):
      return state.mergeIn(['captureRate'], action.params);
    case EDIT_CAPTURE_RATE:
      return state.mergeIn(['captureRate'], {rate: action.rate});
  }
  return state;
};


export const fetchList = createFetchList(name);
export const init = createInit(name);
export const edit = createEdit(name);
export const save = createSave(name);
export const remove = createRemove(name);

export function setActiveTab(instance) {
  return {
    type: SET_ACTIVE_TAB,
    instance,
  };
}

export const fetchRules = () => {
  return {
    types: array(FETCH_RULES),
    call: client => client.get(`/watchdogs/rules`),
  };
}

export default mergeReducers(
	reducer,
	createCRUDReducer(name, Watchdog, idKey),
	createRequestReducer({
    fetchWatchdogStatus: FETCH_WATCHDOG_STATUS,
    savingCaptureRate: SAVE_CAPTURE_RATE,
		...getCRUDRequestTypes(name),
	}),
);

export const saveCaptureRate = (params) => {
  return {
    params,
    types: array(SAVE_CAPTURE_RATE),
    call: client => client.post(`/sample_rate`, params),
  }
}

export const editCaptureRate = rate => {
  return {
    type: EDIT_CAPTURE_RATE,
    rate
  }
}

export const fetchWatchdogStatus = () => {
  return {
    types: array(FETCH_WATCHDOG_STATUS),
    call: client => client.get('/sample_rate'),
  };
}
