import Record from 'Types/Record';
import { FilterType, FilterKey } from './filterType'

export const CLICK = 'CLICK';
export const INPUT = 'INPUT';
export const LOCATION = 'LOCATION';
export const VIEW = 'VIEW_IOS';
export const CONSOLE = 'ERROR';
export const METADATA = 'METADATA';
export const CUSTOM = 'CUSTOM';
export const URL = 'URL';
export const CLICK_RAGE = 'CLICKRAGE';
export const USER_BROWSER  = 'USERBROWSER';
export const USER_OS = 'USEROS';
export const USER_COUNTRY  = 'USERCOUNTRY';
export const USER_DEVICE = 'USERDEVICE';
export const PLATFORM = 'PLATFORM';
export const DURATION  = 'DURATION';
export const REFERRER  = 'REFERRER';
export const ERROR = 'ERROR';
export const MISSING_RESOURCE = 'MISSINGRESOURCE';
export const SLOW_SESSION = 'SLOWSESSION';
export const JOURNEY = 'JOUNRNEY';
export const FETCH = 'REQUEST';
export const GRAPHQL = 'GRAPHQL';
export const STATEACTION = 'STATEACTION';
export const REVID = 'REVID';
export const USERANONYMOUSID = 'USERANONYMOUSID';
export const USERID = 'USERID';

export const ISSUE = 'ISSUE';
export const EVENTS_COUNT = 'EVENTS_COUNT';
export const UTM_SOURCE = 'UTM_SOURCE';
export const UTM_MEDIUM = 'UTM_MEDIUM';
export const UTM_CAMPAIGN = 'UTM_CAMPAIGN';


export const DOM_COMPLETE = 'DOM_COMPLETE';
export const LARGEST_CONTENTFUL_PAINT_TIME = 'LARGEST_CONTENTFUL_PAINT_TIME';
export const TIME_BETWEEN_EVENTS = 'TIME_BETWEEN_EVENTS';
export const TTFB = 'TTFB';
export const AVG_CPU_LOAD = 'AVG_CPU_LOAD';
export const AVG_MEMORY_USAGE = 'AVG_MEMORY_USAGE';

const ISSUE_OPTIONS = [
  { text: 'Click Range', value: 'click_rage' },
  { text: 'Dead Click', value: 'dead_click' },
]

// export const TYPES = {
//   ERROR,
//   MISSING_RESOURCE,
//   SLOW_SESSION,
//   CLICK_RAGE,
//   CLICK,
//   INPUT,
//   LOCATION,
//   VIEW,
//   CONSOLE,
//   METADATA,
//   CUSTOM,
//   URL,
//   USER_BROWSER,
//   USER_OS,
//   USER_DEVICE,
//   PLATFORM,
//   DURATION,
//   REFERRER,
//   USER_COUNTRY,
//   JOURNEY,
//   FETCH,
//   GRAPHQL,
//   STATEACTION,
//   REVID,
//   USERANONYMOUSID,
//   USERID,
//   ISSUE,
//   EVENTS_COUNT,
//   UTM_SOURCE,
//   UTM_MEDIUM,
//   UTM_CAMPAIGN,
  
//   DOM_COMPLETE,
//   LARGEST_CONTENTFUL_PAINT_TIME,
//   TIME_BETWEEN_EVENTS,
//   TTFB,
//   AVG_CPU_LOAD,
//   AVG_MEMORY_USAGE,
// };

const filterKeys = ['is', 'isNot'];
const stringFilterKeys = ['is', 'isNot', 'contains', 'startsWith', 'endsWith'];
const targetFilterKeys = ['on', 'notOn'];
const signUpStatusFilterKeys = ['isSignedUp', 'notSignedUp'];
const rangeFilterKeys = ['before', 'after', 'on', 'inRange', 'notInRange', 'withInLast', 'notWithInLast'];

const options = [
  {
    key: 'is',
    text: 'is',
    value: 'is'
  }, {
    key: 'isNot',
    text: 'is not',
    value: 'isNot'
  }, {
    key: 'startsWith',
    text: 'starts with',
    value: 'startsWith'
  }, {
    key: 'endsWith',
    text: 'ends with',
    value: 'endsWith'
  }, {
    key: 'contains',
    text: 'contains',
    value: 'contains'
  }, {
    key: 'doesNotContain',
    text: 'does not contain',
    value: 'doesNotContain'
  }, {
    key: 'hasAnyValue',
    text: 'has any value',
    value: 'hasAnyValue'
  }, {
    key: 'hasNoValue',
    text: 'has no value',
    value: 'hasNoValue'
  }, 
  

  {
    key: 'isSignedUp',
    text: 'is signed up',
    value: 'isSignedUp'
  }, {
    key: 'notSignedUp',
    text: 'not signed up',
    value: 'notSignedUp'
  },
  
  
  {
    key: 'before',
    text: 'before',
    value: 'before'
  }, {
    key: 'after',
    text: 'after',
    value: 'after'
  }, {
    key: 'on',
    text: 'on',
    value: 'on'
  }, {
    key: 'notOn',
    text: 'not on',
    value: 'notOn'
  }, {
    key: 'inRage',
    text: 'in rage',
    value: 'inRage'
  }, {
    key: 'notInRage',
    text: 'not in rage',
    value: 'notInRage'
  }, {
    key: 'withinLast',
    text: 'within last',
    value: 'withinLast'
  }, {
    key: 'notWithinLast',
    text: 'not within last',
    value: 'notWithinLast'
  },

  {
    key: 'greaterThan',
    text: 'greater than',
    value: 'greaterThan'
  }, {
    key: 'lessThan',
    text: 'less than',
    value: 'lessThan'
  }, {
    key: 'equal',
    text: 'equal',
    value: 'equal'
  }, {
    key: 'not equal',
    text: 'not equal',
    value: 'not equal'
  },


  {
    key: 'onSelector',
    text: 'on selector',
    value: 'onSelector'
  }, {
    key: 'onText',
    text: 'on text',
    value: 'onText'
  }, {
    key: 'onComponent',
    text: 'on component',
    value: 'onComponent'
  },


  {
    key: 'onAnything',
    text: 'on anything',
    value: 'onAnything'
  }
];

export const filterOptions = options.filter(({key}) => filterKeys.includes(key));
export const stringFilterOptions = options.filter(({key}) => stringFilterKeys.includes(key));
export const targetFilterOptions = options.filter(({key}) => targetFilterKeys.includes(key));
export const booleanOptions = [
  { key: 'true', text: 'true', value: 'true' },
  { key: 'false', text: 'false', value: 'false' },
]

export const filtersMap = {
  [FilterKey.CLICK]: { key: FilterKey.CLICK, type: FilterType.MULTIPLE, category: 'interactions', label: 'Click', operator: 'on', operatorOptions: targetFilterOptions, icon: 'filters/click', isEvent: true },
  [FilterKey.INPUT]: { key: FilterKey.INPUT, type: FilterType.MULTIPLE, category: 'interactions', label: 'Input', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click', isEvent: true },
  [FilterKey.LOCATION]: { key: FilterKey.LOCATION, type: FilterType.MULTIPLE, category: 'interactions', label: 'Page', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click', isEvent: true },

  [FilterKey.USER_OS]: { key: FilterKey.USER_OS, type: FilterType.MULTIPLE, category: 'gear', label: 'User OS', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  [FilterKey.USER_BROWSER]: { key: FilterKey.USER_BROWSER, type: FilterType.MULTIPLE, category: 'gear', label: 'User Browser', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  [FilterKey.USER_DEVICE]: { key: FilterKey.USER_DEVICE, type: FilterType.MULTIPLE, category: 'gear', label: 'User Device', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  [FilterKey.PLATFORM]: { key: FilterKey.PLATFORM, type: FilterType.MULTIPLE, category: 'gear', label: 'Platform', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  [FilterKey.REVID]: { key: FilterKey.REVID, type: FilterType.MULTIPLE, category: 'gear', label: 'RevId', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },

  [FilterKey.REFERRER]: { key: FilterKey.REFERRER, type: FilterType.MULTIPLE, category: 'recording_attributes', label: 'Referrer', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  [FilterKey.DURATION]: { key: FilterKey.DURATION, type: FilterType.NUMBER, category: 'recording_attributes', label: 'Duration', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  [FilterKey.USER_COUNTRY]: { key: FilterKey.USER_COUNTRY, type: FilterType.MULTIPLE, category: 'recording_attributes', label: 'User Country', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },

  [FilterKey.CONSOLE]: { key: FilterKey.CONSOLE, type: FilterType.MULTIPLE, category: 'javascript', label: 'Console', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  [FilterKey.ERROR]: { key: FilterKey.ERROR, type: FilterType.MULTIPLE, category: 'javascript', label: 'Error', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  [FilterKey.FETCH]: { key: FilterKey.FETCH, type: FilterType.MULTIPLE, category: 'javascript', label: 'Fetch', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  [FilterKey.GRAPHQL]: { key: FilterKey.GRAPHQL, type: FilterType.MULTIPLE, category: 'javascript', label: 'GraphQL', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  [FilterKey.STATEACTION]: { key: FilterKey.STATEACTION, type: FilterType.MULTIPLE, category: 'javascript', label: 'StateAction', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },

  [FilterKey.USERID]: { key: FilterKey.USERID, type: FilterType.MULTIPLE, category: 'user', label: 'UserId', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  [FilterKey.USERANONYMOUSID]: { key: FilterKey.USERANONYMOUSID, type: FilterType.MULTIPLE, category: 'user', label: 'UserAnonymousId', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  
  [FilterKey.DOM_COMPLETE]: { key: FilterKey.DOM_COMPLETE, type: FilterType.MULTIPLE, category: 'new', label: 'DOM Complete', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  [FilterKey.LARGEST_CONTENTFUL_PAINT_TIME]: { key: FilterKey.LARGEST_CONTENTFUL_PAINT_TIME, type: FilterType.NUMBER, category: 'new', label: 'Largest Contentful Paint Time', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  [FilterKey.TIME_BETWEEN_EVENTS]: { key: FilterKey.TIME_BETWEEN_EVENTS, type: FilterType.NUMBER, category: 'new', label: 'Time Between Events', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  [FilterKey.TTFB]: { key: FilterKey.TTFB, type: 'time', category: 'new', label: 'TTFB', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  [FilterKey.AVG_CPU_LOAD]: { key: FilterKey.AVG_CPU_LOAD, type: FilterType.NUMBER, category: 'new', label: 'Avg CPU Load', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  [FilterKey.AVG_MEMORY_USAGE]: { key: FilterKey.AVG_MEMORY_USAGE, type: FilterType.NUMBER, category: 'new', label: 'Avg Memory Usage', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  // [FilterKey.SLOW_SESSION]: { key: FilterKey.SLOW_SESSION, type: FilterType.BOOLEAN, category: 'new', label: 'Slow Session', operator: 'true', operatorOptions: [{ key: 'true', text: 'true', value: 'true' }], icon: 'filters/click' },
  [FilterKey.MISSING_RESOURCE]: { key: FilterKey.MISSING_RESOURCE, type: FilterType.BOOLEAN, category: 'new', label: 'Missing Resource', operator: 'true', operatorOptions: [{ key: 'inImages', text: 'in images', value: 'true' }], icon: 'filters/click' },
  // [FilterKey.CLICK_RAGE]: { key: FilterKey.CLICK_RAGE, type: FilterType.BOOLEAN, category: 'new', label: 'Click Rage', operator: 'onAnything', operatorOptions: [{ key: 'onAnything', text: 'on anything', value: 'true' }], icon: 'filters/click' },
  
  [FilterKey.ISSUE]: { key: FilterKey.ISSUE, type: FilterType.ISSUE, category: 'new', label: 'Issue', operator: 'onAnything', operatorOptions: filterOptions, icon: 'filters/click', options: ISSUE_OPTIONS },
  // [FilterKey.URL]: { / [TYPES,TYPES. category: 'interactions', label: 'URL', operator: 'is', operatorOptions: stringFilterOptions },
  // [FilterKey.CUSTOM]: { / [TYPES,TYPES. category: 'interactions', label: 'Custom', operator: 'is', operatorOptions: stringFilterOptions },
  // [FilterKey.METADATA]: { / [TYPES,TYPES. category: 'interactions', label: 'Metadata', operator: 'is', operatorOptions: stringFilterOptions },
}

export default Record({
  timestamp: 0,
  key: '',
  label: '',
  icon: '',
  type: '',
  value: [""],
  category: '',
  
  custom: '',
  // target: Target(),
  level: '',
  source: null,
  hasNoValue: false,
  isFilter: false,
  actualValue: '',
  
  operator: 'is',
  operatorOptions: [],
  isEvent: false,
  index: 0,
  options: [],
}, {
  keyKey: "_key",
  fromJS: ({ key, ...filter }) => ({
    ...filter,
    key,
    type: filter.type, // camelCased(filter.type.toLowerCase()),
    // key: filter.type === METADATA ? filter.label : filter.key || filter.type, // || camelCased(filter.type.toLowerCase()),
    // label: getLabel(filter),
    // target: Target(target),
    operator: getOperatorDefault(key),
    // value: target ? target.label : filter.value,
    // value: typeof value === 'string' ? [value] : value,
    // icon: filter.type ? getfilterIcon(filter.type) : 'filters/metadata'
  }),
})

// const NewFilterType = (key, category, icon, isEvent = false) => {
//   return {
//     key: key,
//     category: category,
//     label: filterMap[key].label,
//     icon: icon,
//     isEvent: isEvent,
//     operators: filterMap[key].operatorOptions,
//     value: [""]
//   }
// }


const getOperatorDefault = (type) => {
  if (type === MISSING_RESOURCE) return 'true';
  if (type === SLOW_SESSION) return 'true';
  if (type === CLICK_RAGE) return 'true';
  if (type === CLICK) return 'on';
  
  return 'is';
}