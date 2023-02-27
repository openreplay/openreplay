import { List, Map } from 'immutable';
import RehydrateJob from 'Types/rehydrateJob';

import { mergeReducers } from './funcTools/tools';
import { createRequestReducer } from './funcTools/request';
import { 
	createCRUDReducer, 
	getCRUDRequestTypes,
	createFetchList,
	createInit,
	createEdit,
	createRemove,
	createSave,
} from './funcTools/crud';

const name = 'rehydration';
const idKey = 'rehydrationId';


const SET_ACTIVE_TAB = 'steps/SET_ACTIVE_TAB';

const initialState = Map({
  activeJob: Map(),
  list: List()
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case SET_ACTIVE_TAB:
      return state.set('activeJob', RehydrateJob(action.instance));
  }
  return state;
};

export function setActiveTab(instance) {
  return {
    type: SET_ACTIVE_TAB,
    instance,
  };
}

export const fetchList = createFetchList(name);
export const init = createInit(name);
export const edit = createEdit(name);
export const save = createSave(name);
export const remove = createRemove(name);

export default mergeReducers(
	reducer,
	createCRUDReducer(name, RehydrateJob, idKey),
	createRequestReducer({
		...getCRUDRequestTypes(name),
	}),
);