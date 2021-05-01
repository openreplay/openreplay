import { List, Map } from 'immutable';
import Notification from 'Types/notification';
import { mergeReducers, success, array, request, createListUpdater } from './funcTools/tools';
import { createRequestReducer } from './funcTools/request';
import { 
	createCRUDReducer, 
	getCRUDRequestTypes,
	createFetchList,
} from './funcTools/crud';

const name = 'notification';
const idKey = 'notificationId';
const SET_VIEWED = 'notifications/SET_VIEWED';
const CLEAR_ALL = 'notifications/CLEAR_ALL';
const SET_VIEWED_SUCCESS = success(SET_VIEWED);
const CLEAR_ALL_SUCCESS = success(CLEAR_ALL);

const listUpdater = createListUpdater(idKey);

const initialState = Map({
  list: List(),
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case SET_VIEWED_SUCCESS:
      if (!action.data) return state;
      const item = state.get('list').find(item => item[ idKey ] === action.id)
      return listUpdater(state, Notification({...item.toJS(), createdAt: item.createdAt.ts, viewed: true }));
    case CLEAR_ALL_SUCCESS:
      if (!action.data) return state;
      return state.update('list', list => list.map(l => Notification({...l.toJS(), createdAt: l.createdAt.ts, viewed: true })))
  }
  return state;
};

export const fetchList = createFetchList(name);

export default mergeReducers(
	reducer,
	createCRUDReducer(name, Notification, idKey),
	createRequestReducer({
    setViewed: SET_VIEWED,
    clearAll: CLEAR_ALL,
		...getCRUDRequestTypes(name),
	}),
);

export function setViewed(id) {
  return {
    types: array(SET_VIEWED),
    call: client => client.get(`/notifications/${ id }/view`),
    id,
  };
}

export function clearAll(params) {
  return {
    types: array(CLEAR_ALL),
    call: client => client.post('/notifications/view', params),
  };
}

