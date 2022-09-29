import store from 'App/store';
import { queried } from './routes';

const siteIdRequiredPaths = [
  '/dashboard',
  '/sessions',
  '/events',
  '/filters',
  '/alerts',
  '/targets',
  '/metadata',
  '/integrations/sentry/events',
  '/integrations/slack/notify',
  '/assignments',
  '/integration/sources',
  '/issue_types',
  '/sample_rate',
  '/saved_search',
  '/rehydrations',
  '/sourcemaps',
  '/errors',
  '/funnels',
  '/assist',
  '/heatmaps',
  '/custom_metrics',
  '/dashboards',
  '/metrics',
  '/unprocessed',
  '/notes',
  // '/custom_metrics/sessions',
];

const noStoringFetchPathStarts = [
  '/account/password',
  '/password',
  '/login'
];

// null?
export const clean = (obj, forbidenValues = [ undefined, '' ])  => {
  const keys = Array.isArray(obj)
    ? new Array(obj.length).fill().map((_, i) => i)
    : Object.keys(obj);
  const retObj = Array.isArray(obj) ? [] : {};
  keys.map(key => {
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      retObj[key] = clean(value);
    } else if (!forbidenValues.includes(value)) {
      retObj[key] = value;
    }
  });

  return retObj;
}


export default class APIClient {
  constructor() {
    const jwt = store.getState().get('jwt');
    const siteId = store.getState().getIn([ 'site', 'siteId' ]);
    this.init = {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    };
    if (jwt !== null) {
      this.init.headers.Authorization = `Bearer ${ jwt }`;
    }
    this.siteId = siteId;
  }

  fetch(path, params, options = { clean: true }) {
    if (params !== undefined) {
      const cleanedParams = options.clean ? clean(params) : params;
      this.init.body = JSON.stringify(cleanedParams);
    }

    if (this.init.method === 'GET') {
      delete this.init.body;
    }


    let fetch = window.fetch;
    let edp = window.env.API_EDP || window.location.origin + '/api';
    if (
      path !== '/targets_temp' &&
      !path.includes('/metadata/session_search') &&
      !path.includes('/watchdogs/rules') &&
      !path.includes('/assist/credentials') &&
      !!this.siteId &&
      siteIdRequiredPaths.some(sidPath => path.startsWith(sidPath))
    ) {
      edp = `${ edp }/${ this.siteId }`
    }
    return fetch(edp + path, this.init);
  }

  get(path, params, options) {
    this.init.method = 'GET';
    return this.fetch(queried(path, params, options));
  }

  post(path, params, options) {
    this.init.method = 'POST';
    return this.fetch(path, params);
  }

  put(path, params, options) {
    this.init.method = 'PUT';
    return this.fetch(path, params);
  }

  delete(path, params, options) {
    this.init.method = 'DELETE';
    return this.fetch(path, params);
  }
}
