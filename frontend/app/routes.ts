const hashed = (path: string, hash?: string | number): string => {
  if ((typeof hash === 'string' && hash !== '') || typeof hash === 'number') {
    return `${path}#${hash}`;
  }
  return path;
};

export const queried = (path: string, params?: Record<string, any>): string => {
  const keys = typeof params === 'object' && params !== null && Object.keys(params)
    .filter(key => /string|number|boolean/.test(typeof params[key]));
  if (keys && keys.length > 0) {
    return path + '?' + keys
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
      .join('&');
  }
  return path;
};

export const parseQuery = (location: Location, availableQueryParams: string[] | null): Record<string, string> => {
  const params: Record<string, string> = {};
  location.search
    .substring(1)
    .split('&')
    .map(param => param.split('='))
    .map(kv => kv.map(decodeURIComponent))
    .filter(([paramName]) => !availableQueryParams || availableQueryParams.includes(paramName))
    .map(([paramName, paramValue]) => {
      params[paramName] = paramValue;
    });
  return params;
};

export const removeQueryParams = (location: Location, removingParams: string | string[] = []): Location => {
  const rp = typeof removingParams === 'string' ? [removingParams] : removingParams;
  const search = location.search
    .substring(1)
    .split('&')
    .map(param => param.split('='))
    .filter(([paramName]) => !rp.includes(decodeURIComponent(paramName)))
    .map(pair => pair.join('='))
    .join('&');
  return { ...location, search };
};

export const addQueryParams = (location: Location, params: Record<string, any>): Location => {
  const search = queried('', { ...parseQuery(location, null), ...params });
  return { ...location, search };
};

export const setQueryParams = (location: Location, params: Record<string, any>): Location => {
  const search = queried('', { ...params });
  return { ...location, search };
};

export const login = (): string => '/login';
export const signup = (): string => '/signup';

export const forgotPassword = (): string => '/reset-password';

export const CLIENT_TABS = {
  INTEGRATIONS: 'integrations',
  PROFILE: 'account',
  SESSIONS_LISTING: 'sessions-listing',
  MANAGE_USERS: 'team',
  MANAGE_ROLES: 'roles',
  SITES: 'projects',
  CUSTOM_FIELDS: 'metadata',
  WEBHOOKS: 'webhooks',
  NOTIFICATIONS: 'notifications',
  AUDIT: 'audit',
  BILLING: 'billing',
  MODULES: 'modules',
};
export const CLIENT_DEFAULT_TAB = CLIENT_TABS.PROFILE;
const routerClientTabString = `:activeTab(${Object.values(CLIENT_TABS).join('|')})`;
export const client = (tab = routerClientTabString): string => `/client/${tab}`;

export const OB_TABS = {
  INSTALLING: 'installing',
  IDENTIFY_USERS: 'identify-users',
  MANAGE_USERS: 'team',
  INTEGRATIONS: 'integrations'
};
export const OB_DEFAULT_TAB = OB_TABS.INSTALLING;
const routerOBTabString = `:activeTab(${Object.values(OB_TABS).join('|')})`;

export const onboarding = (tab = routerOBTabString): string => `/onboarding/${tab}`;

export const sessions = (params?: Record<string, any>): string => queried('/sessions', params);
export const fflags = (params?: Record<string, any>): string => queried('/feature-flags', params);
export const newFFlag = (): string => '/feature-flags/create';
export const fflag = (id = ':fflagId', hash?: string | number): string => hashed(`/feature-flags/${id}`, hash);
export const fflagRead = (id = ':fflagId', hash?: string | number): string => hashed(`/feature-flags/get/${id}`, hash);

export const notes = (params?: Record<string, any>): string => queried('/notes', params);
export const bookmarks = (params?: Record<string, any>): string => queried('/bookmarks', params);
export const assist = (params?: Record<string, any>): string => queried('/assist', params);
export const assistStats = (params?: Record<string, any>): string => queried('/assist-stats', params);
export const recordings = (params?: Record<string, any>): string => queried('/recordings', params);
export const multiviewIndex = (params?: Record<string, any>): string => queried('/multiview', params);
export const multiview = (sessionsQuery = ':sessionsquery', hash?: string | number): string =>
  hashed(`/multiview/${sessionsQuery}`, hash);
export const session = (sessionId = ':sessionId', hash?: string | number): string =>
  hashed(`/session/${sessionId}`, hash);
export const liveSession = (sessionId = ':sessionId', params?: Record<string, any>, hash?: string | number): string =>
  hashed(queried(`/assist/${sessionId}`, params), hash);

export const errors = (params?: Record<string, any>): string => queried('/errors', params);
export const error = (id = ':errorId', hash?: string | number): string => hashed(`/errors/${id}`, hash);

export const funnels = (params?: Record<string, any>): string => queried('/funnels', params);
export const funnelsCreate = (): string => `/funnels/create`;
export const funnel = (id = ':funnelId', hash?: string | number): string => hashed(`/funnels/${id}`, hash);
export const funnelIssue = (id = ':funnelId', issueId = ':issueId', hash?: string | number): string =>
  hashed(`/funnels/${id}/${issueId}`, hash);
export const tests = (): string => '/tests';
export const dashboard = (): string => '/dashboard';
export const dashboardMetrics = (): string => '/dashboard/metrics';
export const dashboardSelected = (id = ':dashboardId', hash?: string | number): string =>
  hashed(`/dashboard/${id}`, hash);

export const dashboardMetricDetails = (
  dashboardId = ':dashboardId',
  metricId = ':metricId',
  hash?: string | number
): string => hashed(`/dashboard/${dashboardId}/metric/${metricId}`, hash);
export const dashboardMetricCreate = (dashboardId = ':dashboardId', hash?: string | number): string =>
  hashed(`/dashboard/${dashboardId}/metric/create`, hash);
export const metrics = (): string => `/metrics`;
export const metricCreate = (): string => `/metrics/create`;
export const metricDetails = (id = ':metricId', hash?: string | number): string => hashed(`/metrics/${id}`, hash);
export const metricDetailsSub = (id = ':metricId', subId = ':subId', hash?: string | number): string =>
  hashed(`/metrics/${id}/details/${subId}`, hash);

export const alerts = (): string => '/alerts';
export const alertCreate = (): string => '/alert/create';
export const alertEdit = (id = ':alertId', hash?: string | number): string => hashed(`/alert/${id}`, hash);

export const usabilityTesting = () => '/usability-testing';
export const usabilityTestingCreate = () => usabilityTesting() + '/create';
export const usabilityTestingEdit = (id = ':testId', hash?: string | number): string => hashed(`/usability-testing/edit/${id}`, hash);
export const usabilityTestingView = (id = ':testId', hash?: string | number): string => hashed(`/usability-testing/view/${id}`, hash);

const REQUIRED_SITE_ID_ROUTES = [
  liveSession(''),
  session(''),
  sessions(),
  newFFlag(),
  fflag(),
  notes(),
  bookmarks(),
  fflags(),

  assist(),
  recordings(),
  multiview(),
  multiviewIndex(),
  assistStats(),

  metrics(),
  metricDetails(''),
  metricDetailsSub(''),

  dashboard(),
  dashboardSelected(''),
  dashboardMetrics(),
  dashboardMetricCreate(),
  dashboardMetricDetails(),

  alerts(),
  alertCreate(),
  alertEdit(''),

  error(''),
  errors(),
  onboarding(''),
  funnels(),
  funnelsCreate(),
  funnel(''),
  funnelIssue(),

  usabilityTesting(),
  usabilityTestingCreate(),
  usabilityTestingEdit(''),
  usabilityTestingView(''),
];
const routeNeedsSiteId = (path: string): boolean => REQUIRED_SITE_ID_ROUTES.some(r => path.startsWith(r));
const siteIdToUrl = (siteId = ':siteId'): string => {
  if (Array.isArray(siteId)) {
    return `:siteId(${siteId.join('|')})`;
  }
  return siteId;
};
export const withSiteId = (route: string, siteId = ':siteId'): string =>
  routeNeedsSiteId(route) ? `/${siteIdToUrl(siteId)}${route}` : route;
export const hasSiteId = (path: string): boolean => {
  const pathParts = path.split('/');
  if (!isNaN(+pathParts[1]) && routeNeedsSiteId('/' + pathParts.slice(2).join('/'))) return true;
  return false;
};

export function isRoute(route: string, path: string): boolean {
  const pathParts = path.split('/');
  const routeParts = withSiteId(route).split('/');
  return (
    routeParts.length === pathParts.length &&
    routeParts.every((p, i) => p.startsWith(':') || p === pathParts[i])
  );
}

const SITE_CHANGE_AVAILABLE_ROUTES = [
  sessions(),
  notes(),
  bookmarks(),
  fflags(),
  funnels(),
  assist(),
  recordings(),
  dashboard(),
  dashboardSelected(),
  metrics(),
  alerts(),
  errors(),
  onboarding(''),
  usabilityTesting(),
];

export const siteChangeAvailable = (path: string): boolean =>
  SITE_CHANGE_AVAILABLE_ROUTES.some(r => isRoute(r, path));

export const redirects: Record<string, string> = {
  [client('custom-fields')]: client(CLIENT_TABS.CUSTOM_FIELDS)
};
