import { queried } from './routes';

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
  '/tags',
  '/intelligent',
];

export const clean = (
  obj: any,
  forbiddenValues: any[] = [undefined, ''],
): any => {
  const keys = Array.isArray(obj)
    ? new Array(obj.length).fill().map((_, i) => i)
    : Object.keys(obj);
  const retObj = Array.isArray(obj) ? [] : {};
  keys.map((key) => {
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

  private siteIdCheck: (() => { siteId: string | null }) | undefined;

  private getJwt: () => string | null = () => null;

  private onUpdateJwt: (data: { jwt?: string; spotJwt?: string }) => void;

  private refreshingTokenPromise: Promise<string> | null = null;

  constructor() {
    this.init = {
      headers: new Headers({
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }),
    };
  }

  setJwt(jwt: string | null): void {
    if (jwt !== null) {
      (this.init.headers as Headers).set('Authorization', `Bearer ${jwt}`);
    }
  }

  setOnUpdateJwt(
    onUpdateJwt: (data: { jwt?: string; spotJwt?: string }) => void,
  ): void {
    this.onUpdateJwt = onUpdateJwt;
  }

  setJwtChecker(checker: () => string | null): void {
    this.getJwt = checker;
  }

  setSiteIdCheck(checker: () => { siteId: string | null }): void {
    this.siteIdCheck = checker;
  }

  private getInit(
    method: string = 'GET',
    params?: any,
    reqHeaders?: Record<string, any>,
  ): RequestInit {
    // Always fetch the latest JWT from the store
    const jwt = this.getJwt();
    const headers = new Headers({
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });

    if (reqHeaders) {
      for (const [key, value] of Object.entries(reqHeaders)) {
        headers.set(key, value);
      }
    }

    if (jwt) {
      headers.set('Authorization', `Bearer ${jwt}`);
    }

    // Create the init object
    const init: RequestInit = {
      method,
      headers,
      body: params ? JSON.stringify(params) : undefined
    };

    if (method === 'GET') {
      delete init.body; // GET requests shouldn't have a body
    }

    // /:id/path
    // const idFromPath = window.location.pathname.split('/')[1];
    this.siteId = this.siteIdCheck?.().siteId ?? undefined;
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

  async fetch<T>(
    path: string,
    params?: any,
    method: string = 'GET',
    options: { clean?: boolean } = { clean: true },
    headers?: Record<string, any>,
  ): Promise<Response> {
    let _path = path;
    let jwt = this.getJwt();
    if (!path.includes('/refresh') && jwt && this.isTokenExpired(jwt)) {
      jwt = await this.handleTokenRefresh();
      (this.init.headers as Headers).set('Authorization', `Bearer ${jwt}`);
    }

    const init = this.getInit(
      method,
      options.clean && params ? clean(params) : params,
      headers,
    );

    if (params !== undefined) {
      const cleanedParams = options.clean ? clean(params) : params;
      init.body = JSON.stringify(cleanedParams);
    }
    if (init.method === 'GET') {
      delete init.body;
    }

    if ((
      path.includes('login')
      || path.includes('refresh')
      || path.includes('logout')
      || path.includes('reset')
    ) && window.env.NODE_ENV !== 'development'
    ) {
      init.credentials = 'include';
    } else {
      delete init.credentials;
    }

    const noChalice = path.includes('v1/integrations') || path.includes('/spot') && !path.includes('/login');
    let edp = window.env.API_EDP || window.location.origin + '/api';
    if (noChalice && !edp.includes('api.openreplay.com')) {
      edp = edp.replace('/api', '');
    }
    if (
      path !== '/targets_temp' &&
      !path.includes('/metadata/session_search') &&
      !path.includes('/assist/credentials') &&
      siteIdRequiredPaths.some((sidPath) => path.startsWith(sidPath))
    ) {
      edp = `${edp}/${this.siteId ?? ''}`;
    }
    if (path.includes('PROJECT_ID')) {
      _path = _path.replace('PROJECT_ID', `${this.siteId}`);
    }

    const fullUrl = edp + _path;
    const response = await window.fetch(fullUrl, init);
    if (response.status === 403) {
      console.warn('API returned 403. Clearing JWT token.');
      this.onUpdateJwt({ jwt: undefined });
    }
    if (response.ok) {
      return response;
    }
    let errorMsg = 'Something went wrong.';
    try {
      const errorData = await response.json();
      errorMsg = errorData.errors?.[0] || errorMsg;
    } catch {
    }
    throw new Error(errorMsg);
  }

  async refreshToken(): Promise<string> {
    try {
      const response = await this.fetch(
        '/refresh',
        {
          headers: this.init.headers,
        },
        'GET',
        { clean: false },
      );

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      const refreshedJwt = data.jwt;
      this.onUpdateJwt({ jwt: refreshedJwt });
      return refreshedJwt;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.onUpdateJwt({ jwt: undefined });
      throw error;
    }
  }

  get(
    path: string,
    params?: any,
    options?: any,
    headers?: Record<string, any>,
  ): Promise<Response> {
    this.init.method = 'GET';
    return this.fetch(
      queried(path, params),
      options,
      'GET',
      undefined,
      headers,
    );
  }

  post(
    path: string,
    params?: any,
    options?: any,
    headers?: Record<string, any>,
  ): Promise<Response> {
    this.init.method = 'POST';
    return this.fetch(path, params, 'POST', options, headers);
  }

  put(path: string, params?: any, options?: any): Promise<Response> {
    this.init.method = 'PUT';
    return this.fetch(path, params, 'PUT');
  }

  delete(path: string, params?: any, options?: any): Promise<Response> {
    this.init.method = 'DELETE';
    return this.fetch(path, params, 'DELETE');
  }

  patch(path: string, params?: any, options?: any): Promise<Response> {
    this.init.method = 'PATCH';
    return this.fetch(path, params, 'PATCH');
  }

  forceSiteId = (siteId: string) => {
    this.siteId = siteId;
  };
}
