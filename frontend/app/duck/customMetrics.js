import { List, Map } from 'immutable'; 
import CustomMetric, { FilterSeries } from 'Types/customMetric'
import { createFetch, fetchListType, fetchType, saveType, removeType, editType, createRemove, createEdit } from './funcTools/crud';
import { createRequestReducer, ROOT_KEY } from './funcTools/request';
import { array, request, success, failure, createListUpdater, mergeReducers } from './funcTools/tools';
import Filter from 'Types/filter';
import Session from 'Types/session';

const name = "custom_metric";
const idKey = "metricId";

const FETCH_LIST = fetchListType(name);
const FETCH_SESSION_LIST = fetchListType(`${name}/FETCH_SESSION_LIST`);
const FETCH = fetchType(name);
const SAVE = saveType(name);
const EDIT = editType(name);
const INIT = `${name}/INIT`;
const SET_ACTIVE_WIDGET = `${name}/SET_ACTIVE_WIDGET`;
const REMOVE = removeType(name);
const UPDATE_SERIES = `${name}/UPDATE_SERIES`;
const SET_ALERT_METRIC_ID = `${name}/SET_ALERT_METRIC_ID`;

function chartWrapper(chart = []) {
  return chart.map(point => ({ ...point, count: Math.max(point.count, 0) }));
}

const updateItemInList = createListUpdater(idKey);
const updateInstance = (state, instance) => state.getIn([ "instance", idKey ]) === instance[ idKey ]
	? state.mergeIn([ "instance" ], instance)
	: state;

const defaultInstance = CustomMetric({
  name: 'New',
  series: List([
    {
      name: 'Session Count',
      filter: new Filter({ filters: [], eventsOrder: 'and' }),
    },
  ])
})

const initialState = Map({
	list: List(),
  sessionList: List(),
  alertMetricId: null,
	instance: null,
  activeWidget: null,
});

// Metric - Series - [] - filters
function reducer(state = initialState, action = {}) {
	switch (action.type) {
    case EDIT:
      const instance = state.get('instance')
      if (instance) {
        return state.mergeIn([ 'instance' ], action.instance);
      } else {
        return state.set('instance', action.instance);
      }
    case INIT:
      return state.set('instance', action.instance);
    case UPDATE_SERIES:
      console.log('update series', action.series);
      return state.mergeIn(['instance', 'series', action.index], action.series);
    case success(SAVE):
      return updateItemInList(updateInstance(state, action.data), action.data);
      // return state.mergeIn([ 'instance' ], action.data);
    case success(REMOVE):
      return state.update('list', list => list.filter(item => item.metricId !== action.id));
		case success(FETCH):
			return state.set("instance", CustomMetric(action.data));
		case success(FETCH_LIST):
			const { data } = action;
			return state.set("list", List(data.map(CustomMetric)));
    case success(FETCH_SESSION_LIST):
      return state.set("sessionList", List(action.data.map(item => ({ ...item, sessions: item.sessions.map(Session) }))));
    case SET_ACTIVE_WIDGET:
      return state.set("activeWidget", action.widget).set('sessionList', List());
	}
	return state;
}

export default mergeReducers(
	reducer,
	createRequestReducer({
		[ ROOT_KEY ]: FETCH_LIST,
		fetch: FETCH,
    save: SAVE,
    fetchSessionList: FETCH_SESSION_LIST,
	}),
);

export const edit = createEdit(name);
export const remove = createRemove(name);

export const updateSeries = (index, series) => ({
  type: UPDATE_SERIES,
  index,
  series,
});

export function fetch(id) {
	return {
		id,
		types: array(FETCH),
		call: c => c.get(`/errors/${id}`),
	}
}

export function save(instance) {
  return {
    types: SAVE.array,
    call: client => client.post( `/${ instance.exists() ? name + 's/' + instance[idKey] : name + 's'}`, instance.toSaveData()),
  };
}

export function fetchList() {
  return {
    types: array(FETCH_LIST),
    call: client => client.get(`/${name}s`),
  };
}

export function setAlertMetricId(id) {
  return {
    type: SET_ALERT_METRIC_ID,
    id,
  };
}

export const addSeries = (series) => (dispatch, getState) => {
  const instance = getState().getIn([ 'customMetrics', 'instance' ])
  const _series = series || new FilterSeries({
    name: 'New',
    filter: new Filter({ filters: [], eventsOrder: 'and' }),
  });
  return dispatch({
    type: EDIT,
    instance: {
      series: instance.series.push(_series)
    },
  });
}

export const init = (instnace = null, setDefault = true) => (dispatch, getState) => {
  dispatch({
    type: INIT,
    instance: instnace ? instnace : (setDefault ? defaultInstance : null),
  });
}

export const fetchSessionList = (params) => (dispatch, getState) => {
  dispatch({
    types: array(FETCH_SESSION_LIST),
    call: client => client.post(`/custom_metrics/sessions`, { ...params }),
  });
}

export const setActiveWidget = (widget) => (dispatch, getState) => {
  dispatch({
    type: SET_ACTIVE_WIDGET,
    widget,
  });
}