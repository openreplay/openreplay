const hashed = (path, hash) => {
  if ((typeof hash === 'string' && hash !== '') || typeof hash === 'number') {
    return `${ path }#${ hash }`;
  }
  return path;
};

export const queried = (path, params) => {
  const keys = typeof params === 'object' && params !== null && Object.keys(params)
    .filter(key => /string|number|boolean/.test(typeof params[ key ]));
  if (keys && keys.length > 0) {
    const queriedPath = path + '?' + keys
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[ k ]))
      .join('&');
    return queriedPath;
  }
  return path;
};

export const parseQuery = (location, avaliableQueryParams) => {
  const params = {};
  location.search
    .substring(1)
    .split('&')
    .map(param => param.split('='))
    .map(kv => kv.map(decodeURIComponent))
    .filter(([ paramName ]) => !avaliableQueryParams || avaliableQueryParams.includes(paramName))
    .map(([ paramName, paramValue ]) => { params[ paramName ] = paramValue; });
  return params;
};

export const removeQueryParams = (location, removingParams = []) => {
  const rp = typeof removingParams === 'string' ? [ removingParams ] : removingParams;
  const search = location.search
    .substring(1)
    .split('&')
    .map(param => param.split('='))
    .filter(([ paramName ]) => !rp.includes(decodeURIComponent(paramName)))
    .map(pair => pair.join('='))
    .join('&'); // add '?' ?
  return { ...location, search };
};

export const addQueryParams = (location, params) => {
  const search = queried('', { ...parseQuery(location), ...params });
  return { ...location, search };
};

export const setQueryParams = (location, params) => {
  const search = queried('', { ...params });
  return { ...location, search };
};

export const login = () => '/login';
export const signup = () => '/signup';

export const forgotPassword = () => '/reset-password';

export const CLIENT_TABS = {
  INTEGRATIONS: 'integrations',
  PROFILE: 'account',
  MANAGE_USERS: 'manage-users',
  MANAGE_ROLES: 'manage-roles',
  SITES: 'projects',  
  CUSTOM_FIELDS: 'metadata',
  WEBHOOKS: 'webhooks',
  NOTIFICATIONS: 'notifications',
};
export const CLIENT_DEFAULT_TAB = CLIENT_TABS.PROFILE;
const routerClientTabString = `:activeTab(${ Object.values(CLIENT_TABS).join('|') })`;
export const client = (tab = routerClientTabString) => `/client/${ tab }`;

export const OB_TABS = {
  INSTALLING: 'installing',
  IDENTIFY_USERS: 'identify-users',
  MANAGE_USERS: 'manage-users',
  INTEGRATIONS: 'integrations',
};
export const OB_DEFAULT_TAB = OB_TABS.INSTALLING;
const routerOBTabString = `:activeTab(${ Object.values(OB_TABS).join('|') })`;

export const onboarding = (tab = routerOBTabString) => `/onboarding/${ tab }`;

export const sessions = params => queried('/sessions', params);

export const session = (sessionId = ':sessionId', hash) => hashed(`/session/${ sessionId }`, hash);
export const liveSession = (sessionId = ':sessionId', hash) => hashed(`/live/session/${ sessionId }`, hash);

export const errors = params => queried('/errors', params);
export const error = (id = ':errorId', hash) => hashed(`/errors/${ id }`, hash);

export const funnel = (id = ':funnelId', hash) => hashed(`/funnels/${ id }`, hash);
export const funnelIssue = (id = ':funnelId', issueId = ':issueId', hash) => hashed(`/funnels/${ id }/${ issueId}`, hash);

export const tests = () => '/tests';

export const testBuilderNew = () => '/test-builder';

export const testBuilder = (testId = ':testId') => `/test-builder/${ testId }`;

export const dashboard = () => '/metrics';

export const RESULTS_QUERY_KEY = 'results';
export const METRICS_QUERY_KEY = 'metrics';
export const SOURCE_QUERY_KEY = 'source';
export const WIDGET_QUERY_KEY = 'widget';

const REQUIRED_SITE_ID_ROUTES = [ liveSession(''), session(''), sessions(), dashboard(''), error(''), errors(), onboarding(''), funnel(''), funnelIssue(''), ];
const routeNeedsSiteId = path => REQUIRED_SITE_ID_ROUTES.some(r => path.startsWith(r));
const siteIdToUrl = (siteId = ':siteId') => {
  if (Array.isArray(siteId)) {
    return `:siteId(${ siteId.join('|') })`;
  }
  return siteId;
}
export const withSiteId = (route, siteId = ':siteId') => routeNeedsSiteId(route) ? `/${ siteIdToUrl(siteId) }${ route }` : route;
export const hasSiteId = (path) => {
  const pathParts = path.split('/');
  if (!isNaN(+pathParts[1]) && // [0] is empty for '/all/paths'
    routeNeedsSiteId("/" + pathParts.slice(2).join('/'))) return true;
  return false;
}

export function isRoute(route, path){
  const pathParts = path.split('/');
  const routeParts = withSiteId(route).split('/');
  return routeParts.length === pathParts.length &&
    routeParts.every((p, i) => p.startsWith(':') || p === pathParts[ i ]);
}

const SITE_CHANGE_AVALIABLE_ROUTES = [ sessions(),  dashboard(), errors(), onboarding('')];
export const siteChangeAvaliable = path => SITE_CHANGE_AVALIABLE_ROUTES.some(r => isRoute(r, path));


export const redirects = Object.entries({
  [ client('custom-fields') ]: client(CLIENT_TABS.CUSTOM_FIELDS),
});