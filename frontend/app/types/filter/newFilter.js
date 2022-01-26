import Record from 'Types/Record';
import { FilterType, FilterKey, FilterCategory } from './filterType'
import { countries, platformOptions } from 'App/constants';

const countryOptions = Object.keys(countries).map(i => ({ text: countries[i], value: i }));

const ISSUE_OPTIONS = [
  { text: 'Click Range', value: 'click_rage' },
  { text: 'Dead Click', value: 'dead_click' },
  { text: 'Excessive Scrolling', value: 'excessive_scrolling' },
  { text: 'Bad Request', value: 'bad_request' },
  { text: 'Missing Resource', value: 'missing_resource' },
  { text: 'Memory', value: 'memory' },
  { text: 'CPU', value: 'cpu' },
  { text: 'Slow Resource', value: 'slow_resource' },
  { text: 'Slow Page Load', value: 'slow_page_load' },
  { text: 'Crash', value: 'crash' },
  { text: 'Custom', value: 'custom' },
  { text: 'JS Exception', value: 'js_exception' },
]

const filterKeys = ['is', 'isNot'];
const stringFilterKeys = ['is', 'isNot', 'contains', 'startsWith', 'endsWith', 'notContains'];
const targetFilterKeys = ['on', 'notOn', 'onAny'];
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
    key: 'notContains',
    text: 'not contains',
    value: 'notContains'
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
    key: 'onAny',
    text: 'on any',
    value: 'onAny'
  }
];

export const filterOptions = options.filter(({key}) => filterKeys.includes(key));
export const stringFilterOptions = options.filter(({key}) => stringFilterKeys.includes(key));
export const targetFilterOptions = options.filter(({key}) => targetFilterKeys.includes(key));
export const booleanOptions = [
  { key: 'true', text: 'true', value: 'true' },
  { key: 'false', text: 'false', value: 'false' },
]

export const customOperators = [
  { key: '=', text: '=', value: '=' },
  { key: '<', text: '<', value: '<' },
  { key: '>', text: '>', value: '>' },
  { key: '<=', text: '<=', value: '<=' },
  { key: '>=', text: '>=', value: '>=' },
]

export const filtersMap = {
  [FilterKey.CLICK]: { key: FilterKey.CLICK, type: FilterType.MULTIPLE, category: FilterCategory.INTERACTIONS, label: 'Click', operator: 'on', operatorOptions: targetFilterOptions, icon: 'filters/click', isEvent: true },
  [FilterKey.INPUT]: { key: FilterKey.INPUT, type: FilterType.MULTIPLE, category: FilterCategory.INTERACTIONS, label: 'Input', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/input', isEvent: true },
  [FilterKey.LOCATION]: { key: FilterKey.LOCATION, type: FilterType.MULTIPLE, category: FilterCategory.INTERACTIONS, label: 'Page', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/location', isEvent: true },
  [FilterKey.CUSTOM]: { key: FilterKey.CUSTOM, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'Custom Events', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/custom', isEvent: true },
  [FilterKey.FETCH]: { key: FilterKey.FETCH, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'Fetch', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/fetch', isEvent: true },
  [FilterKey.GRAPHQL]: { key: FilterKey.GRAPHQL, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'GraphQL', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/graphql', isEvent: true },
  [FilterKey.STATEACTION]: { key: FilterKey.STATEACTION, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'StateAction', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/state-action', isEvent: true },
  [FilterKey.ERROR]: { key: FilterKey.ERROR, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'Error', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/error', isEvent: true },
  // [FilterKey.METADATA]: { key: FilterKey.METADATA, type: FilterType.MULTIPLE, category: FilterCategory.METADATA, label: 'Metadata', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/metadata', isEvent: true },

  [FilterKey.USER_OS]: { key: FilterKey.USER_OS, type: FilterType.MULTIPLE, category: FilterCategory.GEAR, label: 'User OS', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/os' },
  [FilterKey.USER_BROWSER]: { key: FilterKey.USER_BROWSER, type: FilterType.MULTIPLE, category: FilterCategory.GEAR, label: 'User Browser', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/browser' },
  [FilterKey.USER_DEVICE]: { key: FilterKey.USER_DEVICE, type: FilterType.MULTIPLE, category: FilterCategory.GEAR, label: 'User Device', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/device' },
  [FilterKey.PLATFORM]: { key: FilterKey.PLATFORM, type: FilterType.MULTIPLE_DROPDOWN, category: FilterCategory.GEAR, label: 'Platform', operator: 'is', operatorOptions: filterOptions, icon: 'filters/platform', options: platformOptions },
  [FilterKey.REVID]: { key: FilterKey.REVID, type: FilterType.MULTIPLE, category: FilterCategory.GEAR, label: 'RevId', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/rev-id' },

  [FilterKey.REFERRER]: { key: FilterKey.REFERRER, type: FilterType.MULTIPLE, category: FilterCategory.RECORDING_ATTRIBUTES, label: 'Referrer', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/referrer' },
  [FilterKey.DURATION]: { key: FilterKey.DURATION, type: FilterType.DURATION, category: FilterCategory.RECORDING_ATTRIBUTES, label: 'Duration', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/duration' },
  [FilterKey.USER_COUNTRY]: { key: FilterKey.USER_COUNTRY, type: FilterType.DROPDOWN, category: FilterCategory.RECORDING_ATTRIBUTES, label: 'User Country', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/country', options: countryOptions },

  [FilterKey.CONSOLE]: { key: FilterKey.CONSOLE, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'Console', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/console' },
  
  
  

  [FilterKey.USERID]: { key: FilterKey.USERID, type: FilterType.MULTIPLE, category: FilterCategory.USER, label: 'UserId', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/userid' },
  [FilterKey.USERANONYMOUSID]: { key: FilterKey.USERANONYMOUSID, type: FilterType.MULTIPLE, category: FilterCategory.USER, label: 'UserAnonymousId', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/userid' },
  
  [FilterKey.DOM_COMPLETE]: { key: FilterKey.DOM_COMPLETE, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'DOM Complete', operator: 'is', operatorOptions: stringFilterOptions, sourcesourceOperatorOptions: customOperators, source: [], icon: 'filters/click', isEvent: true },
  [FilterKey.LARGEST_CONTENTFUL_PAINT_TIME]: { key: FilterKey.LARGEST_CONTENTFUL_PAINT_TIME, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Largest Contentful Paint Time', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click', isEvent: true },
  // [FilterKey.TIME_BETWEEN_EVENTS]: { key: FilterKey.TIME_BETWEEN_EVENTS, type: FilterType.NUMBER, category: FilterCategory.PERFORMANCE, label: 'Time Between Events', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  [FilterKey.TTFB]: { key: FilterKey.TTFB, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Time to First Byte', operator: 'is', operatorOptions: stringFilterOptions, sourceOperatorOptions: customOperators, source: [], icon: 'filters/click', isEvent: true },
  [FilterKey.AVG_CPU_LOAD]: { key: FilterKey.AVG_CPU_LOAD, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Avg CPU Load', operator: 'is', operatorOptions: stringFilterOptions, sourceOperatorOptions: customOperators, source: [], icon: 'filters/click', isEvent: true },
  [FilterKey.AVG_MEMORY_USAGE]: { key: FilterKey.AVG_MEMORY_USAGE, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Avg Memory Usage', operator: 'is', operatorOptions: stringFilterOptions, sourceOperatorOptions: customOperators, source: [], icon: 'filters/click', isEvent: true },
  [FilterKey.FETCH_FAILED]: { key: FilterKey.AVG_MEMORY_USAGE, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Fetch Failed', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click', isEvent: true },
  
  
  // [FilterKey.AVG_CPU_LOAD]: { key: FilterKey.AVG_CPU_LOAD, type: FilterType.NUMBER, category: 'new', label: 'Avg CPU Load', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  // [FilterKey.AVG_MEMORY_USAGE]: { key: FilterKey.AVG_MEMORY_USAGE, type: FilterType.NUMBER, category: 'new', label: 'Avg Memory Usage', operator: 'is', operatorOptions: stringFilterOptions, icon: 'filters/click' },
  // [FilterKey.SLOW_SESSION]: { key: FilterKey.SLOW_SESSION, type: FilterType.BOOLEAN, category: 'new', label: 'Slow Session', operator: 'true', operatorOptions: [{ key: 'true', text: 'true', value: 'true' }], icon: 'filters/click' },
  // [FilterKey.MISSING_RESOURCE]: { key: FilterKey.MISSING_RESOURCE, type: FilterType.BOOLEAN, category: 'new', label: 'Missing Resource', operator: 'true', operatorOptions: [{ key: 'inImages', text: 'in images', value: 'true' }], icon: 'filters/click' },
  // [FilterKey.CLICK_RAGE]: { key: FilterKey.CLICK_RAGE, type: FilterType.BOOLEAN, category: 'new', label: 'Click Rage', operator: 'onAnything', operatorOptions: [{ key: 'onAnything', text: 'on anything', value: 'true' }], icon: 'filters/click' },
  
  [FilterKey.ISSUE]: { key: FilterKey.ISSUE, type: FilterType.ISSUE, category: FilterCategory.JAVASCRIPT, label: 'Issue', operator: 'is', operatorOptions: filterOptions, icon: 'filters/click', options: ISSUE_OPTIONS },
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
  source: [""],
  category: '',
  
  custom: '',
  // target: Target(),
  level: '',
  source: null,
  hasNoValue: false,
  isFilter: false,
  actualValue: '',
  
  operator: '',
  sourceOperator: '=',
  operatorOptions: [],
  sourceOptions: [],
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
    // operator: getOperatorDefault(key),
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