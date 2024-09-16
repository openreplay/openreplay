// @ts-ignore
import { combineReducers } from 'redux-immutable';

import user from './user';
import sessions from './sessions';
import filters from './filters';
import funnelFilters from './funnelFilters';
import sources from './sources';
import site from './site';
import customFields from './customField';
import integrations from './integrations';
import funnels from './funnels';
import customMetrics from './customMetrics';
import search from './search';
import liveSearch from './liveSearch';

const rootReducer = combineReducers({
  user,
  sessions,
  filters,
  funnelFilters,
  site,
  customFields,
  funnels,
  customMetrics,
  search,
  liveSearch,
  ...integrations,
  ...sources,
});

export type RootStore = ReturnType<typeof rootReducer>

export default rootReducer