import { queried } from './routes';
import ENV from '../env';

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
  '/usability-tests',
  '/tags',
  '/intelligent',
];

const newApiUrls = [
  'assist/sessions',
  '/sessions/',
  '/notes',
  '/unprocessed',
  'first-mob',
  '/events',
  '/favorite',
  '/clickmaps',
  '/replay',
  '/conditions',
  '/users',
  'lexicon',
  '/tags',
  '/browser-tests',
  '/properties',
  '/filters',
];
const except = [
  'integrations/slack/notify',
  'integrations/msteams/notify',
  '/events/search',
  'assign/projects',
  '/users/modules',
  '/intelligent/',
];
const useNewApi = localStorage.getItem('__old_api') !== 'true';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SITE_ID_RE = new RegExp(`^(?:${siteIdRequiredPaths.map(escapeRe).join('|')})`);
const NEW_API_RE = new RegExp(newApiUrls.map(escapeRe).join('|'));
const EXCEPT_RE = new RegExp(except.map(escapeRe).join('|'));
const AGENT_NOTIFICATIONS_RE = /^\/\d+\/notifications(\/|$)/;

const SAAS_HOST = 'api.openreplay.com';

function toV2(url: string, isSaas: boolean): string {
  if (isSaas) {
    return url.replace('.com', '.com/v2');
  }
  try {
    const urlObj = new URL(url);
    urlObj.pathname = urlObj.pathname.replace('/api', '/v2/api');
    return urlObj.toString();
  } catch {
    return url.replace('/api', '/v2/api');
  }
}

interface Endpoints {
  base: string;
  isSaas: boolean;
  v2: string;
  noChalice: string;
}

/* Memoised rather than resolved at import time: ENV and the page origin are
   read on each call. */
let endpointCache: Endpoints | null = null;
function endpoints(): Endpoints {
  const base = ENV.API_EDP || window.location.origin + '/api';
  if (endpointCache?.base !== base) {
    let isSaas = false;
    try {
      isSaas = new URL(base).hostname === SAAS_HOST;
    } catch {
      isSaas = false;
    }
    endpointCache = {
      base,
      isSaas,
      v2: toV2(base, isSaas),
      noChalice: isSaas ? base : base.replace('/api', ''),
    };
  }
  return endpointCache;
}

const isPlainObject = (value: any): boolean => {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

export const clean = (
  obj: any,
  forbiddenValues: any[] = [undefined, ''],
): any => {
  const keys = Array.isArray(obj)
    ? new Array(obj.length).fill(0).map((_, i) => i)
    : Object.keys(obj);
  const retObj = Array.isArray(obj) ? [] : {};
  keys.forEach((key) => {
    const value = obj[key];
    // A Date, Blob or File has an object typeof but yields `{}` if walked.
    if (value !== null && typeof value === 'object') {
      if (Array.isArray(value) || isPlainObject(value)) {
        retObj[key] = clean(value, forbiddenValues);
      } else {
        retObj[key] = value;
      }
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
  public getJwt: () => string | null = () => null;
  private onUpdateJwt: (data: { jwt?: string; spotJwt?: string }) => void;
  private refreshingTokenPromise: Promise<string> | null = null;
  private jwtExp: { token: string; exp: number } | null = null;

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
    reqHeaders?: Record<string, any>,
    abortSignal?: AbortSignal,
  ): RequestInit {
    // Always fetch the latest JWT from the store
    const jwt = this.getJwt();
    const headers = new Headers({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });

    if (reqHeaders) {
      for (const [key, value] of Object.entries(reqHeaders)) {
        headers.set(key, value);
      }
    }

    if (jwt) {
      headers.set('Authorization', `Bearer ${jwt}`);
    }

    const init: RequestInit = {
      method,
      headers,
      signal: abortSignal,
    };

    this.siteId = this.siteIdCheck?.().siteId ?? undefined;
    return init;
  }

  private decodeJwt(jwt: string): any {
    const base64Url = jwt.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  }

  isTokenExpired(token: string): boolean {
    if (this.jwtExp?.token !== token) {
      let exp = 0;
      try {
        exp = this.decodeJwt(token).exp ?? 0;
      } catch {
        // An undecodable token counts as expired, which routes it through the
        // refresh instead of throwing out of every request that carries it.
        exp = 0;
      }
      this.jwtExp = { token, exp };
    }
    return this.jwtExp.exp < Date.now() / 1000;
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
    abortSignal?: AbortSignal,
  ): Promise<Response> {
    let _path = path;
    let jwt = this.getJwt();
    if (!path.includes('/refresh') && jwt && this.isTokenExpired(jwt)) {
      jwt = await this.handleTokenRefresh();
      (this.init.headers as Headers).set('Authorization', `Bearer ${jwt}`);
    }

    const init = this.getInit(method, headers, abortSignal);

    if (init.method !== 'GET' && params !== undefined) {
      init.body = JSON.stringify(options.clean ? clean(params) : params);
    }

    if (
      (path.includes('login') ||
        path.includes('refresh') ||
        path.includes('logout') ||
        path.includes('reset')) &&
      ENV.NODE_ENV !== 'development'
    ) {
      init.credentials = 'include';
    } else {
      delete init.credentials;
    }

    const noChalice =
      path.includes('/kai') ||
      // Smart Issues live in the Go `api` service at /v2/smart-issues (migrated
      // from the Python `kai` service) — routed at the origin root like /kai,
      // not under the chalice /api prefix.
      path.includes('/smart-issues') ||
      (path.includes('/spot') && !path.includes('/login'))

    // using product analytics api for cards and dashboards (excluding sessions)
    // integrations moved to the Go `api` service: /v2/api/{projectId}/integration/*
    const { base, isSaas, v2, noChalice: baseNoChalice } = endpoints();
    let edp = base;
    if (
      !base.includes('/v2') &&
      (path.includes('/cards') ||
        path.includes('/dashboards') ||
        path.includes('/sessions/search') ||
        path.includes('/integration/'))
    ) {
      edp = v2;
    }

    if (noChalice && !isSaas) {
      edp = edp === base ? baseNoChalice : edp.replace('/api', '');
    }
    if (
      path !== '/targets_temp' &&
      !path.includes('/metadata/session_search') &&
      !path.includes('/assist/credentials') &&
      SITE_ID_RE.test(path)
    ) {
      edp = `${edp}/${this.siteId ?? ''}`;
    }
    if (path.includes('PROJECT_ID')) {
      _path = _path.replace('PROJECT_ID', `${this.siteId}`);
    }

    let fullUrl = edp + _path;
    if (useNewApi) {
      // /{projectId}/notifications[/{agent}] — the agents' per-user notification
      // routes are new-API (v2). Matched by shape rather than by adding
      // `/notifications` to newApiUrls, because the legacy in-app notification
      // centre lives at a bare `/notifications` and must stay on the old API.
      if (
        !edp.includes('/v2') &&
        ((NEW_API_RE.test(_path) && !EXCEPT_RE.test(_path)) ||
          AGENT_NOTIFICATIONS_RE.test(_path))
      ) {
        fullUrl = toV2(fullUrl, isSaas);
      }
    }
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
    } catch {}
    throw new Error(errorMsg, { cause: response });
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
    abortSignal?: AbortSignal,
  ): Promise<Response> {
    this.init.method = 'GET';
    return this.fetch(
      queried(path, params),
      options,
      'GET',
      undefined,
      headers,
      abortSignal,
    );
  }

  post(
    path: string,
    params?: any,
    options?: any,
    headers?: Record<string, any>,
    abortSignal?: AbortSignal,
  ): Promise<Response> {
    this.init.method = 'POST';
    return this.fetch(path, params, 'POST', options, headers, abortSignal);
  }

  put(
    path: string,
    params?: any,
    options?: any,
    abortSignal?: AbortSignal,
  ): Promise<Response> {
    this.init.method = 'PUT';
    return this.fetch(path, params, 'PUT', options, undefined, abortSignal);
  }

  delete(
    path: string,
    params?: any,
    options?: any,
    abortSignal?: AbortSignal,
  ): Promise<Response> {
    this.init.method = 'DELETE';
    return this.fetch(path, params, 'DELETE', options, undefined, abortSignal);
  }

  patch(
    path: string,
    params?: any,
    options?: any,
    abortSignal?: AbortSignal,
  ): Promise<Response> {
    this.init.method = 'PATCH';
    return this.fetch(path, params, 'PATCH', options, undefined, abortSignal);
  }

  forceSiteId = (siteId: string) => {
    this.siteId = siteId;
  };
}

/* The client every service shares. `RootStore.initClient` wires the JWT and
   site-id checkers into this instance, so a separately constructed one sends
   requests with no Authorization header. */
export const apiClient = new APIClient();
