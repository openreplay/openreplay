import { List, Map } from 'immutable'; 
import { fetchType, editType } from './funcTools/crud';
import { createRequestReducer } from './funcTools/request';
import { mergeReducers } from './funcTools/tools';
import Filter from 'Types/filter';
import SavedFilter from 'Types/filter/savedFilter';
import { fetchList as fetchSessionList } from './sessions';
import { filtersMap } from 'Types/filter/newFilter';
import { filterMap, checkFilterValue, hasFilterApplied } from './search';

const name = "liveSearch";
const idKey = "searchId";

const FETCH = fetchType(name);
const EDIT = editType(name);
const CLEAR_SEARCH = `${name}/CLEAR_SEARCH`;
const APPLY = `${name}/APPLY`;

const initialState = Map({
	list: List(),
	instance: new Filter({ filters: [] }),
  filterSearchList: {},
});


function reducer(state = initialState, action = {}) {
	switch (action.type) {
    case EDIT:
      return state.mergeIn(['instance'], action.instance);
	}
	return state;
}

export default mergeReducers(
	reducer,
	createRequestReducer({
		fetch: FETCH,
	}),
);

const reduceThenFetchResource = actionCreator => (...args) => (dispatch, getState) => {
  dispatch(actionCreator(...args));
  const filter = getState().getIn([ 'search', 'instance']).toData();
  filter.filters = filter.filters.map(filterMap);

  return dispatch(fetchSessionList(filter));
};

export const edit = reduceThenFetchResource((instance) => ({
    type: EDIT,
    instance,
}));

export const applyFilter = reduceThenFetchResource((filter, fromUrl=false) => ({
  type: APPLY,
  filter,
  fromUrl,
}));

export const fetchSessions = (filter) => (dispatch, getState) => {
  const _filter = filter ? filter : getState().getIn([ 'search', 'instance']);
  return dispatch(applyFilter(_filter));
};

export const clearSearch = () => (dispatch, getState) => {
  // dispatch(applySavedSearch(new SavedFilter({})));
  dispatch(edit(new Filter({ filters: [] })));
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

export const addFilterByKeyAndValue = (key, value) => (dispatch, getState) => {
  let defaultFilter = filtersMap[key];
  defaultFilter.value = value;
  dispatch(addFilter(defaultFilter));
}
