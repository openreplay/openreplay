import Record from 'Types/Record';
import Target from 'Types/target';
import { getEventIcon } from 'Types/filter';

const CLICK = 'CLICK';
const INPUT = 'INPUT';
const LOCATION = 'LOCATION';
const VIEW = 'VIEW_IOS';
const CONSOLE = 'ERROR';
const METADATA = 'METADATA';
const CUSTOM = 'CUSTOM';
const URL = 'URL';
const CLICK_RAGE = 'CLICKRAGE';
const USER_BROWSER  = 'USERBROWSER';
const USER_OS = 'USEROS';
const USER_COUNTRY  = 'USERCOUNTRY';
const USER_DEVICE = 'USERDEVICE';
const PLATFORM = 'PLATFORM';
const DURATION  = 'DURATION';
const REFERRER  = 'REFERRER';
const ERROR = 'ERROR';
const MISSING_RESOURCE = 'MISSINGRESOURCE';
const SLOW_SESSION = 'SLOWSESSION';
const JOURNEY = 'JOUNRNEY';
const FETCH = 'REQUEST';
const GRAPHQL = 'GRAPHQL';
const STATEACTION = 'STATEACTION';
const REVID = 'REVID';
const USERANONYMOUSID = 'USERANONYMOUSID';
const USERID = 'USERID';

const ISSUE = 'ISSUE';
const EVENTS_COUNT = 'EVENTS_COUNT';
const UTM_SOURCE = 'UTM_SOURCE';
const UTM_MEDIUM = 'UTM_MEDIUM';
const UTM_CAMPAIGN = 'UTM_CAMPAIGN';


const DOM_COMPLETE = 'DOM_COMPLETE';
const LARGEST_CONTENTFUL_PAINT_TIME = 'LARGEST_CONTENTFUL_PAINT_TIME';
const TIME_BETWEEN_EVENTS = 'TIME_BETWEEN_EVENTS';
const TTFB = 'TTFB';
const AVG_CPU_LOAD = 'AVG_CPU_LOAD';
const AVG_MEMORY_USAGE = 'AVG_MEMORY_USAGE';

export const KEYS = {
  ERROR,
  MISSING_RESOURCE,
  SLOW_SESSION,
  CLICK_RAGE,
  CLICK,
  INPUT,
  LOCATION,
  VIEW,
  CONSOLE,
  METADATA,
  CUSTOM,
  URL,
  USER_BROWSER,
  USER_OS,
  USER_DEVICE,
  PLATFORM,
  DURATION,
  REFERRER,
  USER_COUNTRY,
  JOURNEY,
  FETCH,
  GRAPHQL,
  STATEACTION,
  REVID,
  USERANONYMOUSID,
  USERID,
  ISSUE,
  EVENTS_COUNT,
  UTM_SOURCE,
  UTM_MEDIUM,
  UTM_CAMPAIGN,
  
  DOM_COMPLETE,
  LARGEST_CONTENTFUL_PAINT_TIME,
  TIME_BETWEEN_EVENTS,
  TTFB,
  AVG_CPU_LOAD,
  AVG_MEMORY_USAGE,
};

const getOperatorDefault = (type) => {
  if (type === KEYS.MISSING_RESOURCE) return 'true';
  if (type === KEYS.SLOW_SESSION) return 'true';
  if (type === KEYS.CLICK_RAGE) return 'true';
  if (type === KEYS.CLICK) return 'on';
  
  return 'is';
}

const getLabel = (event) => {
  if (event.type === KEYS.USER_COUNTRY) return 'Country';
  if (event.type === KEYS.USER_BROWSER) return 'Browser';
  if (event.type === KEYS.USERID) return 'User Id';
  if (event.type === KEYS.USER_DEVICE) return 'Device';
  if (event.type === KEYS.REFERRER) return 'Referrer';

  return event.label || event.type || event.key;
}

export default Record({
  timestamp: 0,
  key: '',
  operator: 'is',
  label: '',
  icon: '',
  type: '',
  value: [""],
  custom: '',
  target: Target(),
  level: '',
  source: null,
  hasNoValue: false,
  isFilter: false,
  icon: '',
  actualValue: '',
}, {
  keyKey: "_key",
  fromJS: ({ value, target, ...event }) => ({
    ...event,
    type: event.type, // camelCased(event.type.toLowerCase()),
    key: event.type === METADATA ? event.label : event.key || event.type, // || camelCased(event.type.toLowerCase()),
    label: getLabel(event),
    target: Target(target),
    operator: event.operator || getOperatorDefault(event.type),
    // value: target ? target.label : event.value,
    value: typeof value === 'string' ? [value] : value,
    icon: event.type ? getEventIcon(event.type) : 'filters/metadata'
  }),
})
