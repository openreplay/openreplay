import { Map, List } from 'immutable';
import { 
  initType,  
  fetchType, 
  fetchListType, 
  fetchToListType, 
  saveType, 
  editType, 
  removeType,
} from './types';
import {
  success,
  createItemInListUpdater,
} from '../tools';


export const getCRUDRequestTypes = name => ({
  _: fetchListType(name),
  fetchList: fetchListType(name),
  fetchToList: fetchToListType(name),
  save: saveType(name),
  remove: removeType(name),
  fetch: fetchType(name),
});

export const getCRUDInitialState = fromJS =>  Map({
  list: List(),
  instance: fromJS(),
});
export const createCRUDReducer = (name, fromJS = r => r, idKey = `${ name }Id`) => {
  const itemInListUpdater = createItemInListUpdater(idKey);
  const initialState = getCRUDInitialState(fromJS);
  const FETCH_SUCCESS = success(fetchType(name));
  const FETCH_LIST_SUCCESS = success(fetchListType(name));
  const FETCH_TO_LIST_SUCCESS = success(fetchToListType(name));
  const INIT = initType(name);
  const SAVE_SUCCESS = success(saveType(name));
  const EDIT = editType(name);
  const REMOVE_SUCCESS = success(removeType(name));
  return (state = initialState, action = {}) => {
    switch (action.type) {
      case FETCH_LIST_SUCCESS:
        // TODO: use OreredMap by id & merge;
        return state.set('list', List(action.data).map(fromJS));
      case FETCH_TO_LIST_SUCCESS:
        return updateList(state, fromJS(action.data));
      case INIT:
        return state.set('instance', fromJS(action.instance));
      case SAVE_SUCCESS:
      case FETCH_SUCCESS: {
        const instance = fromJS(action.data);
        return state
          .update('list', itemInListUpdater(instance))
          .set('instance', instance);
      }
      case EDIT:
        return state.mergeIn([ 'instance' ], action.instance);
      case REMOVE_SUCCESS:
        return state
          .update('list', list => list.filter(item => item[ idKey ] !== action.id))
          .updateIn([ 'instance', idKey ], id => (id === action.id ? '' : id));
      default:
        return state;
    }
  };
}
