import { List, Map } from 'immutable'; 
// import { clean as cleanParams } from 'App/api_client';
import ErrorInfo, { RESOLVED, UNRESOLVED, IGNORED } from 'Types/errorInfo';
import CustomMetric, { FilterSeries } from 'Types/customMetric'
import { createFetch, fetchListType, fetchType, saveType, removeType, editType, createRemove, createEdit } from './funcTools/crud';
// import { createEdit, createInit } from './funcTools/crud';
import { createRequestReducer, ROOT_KEY } from './funcTools/request';
import { array, request, success, failure, createListUpdater, mergeReducers } from './funcTools/tools';
import Filter from 'Types/filter';
// import filter from 'core-js/fn/array/filter';
// import NewFilter from 'Types/filter/newFilter';
// import Event from 'Types/filter/event';
// import CustomFilter from 'Types/filter/customFilter';
import { errors as errorsRoute, isRoute } from "App/routes";
import { fetchList as fetchSessionList } from './sessions';
import { fetchList as fetchErrorsList } from './errors';

const ERRORS_ROUTE = errorsRoute();

const name = "custom_metric";
const idKey = "metricId";

const FETCH_LIST = fetchListType(name);
const FETCH = fetchType(name);
const SAVE = saveType(name);
const EDIT = editType(name);
const REMOVE = removeType(name);
const UPDATE = `${name}/UPDATE`;
const SET_ALERT_METRIC_ID = `${name}/SET_ALERT_METRIC_ID`;

function chartWrapper(chart = []) {
  return chart.map(point => ({ ...point, count: Math.max(point.count, 0) }));
}

// const updateItemInList = createListUpdater(idKey);
// const updateInstance = (state, instance) => state.getIn([ "instance", idKey ]) === instance[ idKey ]
// 	? state.mergeIn([ "instance" ], instance)
// 	: state;

const initialState = Map({
	list: List(),
  alertMetricId: null,
  // instance: null,
	instance: FilterSeries({ filter: new Filter({ filters: [] }) }),
});

// Metric - Series - [] - filters
function reducer(state = initialState, action = {}) {
	switch (action.type) {
    case EDIT:
      return state.set('instance', FilterSeries(action.instance));
    case success(SAVE):
      return state.set([ 'instance' ], CustomMetric(action.data));
    case success(REMOVE):
      console.log('action', action)
      return state.update('list', list => list.filter(item => item.metricId !== action.id));
		case success(FETCH):
			return state.set("instance", ErrorInfo(action.data));
		case success(FETCH_LIST):
			const { data } = action;
			return state.set("list", List(data.map(CustomMetric)));
	}
	return state;
}

export default mergeReducers(
	reducer,
	createRequestReducer({
		[ ROOT_KEY ]: FETCH_LIST,
		fetch: FETCH,
	}),
);


const filterMap = ({value, type, key, operator, source, custom, isEvent }) => ({
  value: Array.isArray(value) ? value: [value],
  custom,
  type: key,
  key, operator,
  source,
  isEvent
});

const reduceThenFetchResource = actionCreator => (...args) => (dispatch, getState) => {
  dispatch(actionCreator(...args));
  const filter = getState().getIn([ 'search', 'instance', 'filter' ]).toData();
  filter.filters = filter.filters.map(filterMap);
  // console.log('filter', filter)
  
  // let filter = appliedFilter
  //   .update('filters', list => list.map(f => f.set('value', f.value || '*'))
  //   .map(filterMap));

  // const filter.filters = getState().getIn([ 'instance', 'filter' ]).get('filters').map(filterMap).toJS();

  return isRoute(ERRORS_ROUTE, window.location.pathname)
    ? dispatch(fetchErrorsList(filter))
    : dispatch(fetchSessionList(filter));
};

export const edit = reduceThenFetchResource((instance) => ({
    type: EDIT,
    instance,
}));

export const remove = createRemove(name);

// export const applyFilter = reduceThenFetchResource((filter, fromUrl=false) => ({
//   type: APPLY,
//   filter,
//   fromUrl,
// }));

export const updateSeries = (index, series) => ({
  type: UPDATE,
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
    call: client => client.post( `/${ name }s`, instance.toSaveData()),
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