import Site from 'Types/site';
import GDPR from 'Types/site/gdpr';
import { 
	mergeReducers,
	createItemInListUpdater,
	success,
	array
} from './funcTools/tools';
import { 
	createCRUDReducer, 
	getCRUDRequestTypes,
	createFetchList,
	createInit,
	createEdit,
	createRemove,
	createUpdate,
	createSave,
} from './funcTools/crud';
import { createRequestReducer } from './funcTools/request';
import { Map, List, fromJS } from "immutable";

const SITE_ID_STORAGE_KEY = "__$user-siteId$__";
const storedSiteId = localStorage.getItem(SITE_ID_STORAGE_KEY);

const name = 'project';
const idKey = 'id';
const itemInListUpdater = createItemInListUpdater(idKey)

const EDIT_GDPR = 'sites/EDIT_GDPR';
const SAVE_GDPR = 'sites/SAVE_GDPR';
const FETCH_GDPR = 'sites/FETCH_GDPR';
const FETCH_LIST = 'sites/FETCH_LIST';
const SET_SITE_ID = 'sites/SET_SITE_ID';
const FETCH_GDPR_SUCCESS = success(FETCH_GDPR);
const SAVE_GDPR_SUCCESS = success(SAVE_GDPR);
const FETCH_LIST_SUCCESS = success(FETCH_LIST);

const initialState = Map({
	list: List(),
	instance: fromJS(),
	remainingSites: undefined,
	siteId: null,
});

const reducer = (state = initialState, action = {}) => {
	switch(action.type) {
		case EDIT_GDPR:
			return state.mergeIn([ 'instance', 'gdpr' ], action.gdpr);
		case FETCH_GDPR_SUCCESS:
			return state.mergeIn([ 'instance', 'gdpr' ], action.data);
		case SAVE_GDPR_SUCCESS:
			const gdpr = GDPR(action.data);
			return state.setIn([ 'instance', 'gdpr' ], gdpr);
		case FETCH_LIST_SUCCESS:
			let siteId = state.get("siteId");
			if (!siteId) {
				siteId = !!action.data.find(s => s.projectId === storedSiteId) 
				? storedSiteId 
				: action.data[0].projectId;
			}
			console.log('siteId asd', siteId)
			return state.set('list', List(action.data.map(Site))).set('siteId', siteId);
		case SET_SITE_ID:
			localStorage.setItem(SITE_ID_STORAGE_KEY, action.siteId)
			return state.set('siteId', action.siteId);
	}
	return state;
};

export function editGDPR(gdpr) {
  return {
    type: EDIT_GDPR,
    gdpr,
  };
}

export function fetchGDPR(siteId) {
  return {
    types: array(FETCH_GDPR),
    call: client => client.get(`/${ siteId }/gdpr`),
  }
}

export function saveGDPR(siteId, gdpr) {
  return {
    types: array(SAVE_GDPR),
    call: client => client.post(`/${ siteId }/gdpr`, gdpr.toData()),
  };
}

export function fetchList() {
	return {
		types: array(FETCH_LIST),
		call: client => client.get('/projects'),
	};
}

// export const fetchList = createFetchList(name);
export const init = createInit(name);
export const edit = createEdit(name);
export const save = createSave(name);
export const update = createUpdate(name);
export const remove = createRemove(name);

export function setSiteId(siteId) {
	return {
	  type: SET_SITE_ID,
	  siteId,
	};
  }

export default mergeReducers(
	reducer,
	createCRUDReducer(name, Site, idKey),
	createRequestReducer({
		saveGDPR: SAVE_GDPR,
		...getCRUDRequestTypes(name),
	}),
);

