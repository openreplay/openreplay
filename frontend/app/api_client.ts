import store from 'App/store';
import { queried } from './routes';
import { setJwt } from 'Duck/user';

const siteIdRequiredPaths: string[] = [
  '/dashboard',
  '/sessions',
  '/events',
  '/filters',
  '/alerts',
  '/targets',
  '/metadata',
  '/integrations/sentry/events',
  '/integrations/slack/notify',
  '/integrations/msteams/notify',
  '/assignments',
  '/integration/sources',
  '/issue_types',
  '/saved_search',
  '/rehydrations',
  '/sourcemaps',
  '/errors',
  '/funnels',
  '/assist',
  '/heatmaps',
  '/custom_metrics',
  '/dashboards',
  '/cards',
  '/unprocessed',
  '/notes',
  '/feature-flags',
  '/check-recording-status'
];

export const clean = (obj: any, forbiddenValues: any[] = [undefined, '']): any => {
  const keys = Array.isArray(obj)
    ? new Array(obj.length).fill().map((_, i) => i)
    : Object.keys(obj);
  const retObj = Array.isArray(obj) ? [] : {};
  keys.map(key => {
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      retObj[key] = clean(value);
    } else if (!forbiddenValues.includes(value)) {
      retObj[key] = value;
    }
  });

  return retObj;
};

export default class APIClient {
  private init: RequestInit;
  private siteId: string | undefined;

  constructor() {
    const jwt = store.getState().getIn(['user', 'jwt']);
    const siteId = store.getState().getIn(['site', 'siteId']);
    this.init = {
      headers: new Headers({
        Accept: 'application/json',
        'Content-Type': 'application/json'
      })
    };
    if (jwt !== null) {
      (this.init.headers as Headers).set('Authorization', `Bearer ${jwt}`);
    }
    this.siteId = siteId;
  }

  private decodeJwt(jwt: string): any {
    const base64Url = jwt.split('.')[1];
    const base64 = base64Url.replace('-', '+').replace('_', '/');
    return JSON.parse(window.atob(base64));
  }

  isTokenExpired(token: string): boolean {
    const decoded: any = this.decodeJwt(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  }

  async fetch(path: string, params?: any, options: {
    clean?: boolean
  } = { clean: true }): Promise<Response> {
    const jwt = store.getState().getIn(['user', 'jwt']);
    if (!path.includes('/refresh') && jwt && this.isTokenExpired(jwt)) {
      const newJwt = await this.refreshToken();
      (this.init.headers as Headers).set('Authorization', `Bearer ${newJwt}`);
    }

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
      !path.includes('/assist/credentials') &&
      !!this.siteId &&
      siteIdRequiredPaths.some(sidPath => path.startsWith(sidPath))
    ) {
      edp = `${edp}/${this.siteId}`;
    }

    return fetch(edp + path, this.init).then((response) => {
      if (response.ok) {
        return response;
      } else {
        return Promise.reject({ message: `! ${this.init.method} error on ${path}; ${response.status}`, response });
      }
    });
  }

  async refreshToken(): Promise<string> {
    const response = await this.fetch('/refresh', {
      method: 'GET',
      headers: this.init.headers
    }, { clean: false });

    const data = await response.json();
    const refreshedJwt = data.jwt;
    store.dispatch(setJwt(refreshedJwt));
    return refreshedJwt;
  }

  get(path: string, params?: any, options?: any): Promise<Response> {
    this.init.method = 'GET';
    return this.fetch(queried(path, params, options));
  }

  post(path: string, params?: any, options?: any): Promise<Response> {
    this.init.method = 'POST';
    return this.fetch(path, params);
  }

  put(path: string, params?: any, options?: any): Promise<Response> {
    this.init.method = 'PUT';
    return this.fetch(path, params);
  }

  delete(path: string, params?: any, options?: any): Promise<Response> {
    this.init.method = 'DELETE';
    return this.fetch(path, params);
  }
}