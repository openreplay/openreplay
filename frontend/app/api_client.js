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
  '/flows',
  '/rehydrations',
  '/sourcemaps',
  '/errors',
  '/funnels'
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
    const jwtAll = store.getState().get('jwt');

    if(jwtAll != null){
      const jwt = jwtAll.split('%_END')[0];
      this.stkJWT = jwtAll.split('%_END')[1];

      const siteId = store.getState().getIn([ 'user', 'siteId' ]);
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

    }else{
      const jwt = jwtAll;
      this.stkJWT = jwtAll;

      const siteId = store.getState().getIn([ 'user', 'siteId' ]);
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
  }

  fetch(path, params, options = { clean: true }) {
    if (params !== undefined) {
      const cleanedParams = options.clean ? clean(params) : params;
      this.init.body = JSON.stringify(cleanedParams);
    }


    let fetch = window.fetch;

    let edp = window.ENV.API_EDP;
    if (
      path !== '/targets_temp' &&
      !path.includes('/metadata/session_search') &&
      !path.includes('/watchdogs/rules') &&
      !!this.siteId &&
      siteIdRequiredPaths.some(sidPath => path.startsWith(sidPath))
    ) {
      edp = `${ edp }/${ this.siteId }`
    }

    if(path.includes('/errors/stats')){
      this.init.headers.Authorization = `Bearer ${ this.stkJWT }`;
      return fetch('https://api.stackanalytix.com/v2/api/Replay/errors', this.init);
    }
    

    if(path.includes('errors/search')){
      this.init.headers.Authorization = `Bearer ${ this.stkJWT }`;
      return fetch('https://api.stackanalytix.com/v2/api/Replay/ErrorSearch/' + this.siteId, this.init);
    }


    if(path.includes('sessions/search2')){
      this.init.headers.Authorization = `Bearer ${ this.stkJWT }`;
      return fetch('https://api.stackanalytix.com/v2/api/Replay/SessionSearch/' + this.siteId, this.init);
    }

    if(path.includes('notifications')){
      this.init.headers.Authorization = `Bearer ${ this.stkJWT }`;
      return fetch('https://api.stackanalytix.com/v2/api/Replay/notifications', this.init);
    }

    if(path.includes('metadata')){
      this.init.headers.Authorization = `Bearer ${ this.stkJWT }`;
      return fetch('https://api.stackanalytix.com/v2/api/Replay/metadata', this.init);
    }

    if(path.includes('account')){
      this.init.headers.Authorization = `Bearer ${ this.stkJWT }`;
      return fetch('https://api.stackanalytix.com/v2/api/Replay/account', this.init);
    }

    if(path.includes('sample_rate')){
      this.init.headers.Authorization = `Bearer ${ this.stkJWT }`;
      return fetch('https://api.stackanalytix.com/v2/api/Replay/sample_rate', this.init);
    }

    if(path.includes('signup')){
      this.init.headers.Authorization = `Bearer ${ this.stkJWT }`;
      return fetch('https://api.stackanalytix.com/v2/api/Replay/signup', this.init);
    }

    if(path.includes('client')){
      this.init.headers.Authorization = `Bearer ${ this.stkJWT }`;
      return fetch('https://api.stackanalytix.com/v2/api/Replay/client', this.init);
    }

    if(path.includes('funnels')){
      this.init.headers.Authorization = `Bearer ${ this.stkJWT }`;
      return fetch('https://api.stackanalytix.com/v2/api/Replay/funnels', this.init);
    }

    if(path.includes('integration')){
      this.init.headers.Authorization = `Bearer ${ this.stkJWT }`;
      return fetch('https://api.stackanalytix.com/v2/api/Replay/integration', this.init);
    }

    if(path.includes('announcements')){
      this.init.headers.Authorization = `Bearer ${ this.stkJWT }`;
      return fetch('https://api.stackanalytix.com/v2/api/Replay/announcements', this.init);
    }

    if(path.includes('/events/search')){
      this.init.headers.Authorization = `Bearer ${ this.stkJWT }`;
      let query = path.split('?type')[1];
      return fetch('https://api.stackanalytix.com/v2/api/Replay/EventSearch/' + this.siteId + '?type' + query , this.init);
    }

    if(path.includes('/projects')){
      this.init.headers.Authorization = `Bearer ${ this.stkJWT }`;
      return fetch('https://api.stackanalytix.com/v2/api/Replay/GetProjects', this.init);
    }

    if(path == '/login' || path === '/login'){
      return fetch('https://api.stackanalytix.com/v2/api/Account/Login', this.init);
    }
    else{
      return fetch(edp + path, this.init);
    }
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
