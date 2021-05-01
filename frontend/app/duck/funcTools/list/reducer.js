import { Map, List } from 'immutable';
import {
  fetchListType,
  editInListType,
} from './types';
import { success } from '../tools';


const listInitialState = Map({
	list: List(),
});

export const getListInitialState = () => listInitialState;

export const createListReducer = (name, fromJS = r => r, idKey = `${ name }Id`) => {
  const FETCH_LIST_SUCCESS = success(fetchListType(name));
  const EDIT_IN_LIST = editInListType(name);
  return (state = listInitialState, action = {}) => {
    switch (action.type) {
      case FETCH_LIST_SUCCESS:
        return state.set('list', List(action.data).map(fromJS));
      case EDIT_IN_LIST:
      	const itemIndex = state.get('list').findIndex(item => item[ idKey ] === action.item[ idKey ])
      	return state.mergeIn([ 'list', itemIndex ], action.item);
      default:
        return state;
    }
  };
}
