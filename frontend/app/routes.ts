import { CLIENT_TABS } from './utils/routeUtils';
import { routeIdRequired, changeAvailable, queried } from './extraRoutes';

export * from './extraRoutes';
export * from './utils/routeUtils';

const hashed = (path: string, hash?: string | number): string => {
  if ((typeof hash === 'string' && hash !== '') || typeof hash === 'number') {
    return `${path}#${hash}`;
  }
  return path;
};

export const parseQuery = (
  location: Location,
  availableQueryParams: string[] | null,
): Record<string, string> => {
  const params: Record<string, string> = {};
  location.search
    .substring(1)
    .split('&')
    .map((param) => param.split('='))
    .map((kv) => kv.map(decodeURIComponent))
    .filter(
      ([paramName]) =>
        !availableQueryParams || availableQueryParams.includes(paramName),
    )
    .map(([paramName, paramValue]) => {
      params[paramName] = paramValue;
    });
  return params;
};

export const removeQueryParams = (
  location: Location,
  removingParams: string | string[] = [],
): Location => {
  const rp =
    typeof removingParams === 'string' ? [removingParams] : removingParams;
  const search = location.search
    .substring(1)
    .split('&')
    .map((param) => param.split('='))
    .filter(([paramName]) => !rp.includes(decodeURIComponent(paramName)))
    .map((pair) => pair.join('='))
    .join('&');
  return { ...location, search };
};

export const addQueryParams = (
  location: Location,
  params: Record<string, any>,
): Location => {
  const search = queried('', { ...parseQuery(location, null), ...params });
  return { ...location, search };
};

export const setQueryParams = (
  location: Location,
  params: Record<string, any>,
): Location => {
  const search = queried('', { ...params });
  return { ...location, search };
};

export const login = (): string => '/login';
export const signup = (): string => '/signup';

export const forgotPassword = (): string => '/reset-password';

export const CLIENT_DEFAULT_TAB = CLIENT_TABS.PROFILE;
const routerClientTabString = `:activeTab(${Object.values(CLIENT_TABS).join('|')})`;
export const client = (tab = routerClientTabString): string => `/client/${tab}`;

export const OB_TABS = {
  INSTALLING: 'installing',
  IDENTIFY_USERS: 'identify-users',
  MANAGE_USERS: 'team',
  INTEGRATIONS: 'integrations',
};
export const OB_DEFAULT_TAB = OB_TABS.INSTALLING;
const routerOBTabString = `:activeTab(${Object.values(OB_TABS).join('|')})`;

export const onboarding = (tab = routerOBTabString): string =>
  `/onboarding/${tab}`;

export const sessions = (params?: Record<string, any>): string =>
  queried('/sessions', params);

export const notes = (params?: Record<string, any>): string =>
  queried('/notes', params);
export const bookmarks = (params?: Record<string, any>): string =>
  queried('/bookmarks', params);
export const assist = (params?: Record<string, any>): string =>
  queried('/assist', params);
export const assistStats = (params?: Record<string, any>): string =>
  queried('/assist-stats', params);
export const recordings = (params?: Record<string, any>): string =>
  queried('/recordings', params);
export const multiviewIndex = (params?: Record<string, any>): string =>
  queried('/multiview', params);
export const multiview = (
  sessionsQuery = ':sessionsquery',
  hash?: string | number,
): string => hashed(`/multiview/${sessionsQuery}`, hash);
export const session = (
  sessionId = ':sessionId',
  hash?: string | number,
): string => hashed(`/session/${sessionId}`, hash);
export const liveSession = (
  sessionId = ':sessionId',
  params?: Record<string, any>,
  hash?: string | number,
): string => hashed(queried(`/assist/${sessionId}`, params), hash);

export const errors = (params?: Record<string, any>): string =>
  queried('/errors', params);
export const error = (id = ':errorId', hash?: string | number): string =>
  hashed(`/errors/${id}`, hash);

export const tests = (): string => '/tests';
export const dashboard = (): string => '/dashboard';
export const dashboardMetrics = (): string => '/dashboard/metrics';
export const dashboardSelected = (
  id = ':dashboardId',
  hash?: string | number,
): string => hashed(`/dashboard/${id}`, hash);

export const dashboardMetricDetails = (
  dashboardId = ':dashboardId',
  metricId = ':metricId',
  hash?: string | number,
): string => hashed(`/dashboard/${dashboardId}/metric/${metricId}`, hash);
export const dashboardMetricCreate = (
  dashboardId = ':dashboardId',
  hash?: string | number,
): string => hashed(`/dashboard/${dashboardId}/metric/create`, hash);
export const metrics = (): string => '/metrics';
export const metricCreate = (): string => '/metrics/create';
export const metricDetails = (
  id = ':metricId',
  hash?: string | number,
): string => hashed(`/metrics/${id}`, hash);
export const metricDetailsSub = (
  id = ':metricId',
  subId = ':subId',
  hash?: string | number,
): string => hashed(`/metrics/${id}/details/${subId}`, hash);

export const alerts = (): string => '/alerts';
export const alertCreate = (): string => '/alert/create';
export const alertEdit = (id = ':alertId', hash?: string | number): string =>
  hashed(`/alert/${id}`, hash);

export const spotsList = (): string => '/spots';
export const spot = (id = ':spotId', hash?: string | number): string =>
  hashed(`/view-spot/${id}`, hash);

export const highlights = (): string => '/highlights';

export const kai = (): string => '/kai';
export const dataManagement = {
  activity: () => '/data-management/activity',
  userPage: (id = ':userId', hash?: string | number) =>
    hashed(`/data-management/user/${id}`, hash),
  usersEventsList: (view = ':view(users|events)', hash?: string | number) =>
    hashed(`/data-management/list/${view}`, hash),
  eventPropsPage: (id = ':propId', hash?: string | number) =>
    hashed(`/data-management/list/properties/event/${id}`, hash),
  userPropsPage: (id = ':propId', hash?: string | number) =>
    hashed(`/data-management/list/properties/user/${id}`, hash),
  properties: () => '/data-management/list/properties',
};

const REQUIRED_SITE_ID_ROUTES = [
  ...routeIdRequired,
  liveSession(''),
  session(''),
  sessions(),
  notes(),
  bookmarks(),

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

  highlights(),

  kai(),
  dataManagement.activity(),
  dataManagement.userPage(''),
  dataManagement.usersEventsList(''),
  dataManagement.eventPropsPage(''),
  dataManagement.userPropsPage(''),
];
const routeNeedsSiteId = (path: string): boolean =>
  REQUIRED_SITE_ID_ROUTES.some((r) => path.startsWith(r));
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
  if (
    !isNaN(+pathParts[1]) &&
    routeNeedsSiteId(`/${pathParts.slice(2).join('/')}`)
  )
    return true;
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
  ...changeAvailable,
  sessions(),
  notes(),
  bookmarks(),
  assist(),
  recordings(),
  dashboard(),
  dashboardSelected(),
  metrics(),
  alerts(),
  errors(),
  onboarding(''),
];

export const siteChangeAvailable = (path: string): boolean =>
  SITE_CHANGE_AVAILABLE_ROUTES.some((r) => isRoute(r, path));

export const redirects: Record<string, string> = {
  [client('custom-fields')]: client(CLIENT_TABS.CUSTOM_FIELDS),
};
