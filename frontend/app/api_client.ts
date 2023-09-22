import store from 'App/store';
import { queried } from './routes';
import { setJwt } from 'Duck/user';

interface InitOptions {
  clean?: boolean;
}

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
    ? new Array(obj.length).fill(undefined).map((_, i) => i)
    : Object.keys(obj);
  const retObj: any = Array.isArray(obj) ? [] : {};
  keys.forEach((key) => {
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
  private init: RequestInit = {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  };

  private readonly siteId: string | undefined;

  constructor() {
    const jwt = store.getState().getIn(['user', 'jwt']);
    this.siteId = store.getState().getIn(['site', 'siteId']);

    if (jwt !== null) {
      this.init.headers!.Authorization = `Bearer ${jwt}`;
    }
  }

  private async checkJwtExpired(): Promise<boolean> {
    const jwt = store.getState().getIn(['user', 'jwt']);
    if (jwt) {
      const tokenObj = this.decodeJwt(jwt);
      return this.isTokenExpired(tokenObj);
    }
    return false; // No JWT available
  }

  private decodeJwt(jwt: string): any {
    const base64Url = jwt.split('.')[1];
    const base64 = base64Url.replace('-', '+').replace('_', '/');
    return JSON.parse(window.atob(base64));
  }

  private isTokenExpired(tokenObj: any): boolean {
    return tokenObj.exp * 1000 < Date.now(); // exp in Unix time (sec)
  }

  private async refreshJwtIfNeeded(): Promise<void> {
    if (await this.checkJwtExpired()) {
      // Token is expired, refresh it here
      try {
        const refreshedJwt = await this.refreshJwt();
        if (refreshedJwt) {
          this.init.headers!.Authorization = `Bearer ${refreshedJwt}`;
          store.dispatch(setJwt(refreshedJwt));
        } else {
          // Handle the case where token refresh fails
        }
      } catch (error) {
        // Handle the token refresh error
      }
    }
  }

  private async refreshJwt(): Promise<string | null> {
    try {
      const response = await this.get('/refresh', undefined);
      if (response.ok) {
        const json = await response.json();
        return json.jwt;
      }
    } catch (e) {
      // Handle refresh failure
    }
    return null;
  }

  private async fetch(path: string, params: any, options: InitOptions = { clean: true }): Promise<Response> {
    if (path !== '/login' && path !== '/refresh') {
      await this.refreshJwtIfNeeded();
    }

    if (params !== undefined) {
      const cleanedParams = options.clean ? clean(params) : params;
      this.init.body = JSON.stringify(cleanedParams);
    }

    if (this.init.method === 'GET') {
      delete this.init.body;
    }

    let fetchFunc = window.fetch;
    let edp = window.env.API_EDP || window.location.origin + '/api';

    if (
      path !== '/targets_temp' &&
      !path.includes('/metadata/session_search') &&
      !path.includes('/assist/credentials') &&
      !!this.siteId &&
      siteIdRequiredPaths.some((sidPath) => path.startsWith(sidPath))
    ) {
      edp = `${edp}/${this.siteId}`;
    }

    const response = await fetchFunc(edp + path, this.init);
    if (response.ok) {
      return response;
    } else {
      return Promise.reject({ message: `! ${this.init.method} error on ${path}; ${response.status}`, response });
    }
  }

  public get(path: string, params: any, options?: InitOptions): Promise<Response> {
    this.init.method = 'GET';
    return this.fetch(queried(path, params), undefined, options);
  }

  public post(path: string, params: any, options?: InitOptions): Promise<Response> {
    this.init.method = 'POST';
    return this.fetch(path, params, options);
  }

  public put(path: string, params: any, options?: InitOptions): Promise<Response> {
    this.init.method = 'PUT';
    return this.fetch(path, params, options);
  }

  public delete(path: string, params: any, options?: InitOptions): Promise<Response> {
    this.init.method = 'DELETE';
    return this.fetch(path, params, options);
  }
}
