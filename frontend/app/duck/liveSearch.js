import { List, Map } from 'immutable'; 
import { fetchListType, fetchType, editType } from './funcTools/crud';
import { createRequestReducer } from './funcTools/request';
import { mergeReducers, success } from './funcTools/tools';
import Filter from 'Types/filter';
import { liveFiltersMap, filtersMap } from 'Types/filter/newFilter';
import { filterMap, checkFilterValue, hasFilterApplied } from './search';
import Session from 'Types/session';

const name = "liveSearch";
const idKey = "searchId";

const FETCH_FILTER_SEARCH = fetchListType(`${name}/FILTER_SEARCH`);
const FETCH = fetchType(name);
const EDIT = editType(name);
const CLEAR_SEARCH = `${name}/CLEAR_SEARCH`;
const APPLY = `${name}/APPLY`;
const UPDATE_CURRENT_PAGE = `${name}/UPDATE_CURRENT_PAGE`;
const FETCH_SESSION_LIST = fetchListType(`${name}/FETCH_SESSION_LIST`);

const initialState = Map({
	list: List(),
	instance: new Filter({ filters: [], sort: '' }),
  filterSearchList: {},
  currentPage: 1,
});

function reducer(state = initialState, action = {}) {
	switch (action.type) {
    case APPLY:
      return state.mergeIn(['instance'], action.filter);
    case EDIT:
      return state.mergeIn(['instance'], action.instance).set('currentPage', 1);
    case UPDATE_CURRENT_PAGE:
      return state.set('currentPage', action.page);
    case success(FETCH_SESSION_LIST):
      const { sessions, total } = action.data;
      const list = List(sessions).map(Session);
      return state
        .set('list', list)
        .set('total', total);
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
      return state.set('filterSearchList', groupedList);
	}
	return state;
}

export default mergeReducers(
	reducer,
	createRequestReducer({
		fetch: FETCH,
    fetchList: FETCH_SESSION_LIST,
    fetchFilterSearch: FETCH_FILTER_SEARCH
	}),
);

const reduceThenFetchResource = actionCreator => (...args) => (dispatch, getState) => {
  dispatch(actionCreator(...args));
  const filter = getState().getIn([ 'liveSearch', 'instance']).toData();
  filter.filters = filter.filters.map(filterMap);
  filter.limit = 10;
  filter.page = getState().getIn([ 'liveSearch', 'currentPage']);

  return dispatch(fetchSessionList(filter));
};

export const fetchSessionList = (filter) => {
  return {
    types: FETCH_SESSION_LIST.array,
    call: client => client.post('/assist/sessions', filter),
  }
}

export const edit = reduceThenFetchResource((instance) => ({
  type: EDIT,
  instance,
}));

export const applyFilter = reduceThenFetchResource((filter) => ({
  type: APPLY,
  filter,
}));

export const fetchSessions = (filter) => (dispatch, getState) => {
  const _filter = filter ? filter : getState().getIn([ 'liveSearch', 'instance']);
  return dispatch(applyFilter(_filter));
};

export const clearSearch = () => (dispatch, getState) => {
  dispatch(edit(new Filter({ filters: [], sort: 'timestamp' })));
  return dispatch({
    type: CLEAR_SEARCH,
  });
}

export const addFilter = (filter) => (dispatch, getState) => {
  filter.value = checkFilterValue(filter.value);
  const instance = getState().getIn([ 'liveSearch', 'instance']);

  if (hasFilterApplied(instance.filters, filter)) {
    // const index = instance.filters.findIndex(f => f.key === filter.key);
    // const oldFilter = instance.filters.get(index);
    // oldFilter.value = oldFilter.value.concat(filter.value);
    // return dispatch(edit(instance.setIn(['filters', index], oldFilter)));
  } else {
    const filters = instance.filters.push(filter);
    return dispatch(edit(instance.set('filters', filters)));
  }
}

export const addFilterByKeyAndValue = (key, value, operator = undefined) => (dispatch, getState) => {
  let defaultFilter = liveFiltersMap[key];
  defaultFilter.value = value;
  if (operator) {
    defaultFilter.operator = operator;
  }
  dispatch(addFilter(defaultFilter));
}

export const updateCurrentPage = reduceThenFetchResource((page, fromUrl=false) => ({
  type: UPDATE_CURRENT_PAGE,
  page,
}));

export function fetchFilterSearch(params) {
  params.live = true
  return {
    types: FETCH_FILTER_SEARCH.array,
    call: client => client.get('/events/search', params),
    params,
  };
}