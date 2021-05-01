import { Map } from 'immutable';
import { saveType, fetchType, editType } from './funcTools/crud/types';
import { mergeReducers, success, array } from './funcTools/tools';
import { createRequestReducer } from './funcTools/request';

const name = 'config'

const FETCH = fetchType(name);
const SAVE = saveType(name);
const EDIT = editType(name);

const FETCH_SUCCESS = success(FETCH);
const SAVE_SUCCESS = success(SAVE);

const initialState = Map({
  options: {
    weeklyReport: false
  },
});

const reducer = (state = initialState, action = {}) => {
  switch(action.type) {
    case FETCH_SUCCESS:
      return state.set('options', action.data)
		case SAVE_SUCCESS:
      return state
    case EDIT:
      return state.set('options', action.config)
    default:
      return state;
  }
}

export const fetch = () => {
  return {
    types: array(FETCH),
    call: client => client.get(`/config/weekly_report`),
  }
}

export const save = (config) => {
  return {
    types: array(SAVE),
    call: client => client.post(`/config/weekly_report`, config),
  }
}

export const edit = (config) => {
  return {
    type: EDIT,
    config    
  }
}

export default mergeReducers(
	reducer,
	createRequestReducer({
    fetchRequest: FETCH,
    saveRequest: SAVE,
  }),	
)