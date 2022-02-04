import { List, Map } from 'immutable'; 
import { fetchListType, fetchType, saveType, removeType, editType, createRemove } from './funcTools/crud';
import { createRequestReducer, ROOT_KEY } from './funcTools/request';
import { array, request, success, failure, createListUpdater, mergeReducers } from './funcTools/tools';
import Filter from 'Types/filter';
import SavedFilter from 'Types/filter/savedFilter';
import { errors as errorsRoute, isRoute } from "App/routes";
import { fetchList as fetchSessionList } from './sessions';
import { fetchList as fetchErrorsList } from './errors';

const ERRORS_ROUTE = errorsRoute();

const name = "search";
const idKey = "searchId";

const FETCH_LIST = fetchListType(name);
const FETCH_FILTER_SEARCH = fetchListType(`${name}/FILTER_SEARCH`);
const FETCH = fetchType(name);
const SAVE = saveType(name);
const EDIT = editType(name);
const REMOVE = removeType(name);
const ADD_FILTER = `${name}/ADD_FILTER`;
const APPLY_SAVED_SEARCH = `${name}/APPLY_SAVED_SEARCH`;
const CLEAR_SEARCH = `${name}/CLEAR_SEARCH`;
const UPDATE = `${name}/UPDATE`;
const APPLY = `${name}/APPLY`;
const SET_ALERT_METRIC_ID = `${name}/SET_ALERT_METRIC_ID`;

function chartWrapper(chart = []) {
  return chart.map(point => ({ ...point, count: Math.max(point.count, 0) }));
}

const savedSearchIdKey = 'searchId'
const updateItemInList = createListUpdater(savedSearchIdKey);
const updateInstance = (state, instance) => state.getIn([ "savedSearch", savedSearchIdKey ]) === instance[savedSearchIdKey]
	? state.mergeIn([ "savedSearch" ], instance)
	: state;

const initialState = Map({
	list: List(),
  alertMetricId: null,
	instance: new Filter({ filters: [] }),
  savedSearch: null,
  filterSearchList: {},
});

// Metric - Series - [] - filters
function reducer(state = initialState, action = {}) {
	switch (action.type) {
    case EDIT:
      return state.mergeIn(['instance'], action.instance);
    case APPLY:
      return action.fromUrl 
        ? state.set('instance', Filter(action.filter))
        : state.mergeIn(['instance'], action.filter);
    case success(SAVE):
      return updateItemInList(updateInstance(state, action.data), action.data);
    case success(REMOVE):
      return state.update('list', list => list.filter(item => item.searchId !== action.id));
		case success(FETCH):
			return state.set("instance", action.data);
		case success(FETCH_LIST):
			const { data } = action;
			return state.set("list", List(data.map(SavedFilter)));
    case success(FETCH_FILTER_SEARCH):
      const groupedList = action.data.reduce((acc, item) => {
        const { projectId, type, value } = item;
        const key = type;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push({ projectId, value });
        return acc;
      }, {});
      console.log('groupedList', groupedList);
      return state.set('filterSearchList', groupedList);
    case APPLY_SAVED_SEARCH:
      return state.set('savedSearch', action.filter);
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

const filterMap = ({value, key, operator, sourceOperator, source, custom, isEvent }) => ({
  value: value.filter(i => i !== '' && i !== null),
  custom,
  type: key,
  // key,
  operator,
  source,
  sourceOperator,
  isEvent
});

const reduceThenFetchResource = actionCreator => (...args) => (dispatch, getState) => {
  dispatch(actionCreator(...args));
  const filter = getState().getIn([ 'search', 'instance']).toData();
  filter.filters = filter.filters.map(filterMap);
  filter.isNew = true  // TODO remove this line

  return isRoute(ERRORS_ROUTE, window.location.pathname)
    ? dispatch(fetchErrorsList(filter))
    : dispatch(fetchSessionList(filter));
};

export const edit = reduceThenFetchResource((instance) => ({
    type: EDIT,
    instance,
}));

export const remove = createRemove(name, (id) => `/saved_search/${id}`);

export const applyFilter = reduceThenFetchResource((filter, fromUrl=false) => ({
  type: APPLY,
  filter,
  fromUrl,
}));

export const applySavedSearch = (filter) => (dispatch, getState) => {
  dispatch(edit(filter ? filter.filter : new Filter({ filters: []})));
  return dispatch({
    type: APPLY_SAVED_SEARCH,
    filter,
  })
};

export const fetchSessions = (filter) => (dispatch, getState) => {
  const _filter = filter ? filter : getState().getIn([ 'search', 'instance']);
  return dispatch(applyFilter(_filter));
};

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

export function save(id, name, instance) {
  instance = instance instanceof SavedFilter ? instance : new SavedFilter(instance);
  return {
    types: SAVE.array,
    call: client => client.post(!id ? '/saved_search' : `/saved_search/${id}`, {
      name: name,
      filter: instance.toSaveData(),
    }),
    instance,
  };
}

export function fetchList() {
  return {
    types: array(FETCH_LIST),
    call: client => client.get(`/saved_search`),
  };
}

export function setAlertMetricId(id) {
  return {
    type: SET_ALERT_METRIC_ID,
    id,
  };
}

export function fetchFilterSearch(params) {
  return {
    types: FETCH_FILTER_SEARCH.array,
    call: client => client.get('/events/search', params),
    params,
  };
}

export const clearSearch = () => (dispatch, getState) => {
  dispatch(applySavedSearch(null));
  dispatch(edit(new Filter({ filters: [] })));
  return dispatch({
    type: CLEAR_SEARCH,
  });
}

export const addFilter = (filter) => (dispatch, getState) => {
  filter.value = filter.value && filter.value.length === 0 ? filter.value : [''];
  const instance = getState().getIn([ 'search', 'instance']);
  const filters = instance.filters.push(filter);
  return dispatch(edit(instance.set('filters', filters)));
}