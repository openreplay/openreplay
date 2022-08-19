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
  SLOW_PAGE_LOAD = 'slow_page_load',
  CRASH = 'crash',
  CUSTOM = 'custom',
  JS_EXCEPTION = 'js_exception',
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
  ERROR = 'ERROR',
  MISSING_RESOURCE = 'MISSING_RESOURCE',
  SLOW_SESSION = 'SLOW_SESSION',
  CLICK_RAGE = 'CLICK_RAGE',
  CLICK = 'CLICK',
  INPUT = 'INPUT',
  LOCATION = 'LOCATION',
  VIEW = 'VIEW',
  CONSOLE = 'CONSOLE',
  METADATA = 'METADATA',
  CUSTOM = 'CUSTOM',
  URL = 'URL',
  USER_BROWSER = 'USERBROWSER',
  USER_OS = 'USEROS',
  USER_DEVICE = 'USERDEVICE',
  PLATFORM = 'PLATFORM',
  DURATION = 'DURATION',
  REFERRER = 'REFERRER',
  USER_COUNTRY = 'USERCOUNTRY',
  JOURNEY = 'JOURNEY',
  REQUEST = 'REQUEST',
  GRAPHQL = 'GRAPHQL',
  STATEACTION = 'STATEACTION',
  REVID = 'REVID',
  USERANONYMOUSID = 'USERANONYMOUSID',
  USERID = 'USERID',
  ISSUE = 'ISSUE',
  EVENTS_COUNT = 'EVENTS_COUNT',
  UTM_SOURCE = 'UTM_SOURCE',
  UTM_MEDIUM = 'UTM_MEDIUM',
  UTM_CAMPAIGN = 'UTM_CAMPAIGN',

  DOM_COMPLETE = 'DOM_COMPLETE',
  LARGEST_CONTENTFUL_PAINT_TIME = 'LARGEST_CONTENTFUL_PAINT_TIME',
  TIME_BETWEEN_EVENTS = 'TIME_BETWEEN_EVENTS',
  TTFB = 'TTFB',
  AVG_CPU_LOAD = 'AVG_CPU_LOAD',
  AVG_MEMORY_USAGE = 'AVG_MEMORY_USAGE',
  FETCH_FAILED = 'FETCH_FAILED',

  FETCH = 'FETCH',
  FETCH_URL = 'FETCH_URL',
  FETCH_STATUS_CODE = 'FETCH_STATUS_CODE',
  FETCH_METHOD = 'FETCH_METHOD',
  FETCH_DURATION = 'FETCH_DURATION',
  FETCH_REQUEST_BODY = 'FETCH_REQUEST_BODY',
  FETCH_RESPONSE_BODY = 'FETCH_RESPONSE_BODY',

  GRAPHQL_NAME = 'GRAPHQL_NAME',
  GRAPHQL_METHOD = 'GRAPHQL_METHOD',
  GRAPHQL_REQUEST_BODY = 'GRAPHQL_REQUEST_BODY',
  GRAPHQL_RESPONSE_BODY = 'GRAPHQL_RESPONSE_BODY',

  SESSIONS = 'SESSIONS',
  ERRORS = 'js_exception',
}
