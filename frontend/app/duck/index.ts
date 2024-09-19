// @ts-ignore
import { combineReducers } from 'redux-immutable';

import user from './user';
import sessions from './sessions';
import customFields from './customField';
import search from './search';
import liveSearch from './liveSearch';

const rootReducer = combineReducers({
  user,
  sessions,
  customFields,
  search,
  liveSearch,
});

export type RootStore = ReturnType<typeof rootReducer>

export default rootReducer;
