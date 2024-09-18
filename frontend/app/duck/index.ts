// @ts-ignore
import { combineReducers } from 'redux-immutable';

import user from './user';
import sessions from './sessions';
import sources from './sources';
import site from './site';
import customFields from './customField';
import search from './search';
import liveSearch from './liveSearch';

const rootReducer = combineReducers({
  user,
  sessions,
  site,
  customFields,
  search,
  liveSearch,
  ...sources
});

export type RootStore = ReturnType<typeof rootReducer>

export default rootReducer;
