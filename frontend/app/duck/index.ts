// @ts-ignore
import { combineReducers } from 'redux-immutable';

import user from './user';
import sessions from './sessions';
import assignments from './assignments';
import filters from './filters';
import funnelFilters from './funnelFilters';
import templates from './templates';
import dashboard from './dashboard';
import components from './components';
import sources from './sources';
import members from './member';
import site from './site';
import customFields from './customField';
import integrations from './integrations';
import rehydrate from './rehydrate';
import errors from './errors';
import funnels from './funnels';
import roles from './roles';
import customMetrics from './customMetrics';
import search from './search';
import liveSearch from './liveSearch';

const rootReducer = combineReducers({
  user,
  sessions,
  assignments,
  filters,
  funnelFilters,

  templates,
  dashboard,
  components,
  members,  
  site,
  customFields,
  rehydrate,
  errors,
  funnels,
  roles,
  customMetrics,
  search,
  liveSearch,
  ...integrations,
  ...sources,
});

export type RootStore = ReturnType<typeof rootReducer>

export default rootReducer