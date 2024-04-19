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
  '/check-recording-status',
  '/usability-tests',
  '/tags'
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
  private readonly siteId: string | undefined;
  private refreshingTokenPromise: Promise<string> | null = null;

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

  private getInit(method: string = 'GET', params?: any): RequestInit {
    // Always fetch the latest JWT from the store
    const jwt = store.getState().getIn(['user', 'jwt']);
    const headers = new Headers({
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    });

    if (jwt) {
      headers.set('Authorization', `Bearer ${jwt}`);
    }

    // Create the init object
    const init: RequestInit = {
      method,
      headers,
      body: params ? JSON.stringify(params) : undefined,
    };

    if (method === 'GET') {
      delete init.body; // GET requests shouldn't have a body
    }

    return init;
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

  private async handleTokenRefresh(): Promise<string> {
    // If we are already refreshing the token, return the existing promise
    if (!this.refreshingTokenPromise) {
      this.refreshingTokenPromise = this.refreshToken().finally(() => {
        // Once the token has been refreshed, reset the promise
        this.refreshingTokenPromise = null;
      });
    }
    return this.refreshingTokenPromise;
  }

  async fetch(path: string, params?: any, method: string = 'GET', options: {
    clean?: boolean
  } = { clean: true }): Promise<Response> {
    let jwt = store.getState().getIn(['user', 'jwt']);
    if (!path.includes('/refresh') && jwt && this.isTokenExpired(jwt)) {
      jwt = await this.handleTokenRefresh();
      (this.init.headers as Headers).set('Authorization', `Bearer ${jwt}`);
    }

    const init = this.getInit(method, options.clean && params ? clean(params) : params);


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

    if (path.includes('login') || path.includes('refresh') || path.includes('logout')) {
      init.credentials = 'include';
    } else {
      delete init.credentials;
    }

    return fetch(edp + path, init).then((response) => {
      if (response.ok) {
        return response;
      } else {
        return Promise.reject({ message: `! ${this.init.method} error on ${path}; ${response.status}`, response });
      }
    }).catch((error) => {
      return Promise.reject({ message: `! ${this.init.method} error on ${path};` });
    });
  }

  async refreshToken(): Promise<string> {
    try {
      const response = await this.fetch('/refresh', {
        headers: this.init.headers
      }, 'GET', { clean: false });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      const refreshedJwt = data.jwt;
      store.dispatch(setJwt(refreshedJwt));
      return refreshedJwt;
    } catch (error) {
      console.error('Error refreshing token:', error);
      store.dispatch(setJwt(null));
      throw error;
    }
  }

  get(path: string, params?: any, options?: any): Promise<Response> {
    this.init.method = 'GET';
    return this.fetch(queried(path, params), 'GET', options);
  }

  post(path: string, params?: any, options?: any): Promise<Response> {
    this.init.method = 'POST';
    return this.fetch(path, params, 'POST');
  }

  put(path: string, params?: any, options?: any): Promise<Response> {
    this.init.method = 'PUT';
    return this.fetch(path, params, 'PUT');
  }

  delete(path: string, params?: any, options?: any): Promise<Response> {
    this.init.method = 'DELETE';
    return this.fetch(path, params, 'DELETE');
  }
}