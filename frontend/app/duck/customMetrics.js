import { List, Map } from 'immutable'; 
import CustomMetric, { FilterSeries } from 'Types/customMetric'
import { fetchListType, fetchType, saveType, removeType, editType, createRemove, createEdit } from './funcTools/crud';
import { createRequestReducer, ROOT_KEY } from './funcTools/request';
import { array, success, createListUpdater, mergeReducers } from './funcTools/tools';
import Filter from 'Types/filter';
import Session from 'Types/session';

const name = "custom_metric";
const idKey = "metricId";

const FETCH_LIST = fetchListType(name);
const FETCH_SESSION_LIST = fetchListType(`${name}/FETCH_SESSION_LIST`);
const FETCH = fetchType(name);
const SAVE = saveType(name);

const ADD_SERIES = `${name}/ADD_SERIES`;
const REMOVE_SERIES = `${name}/REMOVE_SERIES`;

const ADD_SERIES_FILTER_FILTER = `${name}/ADD_SERIES_FILTER_FILTER`;
const REMOVE_SERIES_FILTER_FILTER = `${name}/REMOVE_SERIES_FILTER_FILTER`;

const EDIT_SERIES_FILTER = `${name}/EDIT_SERIES_FILTER`;
const EDIT_SERIES_FILTER_FILTER = `${name}/EDIT_SERIES_FILTER_FILTER`;
const UPDATE_ACTIVE_STATE = saveType(`${name}/UPDATE_ACTIVE_STATE`);
const EDIT = editType(name);
const INIT = `${name}/INIT`;
const SET_ACTIVE_WIDGET = `${name}/SET_ACTIVE_WIDGET`;
const REMOVE = removeType(name);
const UPDATE_SERIES = `${name}/UPDATE_SERIES`;

const updateItemInList = createListUpdater(idKey);
const updateInstance = (state, instance) => state.getIn([ "instance", idKey ]) === instance[ idKey ]
	? state.mergeIn([ "instance" ], instance)
	: state;

const defaultInstance = CustomMetric({
  name: 'New',
  series: List([
    {
      name: 'Series 1',
      filter: new Filter({ filters: List(), eventsOrder: 'then' }),
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
    // Custom Metric
    case INIT:
      return state.set('instance', action.instance);
    case EDIT:
      return state.mergeIn([ 'instance' ], action.instance);
    case ADD_SERIES:
      const series = new FilterSeries(action.series);
      return state.updateIn([ 'instance', 'series' ], list => list.push(series));
    case REMOVE_SERIES:
      return state.updateIn([ 'instance', 'series' ], list => list.delete(action.index));
    case UPDATE_SERIES:
      return state.mergeIn(['instance', 'series', action.index], action.series);

    // Custom Metric - Series - Filters
    case EDIT_SERIES_FILTER:
      return state.mergeIn(['instance', 'series', action.seriesIndex, 'filter'], action.filter);

    // Custom Metric - Series - Filter - Filters
    case EDIT_SERIES_FILTER_FILTER:
      return state.updateIn([ 'instance', 'series', action.seriesIndex, 'filter', 'filters' ], filters => filters.set(action.filterIndex, action.filter));
    case ADD_SERIES_FILTER_FILTER:
      return state.updateIn([ 'instance', 'series', action.seriesIndex, 'filter', 'filters' ], filters => filters.push(action.filter));
    case REMOVE_SERIES_FILTER_FILTER:
      return state.updateIn([ 'instance', 'series', action.seriesIndex, 'filter', 'filters' ], filters => filters.delete(action.index));

    
    
    case success(SAVE):
      return updateItemInList(updateInstance(state, action.data), action.data);      
    case success(REMOVE):
      return state.update('list', list => list.filter(item => item.metricId !== action.id));
		case success(FETCH):
			return state.set("instance", CustomMetric(action.data));
		case success(FETCH_LIST):
			const { data } = action;
			return state.set("list", List(data.map(CustomMetric)));
    case success(FETCH_SESSION_LIST):
      return state.set("sessionList", List(action.data.map(item => ({ ...item, sessions: item.sessions.map(s => new Session(s)) }))));
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

export function fetch(id) {
	return {
		id,
		types: array(FETCH),
		call: c => c.get(`/errors/${id}`),
	}
}

export const save = (instance) => (dispatch, getState) => {
  return dispatch({
    types: SAVE.array,
    call: client => client.post( `/${ instance.exists() ? name + 's/' + instance[idKey] : name + 's'}`, instance.toSaveData()),
  }).then(() => {
    dispatch(fetchList());
  });
};

export function fetchList() {
  return {
    types: array(FETCH_LIST),
    call: client => client.get(`/${name}s`),
  };
}

export const init = (instance = null, forceNull = false) => (dispatch, getState) => {
  dispatch({
    type: INIT,
    instance: forceNull ? null : (instance || defaultInstance),
  });
}



export const fetchSessionList = (params) => (dispatch, getState) => {
  dispatch({
    types: array(FETCH_SESSION_LIST),
    call: client => client.post(`/custom_metrics/${params.metricId}/sessions`, { ...params }),
  });
}

export const setActiveWidget = (widget) => (dispatch, getState) => {
  return dispatch({
    type: SET_ACTIVE_WIDGET,
    widget,
  });
}

export const updateActiveState = (metricId, state) => (dispatch, getState) => {
  return dispatch({
    types: UPDATE_ACTIVE_STATE.array,
    call: client => client.post(`/custom_metrics/${metricId}/status`, { active: state }),
    metricId
  }).then(() => {
    dispatch(fetchList());
  });
}

export const editSeriesFilter = (seriesIndex, filter) => (dispatch, getState) => {
  return dispatch({
    type: EDIT_SERIES_FILTER,
    seriesIndex,
    filter,
  });
}

export const addSeriesFilterFilter = (seriesIndex, filter) => (dispatch, getState) => {
  return dispatch({
    type: ADD_SERIES_FILTER_FILTER,
    seriesIndex,
    filter,
  });
}

export const removeSeriesFilterFilter = (seriesIndex, filterIndex) => (dispatch, getState) => {
  return dispatch({
    type: REMOVE_SERIES_FILTER_FILTER,
    seriesIndex,
    index: filterIndex,
  });
}

export const editSeriesFilterFilter = (seriesIndex, filterIndex, filter) => (dispatch, getState) => {
  return dispatch({
    type: EDIT_SERIES_FILTER_FILTER,
    seriesIndex,
    filterIndex,
    filter,
  });
}