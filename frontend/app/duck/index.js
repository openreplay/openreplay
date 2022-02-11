import { combineReducers } from 'redux-immutable';

import jwt from './jwt';
import user from './user';
import sessions from './sessions';
import issues from './issues';
import assignments from './assignments';
import target from './target';
import targetCustom from './targetCustom';
import runs from './runs';
import filters from './filters';
import funnelFilters from './funnelFilters';
import tests from './tests';
import steps from './steps';
import schedules from './schedules';
import events from './events';
import environments from './environments';
import variables from './variables';
import templates from './templates';
import alerts from './alerts';
import notifications from './notifications';
import dashboard from './dashboard';
import components from './components';
import sources from './sources';
import members from './member';
import site from './site';
import customFields from './customField';
import webhooks from './webhook';
import integrations from './integrations';
import watchdogs from './watchdogs';
import rehydrate from './rehydrate';
import announcements from './announcements';
import errors from './errors';
import funnels from './funnels';
import config from './config';
import roles from './roles';
import customMetrics from './customMetrics';
import search from './search';
import liveSearch from './liveSearch';

export default combineReducers({
  jwt,
  user,
  sessions,
  issues,
  assignments,
  target,
  targetCustom,
  runs,
  filters,
  funnelFilters,
  tests,
  steps,
  schedules,
  events,
  environments,
  variables,
  templates,
  alerts,
  notifications,
  dashboard,
  components,
  members,  
  site,
  customFields,
  webhooks,
  watchdogs,
  rehydrate,
  announcements,
  errors,
  funnels,
  config,
  roles,
  customMetrics,
  search,
  liveSearch,
  ...integrations,
  ...sources,
});
