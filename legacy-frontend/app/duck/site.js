import Site from 'Types/site';
import GDPR from 'Types/site/gdpr';
import {
  mergeReducers,
  createItemInListUpdater,
  success,
  array,
  createListUpdater
} from './funcTools/tools';
import {
  createCRUDReducer,
  getCRUDRequestTypes,
  createInit,
  createEdit,
  createRemove,
  createUpdate,
  saveType
} from './funcTools/crud';
import { createRequestReducer } from './funcTools/request';
import { Map, List, fromJS } from 'immutable';
import { GLOBAL_HAS_NO_RECORDINGS, SITE_ID_STORAGE_KEY } from 'App/constants/storageKeys';

const storedSiteId = localStorage.getItem(SITE_ID_STORAGE_KEY);

const name = 'project';
const idKey = 'id';
const itemInListUpdater = createItemInListUpdater(idKey);
const updateItemInList = createListUpdater(idKey);

const EDIT_GDPR = 'sites/EDIT_GDPR';
const SAVE_GDPR = 'sites/SAVE_GDPR';
const FETCH_GDPR = 'sites/FETCH_GDPR';
const FETCH_LIST = 'sites/FETCH_LIST';
const SET_SITE_ID = 'sites/SET_SITE_ID';
const FETCH_GDPR_SUCCESS = success(FETCH_GDPR);
const SAVE_GDPR_SUCCESS = success(SAVE_GDPR);
const FETCH_LIST_SUCCESS = success(FETCH_LIST);
const SAVE = saveType('sites/SAVE');

const UPDATE_PROJECT_RECORDING_STATUS = 'sites/UPDATE_PROJECT_RECORDING_STATUS';

const initialState = Map({
  list: List(),
  instance: fromJS(),
  remainingSites: undefined,
  siteId: null,
  active: null
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case EDIT_GDPR:
      return state.mergeIn(['instance', 'gdpr'], action.gdpr);
    case FETCH_GDPR_SUCCESS:
      return state.mergeIn(['instance', 'gdpr'], action.data);
    case success(SAVE):
      const newSite = Site(action.data);
      return updateItemInList(state, newSite)
        .set('siteId', newSite.get('id'))
        .set('active', newSite);
    case SAVE_GDPR_SUCCESS:
      const gdpr = GDPR(action.data);
      return state.setIn(['instance', 'gdpr'], gdpr);
    case FETCH_LIST_SUCCESS:
      let siteId = state.get('siteId');
      const siteIds = action.data.map(s => parseInt(s.projectId));
      const siteExists = siteIds.includes(siteId);
      if (action.siteIdFromPath && siteIds.includes(parseInt(action.siteIdFromPath))) {
        siteId = action.siteIdFromPath;
      } else if (!siteId || !siteExists) {
        siteId = siteIds.includes(parseInt(storedSiteId))
          ? storedSiteId
          : action.data[0].projectId;
      }
      const list = List(action.data.map(Site));
      const hasRecordings = list.some(s => s.recorded);
      if (!hasRecordings) {
        localStorage.setItem(GLOBAL_HAS_NO_RECORDINGS, true);
      } else {
        localStorage.removeItem(GLOBAL_HAS_NO_RECORDINGS);
      }

      return state.set('list', list)
        .set('siteId', siteId)
        .set('active', list.find(s => parseInt(s.id) === parseInt(siteId)));
    case SET_SITE_ID:
      const _siteId = action.siteId ? action.siteId : state.get('list').get(0).id;
      localStorage.setItem(SITE_ID_STORAGE_KEY, _siteId);
      const site = state.get('list').find(s => parseInt(s.id) == _siteId);
      return state.set('siteId', _siteId).set('active', site);
    case UPDATE_PROJECT_RECORDING_STATUS:
      const { siteId: _siteIdToUpdate, status } = action;
      const siteToUpdate = state.get('list').find(s => parseInt(s.id) === parseInt(_siteIdToUpdate));
      const updatedSite = siteToUpdate.set('recorded', status);
      return updateItemInList(state, updatedSite);
  }
  return state;
};

export function editGDPR(gdpr) {
  return {
    type: EDIT_GDPR,
    gdpr
  };
}

export function fetchGDPR(siteId) {
  return {
    types: array(FETCH_GDPR),
    call: client => client.get(`/${siteId}/gdpr`)
  };
}

export const saveGDPR = (siteId, gdpr) => (dispatch, getState) => {
  const g = getState().getIn(['site', 'instance', 'gdpr']);
  return dispatch({
    types: array(SAVE_GDPR),
    call: client => client.post(`/${siteId}/gdpr`, g.toData())
  });
};

export function fetchList(siteId) {
  return {
    types: array(FETCH_LIST),
    call: client => client.get('/projects'),
    siteIdFromPath: siteId
  };
}

export function save(site) {
  return {
    types: array(SAVE),
    call: client => client.post(`/projects`, site.toData())
  };
}

// export const fetchList = createFetchList(name);
export const init = createInit(name);
export const edit = createEdit(name);
// export const save = createSave(name);
export const update = createUpdate(name);
export const remove = createRemove(name);

export function setSiteId(siteId) {
  return {
    type: SET_SITE_ID,
    siteId
  };
}

export const updateProjectRecordingStatus = (siteId, status) => {
  return {
    type: UPDATE_PROJECT_RECORDING_STATUS,
    siteId,
    status
  };
};

export default mergeReducers(
  reducer,
  createCRUDReducer(name, Site, idKey),
  createRequestReducer({
    saveGDPR: SAVE_GDPR,
    ...getCRUDRequestTypes(name)
  })
);

