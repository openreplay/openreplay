export enum FilterCategory {
  INTERACTIONS = 'Interactions',
  GEAR = 'Gear',
  RECORDING_ATTRIBUTES = 'Recording Attributes',
  JAVASCRIPT = 'Javascript',
  USER = 'User Identification',
  METADATA = 'Session & User Metadata',
  PERFORMANCE = 'Performance',
}

export const setQueryParamKeyFromFilterkey = (filterKey: string) => {
  switch (filterKey) {
    case FilterKey.USERID:
      return 'uid';
    case FilterKey.USERANONYMOUSID:
      return 'usera';
    case FilterKey.CLICK:
      return 'clk';
    case FilterKey.INPUT:
      return 'inp';
    case FilterKey.LOCATION:
      return 'loc';
    case FilterKey.USER_OS:
      return 'os';
    case FilterKey.USER_BROWSER:
      return 'browser';
    case FilterKey.USER_DEVICE:
      return 'device';
    case FilterKey.PLATFORM:
      return 'platform';
    case FilterKey.REVID:
      return 'revid';
    case FilterKey.USER_COUNTRY:
      return 'country';
    case FilterKey.USER_CITY:
      return 'city';
    case FilterKey.USER_STATE:
      return 'state';
    case FilterKey.REFERRER:
      return 'ref';
    case FilterKey.CUSTOM:
      return 'ce';
    case FilterKey.STATEACTION:
      return 'sa';
    case FilterKey.ERROR:
      return 'err';
    case FilterKey.ISSUE:
      return 'iss';

    // PERFORMANCE
    case FilterKey.DOM_COMPLETE:
      return 'domc';
    case FilterKey.LARGEST_CONTENTFUL_PAINT_TIME:
      return 'lcp';
    case FilterKey.TTFB:
      return 'ttfb';
    case FilterKey.AVG_CPU_LOAD:
      return 'acpu';
    case FilterKey.AVG_MEMORY_USAGE:
      return 'amem';
    case FilterKey.FETCH_FAILED:
      return 'ff';
    case FilterKey.DURATION:
      return 'duration';
    case FilterKey.FEATURE_FLAG:
      return 'feature_flag';
    case FilterKey.TAGGED_ELEMENT:
      return 'tnw'
  }
};

export const getFilterKeyTypeByKey = (key: string) => {
  switch (key) {
    case 'userId':
    case 'uid':
    case 'userid':
      return FilterKey.USERID;
    case 'usera':
    case 'userAnonymousId':
      return FilterKey.USERANONYMOUSID;
    case 'clk':
    case 'click':
      return FilterKey.CLICK;
    case 'inp':
    case 'input':
      return FilterKey.INPUT;
    case 'loc':
    case 'location':
      return FilterKey.LOCATION;
    case 'os':
    case 'userOs':
      return FilterKey.USER_OS;
    case 'browser':
    case 'userBrowser':
      return FilterKey.USER_BROWSER;
    case 'device':
    case 'userDevice':
      return FilterKey.USER_DEVICE;
    case 'platform':
      return FilterKey.PLATFORM;
    case 'revid':
    case 'revisionId':
    case 'revId':
      return FilterKey.REVID;
    case 'country':
    case 'userCountry':
      return FilterKey.USER_COUNTRY;
    case 'city':
    case 'userCity':
      return FilterKey.USER_CITY;
    case 'state':
    case 'userState':
      return FilterKey.USER_STATE;
    case 'ref':
    case 'referrer':
      return FilterKey.REFERRER;
    case 'ce':
    case 'custom':
    case 'customEvent':
      return FilterKey.CUSTOM;
    case 'sa':
    case 'stateAction':
      return FilterKey.STATEACTION;
    case 'err':
    case 'error':
      return FilterKey.ERROR;
    case 'iss':
    case 'issue':
      return FilterKey.ISSUE;

    // PERFORMANCE
    case 'domc':
    case 'domComplete':
      return FilterKey.DOM_COMPLETE;
    case 'lcp':
    case 'largestContentfulPaintTime':
      return FilterKey.LARGEST_CONTENTFUL_PAINT_TIME;
    case 'ttfb':
    case 'timeToFirstByte':
      return FilterKey.TTFB;
    case 'acpu':
    case 'avgCpuLoad':
      return FilterKey.AVG_CPU_LOAD;
    case 'amem':
    case 'avgMemoryUsage':
      return FilterKey.AVG_MEMORY_USAGE;
    case 'ff':
    case 'fetchFailed':
      return FilterKey.FETCH_FAILED;
    case 'duration':
      return FilterKey.DURATION;
    case FilterKey.FEATURE_FLAG:
      return 'feature_flag';
    case 'tnw':
      return FilterKey.TAGGED_ELEMENT
  }
};

export enum IssueType {
  CLICK_RAGE = 'click_rage',
  DEAD_CLICK = 'dead_click',
  EXCESSIVE_SCROLLING = 'excessive_scrolling',
  BAD_REQUEST = 'bad_request',
  MISSING_RESOURCE = 'missing_resource',
  MEMORY = 'memory',
  CPU = 'cpu',
  SLOW_RESOURCE = 'slow_resource',
  SLOW_PAGE_LOAD = 'slow_pageLoad',
  CRASH = 'crash',
  CUSTOM = 'custom',
  JS_EXCEPTION = 'js_exception',

  MOUSE_THRASHING = 'mouse_thrashing',
}

export enum IssueCategory {
  RESOURCES = 'resources',
  NETWORK = 'network',
  RAGE = 'rage',
  ERRORS = 'errors'
}

export enum FilterType {
  STRING = 'STRING',
  ISSUE = 'ISSUE',
  BOOLEAN = 'BOOLEAN',
  NUMBER = 'NUMBER',
  NUMBER_MULTIPLE = 'NUMBER_MULTIPLE',
  DURATION = 'DURATION',
  MULTIPLE = 'MULTIPLE',
  SUB_FILTERS = 'SUB_FILTERS',
  COUNTRY = 'COUNTRY',
  DROPDOWN = 'DROPDOWN',
  MULTIPLE_DROPDOWN = 'MULTIPLE_DROPDOWN',
  AUTOCOMPLETE_LOCAL = 'AUTOCOMPLETE_LOCAL',
}

export enum FilterKey {
  ERROR = 'error',
  MISSING_RESOURCE = 'missingResource',
  SLOW_SESSION = 'slowSession',
  CLICK_RAGE = 'clickRage',
  CLICK = 'click',
  INPUT = 'input',
  LOCATION = 'location',
  VIEW = 'view',
  CONSOLE = 'console',
  METADATA = 'metadata',
  CUSTOM = 'custom',
  URL = 'url',
  USER_BROWSER = 'userBrowser',
  USER_OS = 'userOs',
  USER_DEVICE = 'userDevice',
  PLATFORM = 'platform',
  DURATION = 'duration',
  REFERRER = 'referrer',
  USER_COUNTRY = 'userCountry',
  USER_CITY = 'userCity',
  USER_STATE = 'userState',
  JOURNEY = 'journey',
  REQUEST = 'request',
  GRAPHQL = 'graphql',
  STATEACTION = 'stateAction',
  REVID = 'revId',
  USERANONYMOUSID = 'userAnonymousId',
  USERID = 'userId',
  ISSUE = 'issue',
  EVENTS_COUNT = 'eventsCount',
  UTM_SOURCE = 'utmSource',
  UTM_MEDIUM = 'utmMedium',
  UTM_CAMPAIGN = 'utmCampaign',

  DOM_COMPLETE = 'domComplete',
  LARGEST_CONTENTFUL_PAINT_TIME = 'largestContentfulPaintTime',
  TIME_BETWEEN_EVENTS = 'timeBetweenEvents',
  TTFB = 'ttfb',
  AVG_CPU_LOAD = 'avgCpuLoad',
  AVG_MEMORY_USAGE = 'avgMemoryUsage',
  FETCH_FAILED = 'fetchFailed',

  FETCH = 'fetch',
  FETCH_URL = 'fetchUrl',
  FETCH_STATUS_CODE = 'fetchStatusCode',
  FETCH_METHOD = 'fetchMethod',
  FETCH_DURATION = 'fetchDuration',
  FETCH_REQUEST_BODY = 'fetchRequestBody',
  FETCH_RESPONSE_BODY = 'fetchResponseBody',

  GRAPHQL_NAME = 'graphqlName',
  GRAPHQL_METHOD = 'graphqlMethod',
  GRAPHQL_REQUEST_BODY = 'graphqlRequestBody',
  GRAPHQL_RESPONSE_BODY = 'graphqlResponseBody',

  SESSIONS = 'sessions',
  ERRORS = 'jsException',

  RESOURCES_COUNT_BY_TYPE = 'resourcesCountByType',
  RESOURCES_LOADING_TIME = 'resourcesLoadingTime',
  AVG_CPU = 'avgCpu',
  AVG_DOM_CONTENT_LOADED = 'avgDomContentLoaded',
  AVG_DOM_CONTENT_LOAD_START = 'avgDomContentLoadStart',
  AVG_FIRST_CONTENTFUL_PIXEL = 'avgFirstContentfulPixel',
  AVG_FIRST_PAINT = 'avgFirstPaint',
  AVG_FPS = 'avgFps',
  AVG_IMAGE_LOAD_TIME = 'avgImageLoadTime',
  AVG_PAGE_LOAD_TIME = 'avgPageLoadTime',
  AVG_PAGES_DOM_BUILD_TIME = 'avgPagesDomBuildtime',
  AVG_PAGES_RESPONSE_TIME = 'avgPagesResponseTime',
  AVG_REQUEST_LOADT_IME = 'avgRequestLoadTime',
  AVG_RESPONSE_TIME = 'avgResponseTime',
  AVG_SESSION_DURATION = 'avgSessionDuration',
  AVG_TILL_FIRST_BYTE = 'avgTillFirstByte',
  AVG_TIME_TO_INTERACTIVE = 'avgTimeToInteractive',
  AVG_TIME_TO_RENDER = 'avgTimeToRender',
  AVG_USED_JS_HEAP_SIZE = 'avgUsedJsHeapSize',
  AVG_VISITED_PAGES = 'avgVisitedPages',
  COUNT_REQUESTS = 'countRequests',
  COUNT_SESSIONS = 'countSessions',

  // Errors
  RESOURCES_BY_PARTY = 'resourcesByParty',
  ERRORS_PER_DOMAINS = 'errorsPerDomains',
  ERRORS_PER_TYPE = 'errorsPerType',
  CALLS_ERRORS = 'callsErrors',
  DOMAINS_ERRORS_4XX = 'domainsErrors4xx',
  DOMAINS_ERRORS_5XX = 'domainsErrors5xx',
  IMPACTED_SESSIONS_BY_JS_ERRORS = 'impactedSessionsByJsErrors',

  // Performance
  CPU = 'cpu',
  CRASHES = 'crashes',
  FPS = 'fps',
  PAGES_DOM_BUILD_TIME = 'pagesDomBuildtime',
  MEMORY_CONSUMPTION = 'memoryConsumption',
  PAGES_RESPONSE_TIME = 'pagesResponseTime',
  PAGES_RESPONSE_TIME_DISTRIBUTION = 'pagesResponseTimeDistribution',
  RESOURCES_VS_VISUALLY_COMPLETE = 'resourcesVsVisuallyComplete',
  SESSIONS_PER_BROWSER = 'sessionsPerBrowser',
  SLOWEST_DOMAINS = 'slowestDomains',
  SPEED_LOCATION = 'speedLocation',
  TIME_TO_RENDER = 'timeToRender',
  IMPACTED_SESSIONS_BY_SLOW_PAGES = 'impactedSessionsBySlowPages',

  // Resources
  BREAKDOWN_OF_LOADED_RESOURCES = 'resourcesCountByType',
  MISSING_RESOURCES = 'missingResources',
  RESOURCE_TYPE_VS_RESPONSE_END = 'resourceTypeVsResponseEnd',
  RESOURCE_FETCH_TIME = 'resourcesLoadingTime',
  SLOWEST_RESOURCES = 'slowestResources',

  CLICKMAP_URL = 'clickMapUrl',
  FEATURE_FLAG = 'featureFlag',
  TAGGED_ELEMENT = 'tag',
}
