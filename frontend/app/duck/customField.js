import { List, Map } from 'immutable';
import CustomField from 'Types/customField';
import { fetchListType, saveType, editType, initType, removeType } from './funcTools/crud/types';
import { createItemInListUpdater, mergeReducers, success, array } from './funcTools/tools';
import { createEdit, createInit } from './funcTools/crud';
import { createRequestReducer } from './funcTools/request';
import { addElementToFiltersMap, addElementToLiveFiltersMap, clearMetaFilters } from 'Types/filter/newFilter';
import { FilterCategory } from '../types/filter/filterType';
import { refreshFilterOptions } from './search';

const name = 'integration/variable';
const idKey = 'index';
const itemInListUpdater = createItemInListUpdater(idKey);

const FETCH_LIST = fetchListType(name);
const FETCH_LIST_ACTIVE = fetchListType(name + '_ACTIVE');
const SAVE = saveType(name);
const UPDATE = saveType(name);
const EDIT = editType(name);
const REMOVE = removeType(name);
const INIT = initType(name);
const FETCH_SOURCES = fetchListType('integration/sources');

const FETCH_SUCCESS = success(FETCH_LIST);
const FETCH_LIST_ACTIVE_SUCCESS = success(FETCH_LIST_ACTIVE);
const SAVE_SUCCESS = success(SAVE);
const UPDATE_SUCCESS = success(UPDATE);
const REMOVE_SUCCESS = success(REMOVE);
const FETCH_SOURCES_SUCCESS = success(FETCH_SOURCES);

// const defaultMeta = [{key: 'user_id', index: 0}, {key: 'user_anonymous_id', index: 0}];
const initialState = Map({
  list: List(),
  instance: CustomField(),
  sources: List(),
  optionsReady: false,
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case FETCH_SUCCESS:
      return state.set('list', List(action.data).map(CustomField))
    case FETCH_LIST_ACTIVE_SUCCESS:
      clearMetaFilters();
      action.data.forEach((item) => {
        addElementToFiltersMap(FilterCategory.METADATA, item.key);
        addElementToLiveFiltersMap(FilterCategory.METADATA, item.key);
      });
      return state.set('list', List(action.data).map(CustomField))

    case FETCH_SOURCES_SUCCESS:
      return state.set(
        'sources',
        List(action.data.map(({ value, ...item }) => ({ label: value, key: value, ...item }))).map(
          CustomField
        )
      );
    case SAVE_SUCCESS:
    case UPDATE_SUCCESS:
      return state.update('list', itemInListUpdater(CustomField(action.data)));
    case REMOVE_SUCCESS:
      return state.update('list', (list) => list.filter((item) => item.index !== action.index));
    case INIT:
      return state.set('instance', CustomField(action.instance));
    case EDIT:
      return state.mergeIn(['instance'], action.instance);
    default:
      return state;
  }
};

export const edit = createEdit(name);
export const init = createInit(name);

export const fetchList = (siteId) => (dispatch, getState) => {
  return dispatch({
    types: array(FETCH_LIST),
    call: (client) => client.get(siteId ? `/${siteId}/metadata` : '/metadata'),
  })
};

export const fetchListActive = (siteId) => (dispatch, getState) => {
  return dispatch({
    types: array(FETCH_LIST_ACTIVE),
    call: (client) => client.get(siteId ? `/${siteId}/metadata` : '/metadata'),
  }).then(() => {
    dispatch(refreshFilterOptions());
  });
};

export const fetchSources = () => {
  return {
    types: array(FETCH_SOURCES),
    call: (client) => client.get('/integration/sources'),
  };
};

export const save = (siteId, instance) => {
  const url = instance.exists() ? `/${siteId}/metadata/${instance.index}` : `/${siteId}/metadata`;
  return {
    types: array(instance.exists() ? SAVE : UPDATE),
    call: (client) => client.post(url, instance.toData()),
  };
};

export const remove = (siteId, index) => {
  return {
    types: array(REMOVE),
    call: (client) => client.delete(`/${siteId}/metadata/${index}`),
    index,
  };
};

export default mergeReducers(
  reducer,
  createRequestReducer({
    fetchRequest: FETCH_LIST,
    fetchRequestActive: FETCH_LIST_ACTIVE,
    saveRequest: SAVE,
  })
);
