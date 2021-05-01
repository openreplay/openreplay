import { List, Map } from 'immutable';
import Announcement from 'Types/announcement';
import { RequestTypes } from './requestStateCreator';

import { mergeReducers } from './funcTools/tools';
import { createRequestReducer } from './funcTools/request';
import { 
	createCRUDReducer, 
	getCRUDRequestTypes,
	createFetchList
} from './funcTools/crud';

const name = 'announcement';
const idKey = 'id';

const SET_LAST_READ = new RequestTypes('announcement/SET_LAST_READ');

const initialState = Map({
  list: List()
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case SET_LAST_READ.SUCCESS:
      return state.update('list', (list) => list.map(i => ({...i.toJS(), viewed: true })));
  }
  return state;
};

export function setLastRead() {
  return {
    types: SET_LAST_READ.toArray(),
    call: client => client.get(`/announcements/view`),
  };
}

export const fetchList = createFetchList(name);

export default mergeReducers(
	reducer,
	createCRUDReducer(name, Announcement, idKey),
	createRequestReducer({
		...getCRUDRequestTypes(name),
	}),
);