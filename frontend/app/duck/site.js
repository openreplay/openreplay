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

const trackerVersion = window.ENV.TRACKER_VERSION
const name = 'project';
const idKey = 'id';
const itemInListUpdater = createItemInListUpdater(idKey)

const EDIT_GDPR = 'sites/EDIT_GDPR';
const SAVE_GDPR = 'sites/SAVE_GDPR';
const FETCH_GDPR = 'sites/FETCH_GDPR';
const FETCH_GDPR_SUCCESS = success(FETCH_GDPR);
const SAVE_GDPR_SUCCESS = success(SAVE_GDPR);

const initialState = Map({
	list: List(),
	instance: fromJS(),
	remainingSites: undefined,
});

const reducer = (state = initialState, action = {}) => {
	switch(action.type) {
		case EDIT_GDPR:
			return state.mergeIn([ 'instance', 'gdpr' ], action.gdpr);
		case FETCH_GDPR_SUCCESS:
			return state.mergeIn([ 'instance', 'gdpr' ], action.data);
		case SAVE_GDPR_SUCCESS:
			const gdpr = GDPR(action.data);
			return state.update('list', itemInListUpdater({
		  	[ idKey ] : state.getIn([ 'instance', idKey ]),
		  	gdpr,
		  })).setIn([ 'instance', 'gdpr' ], gdpr);
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

export const fetchList = createFetchList(name, `/${ name }s?last_tracker_version=${ trackerVersion }`);
export const init = createInit(name);
export const edit = createEdit(name);
export const save = createSave(name);
export const update = createUpdate(name);
export const remove = createRemove(name);

export default mergeReducers(
	reducer,
	createCRUDReducer(name, Site, idKey),
	createRequestReducer({
		saveGDPR: SAVE_GDPR,
		...getCRUDRequestTypes(name),
	}),
);

