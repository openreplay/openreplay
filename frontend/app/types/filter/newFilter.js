import Record from 'Types/Record';
import { FilterType, FilterKey, FilterCategory } from './filterType'
import filterOptions, { countries, platformOptions } from 'App/constants';

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

// const filterKeys = ['is', 'isNot'];
// const stringFilterKeys = ['is', 'isNot', 'contains', 'startsWith', 'endsWith', 'notContains'];
// const targetFilterKeys = ['on', 'notOn', 'onAny'];
// const signUpStatusFilterKeys = ['isSignedUp', 'notSignedUp'];
// const rangeFilterKeys = ['before', 'after', 'on', 'inRange', 'notInRange', 'withInLast', 'notWithInLast'];

// const options = [
//   {
//     key: 'is',
//     text: 'is',
//     value: 'is'
//   }, {
//     key: 'isNot',
//     text: 'is not',
//     value: 'isNot'
//   }, {
//     key: 'startsWith',
//     text: 'starts with',
//     value: 'startsWith'
//   }, {
//     key: 'endsWith',
//     text: 'ends with',
//     value: 'endsWith'
//   }, {
//     key: 'contains',
//     text: 'contains',
//     value: 'contains'
//   }, {
//     key: 'notContains',
//     text: 'not contains',
//     value: 'notContains'
//   }, {
//     key: 'hasAnyValue',
//     text: 'has any value',
//     value: 'hasAnyValue'
//   }, {
//     key: 'hasNoValue',
//     text: 'has no value',
//     value: 'hasNoValue'
//   },   
//   {
//     key: 'isSignedUp',
//     text: 'is signed up',
//     value: 'isSignedUp'
//   }, {
//     key: 'notSignedUp',
//     text: 'not signed up',
//     value: 'notSignedUp'
//   },  
//   {
//     key: 'before',
//     text: 'before',
//     value: 'before'
//   }, {
//     key: 'after',
//     text: 'after',
//     value: 'after'
//   }, {
//     key: 'on',
//     text: 'on',
//     value: 'on'
//   }, {
//     key: 'notOn',
//     text: 'not on',
//     value: 'notOn'
//   }, {
//     key: 'inRage',
//     text: 'in rage',
//     value: 'inRage'
//   }, {
//     key: 'notInRage',
//     text: 'not in rage',
//     value: 'notInRage'
//   }, {
//     key: 'withinLast',
//     text: 'within last',
//     value: 'withinLast'
//   }, {
//     key: 'notWithinLast',
//     text: 'not within last',
//     value: 'notWithinLast'
//   },
//   {
//     key: 'greaterThan',
//     text: 'greater than',
//     value: 'greaterThan'
//   }, {
//     key: 'lessThan',
//     text: 'less than',
//     value: 'lessThan'
//   }, {
//     key: 'equal',
//     text: 'equal',
//     value: 'equal'
//   }, {
//     key: 'not equal',
//     text: 'not equal',
//     value: 'not equal'
//   },
//   {
//     key: 'onSelector',
//     text: 'on selector',
//     value: 'onSelector'
//   }, {
//     key: 'onText',
//     text: 'on text',
//     value: 'onText'
//   }, {
//     key: 'onComponent',
//     text: 'on component',
//     value: 'onComponent'
//   },
//   {
//     key: 'onAny',
//     text: 'on any',
//     value: 'onAny'
//   }
// ];

// export const filterOptions = options.filter(({key}) => filterKeys.includes(key));
// export const filterOptions.stringOperators = options.filter(({key}) => stringFilterKeys.includes(key));
// export const filterOptions.targetOperators = options.filter(({key}) => targetFilterKeys.includes(key));
// export const booleanOptions = [
//   { key: 'true', text: 'true', value: 'true' },
//   { key: 'false', text: 'false', value: 'false' },
// ]

// export const filterOptions.customOperators = [
//   { key: '=', text: '=', value: '=' },
//   { key: '<', text: '<', value: '<' },
//   { key: '>', text: '>', value: '>' },
//   { key: '<=', text: '<=', value: '<=' },
//   { key: '>=', text: '>=', value: '>=' },
// ]

export const filtersMap = {
  // EVENTS 
  [FilterKey.CLICK]: { key: FilterKey.CLICK, type: FilterType.MULTIPLE, category: FilterCategory.INTERACTIONS, label: 'Click', operator: 'on', operatorOptions: filterOptions.targetOperators, icon: 'filters/click', isEvent: true },
  [FilterKey.INPUT]: { key: FilterKey.INPUT, type: FilterType.MULTIPLE, category: FilterCategory.INTERACTIONS, label: 'Input', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/input', isEvent: true },
  [FilterKey.LOCATION]: { key: FilterKey.LOCATION, type: FilterType.MULTIPLE, category: FilterCategory.INTERACTIONS, label: 'Page', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/location', isEvent: true },
  [FilterKey.CUSTOM]: { key: FilterKey.CUSTOM, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'Custom Events', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/custom', isEvent: true },
  [FilterKey.FETCH]: { key: FilterKey.FETCH, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'Fetch', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/fetch', isEvent: true },
  [FilterKey.GRAPHQL]: { key: FilterKey.GRAPHQL, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'GraphQL', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/graphql', isEvent: true },
  [FilterKey.STATEACTION]: { key: FilterKey.STATEACTION, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'StateAction', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/state-action', isEvent: true },
  [FilterKey.ERROR]: { key: FilterKey.ERROR, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'Error', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/error', isEvent: true },
  // [FilterKey.METADATA]: { key: FilterKey.METADATA, type: FilterType.MULTIPLE, category: FilterCategory.METADATA, label: 'Metadata', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/metadata', isEvent: true },


  // FILTERS
  [FilterKey.USER_OS]: { key: FilterKey.USER_OS, type: FilterType.MULTIPLE, category: FilterCategory.GEAR, label: 'User OS', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/os' },
  [FilterKey.USER_BROWSER]: { key: FilterKey.USER_BROWSER, type: FilterType.MULTIPLE, category: FilterCategory.GEAR, label: 'User Browser', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/browser' },
  [FilterKey.USER_DEVICE]: { key: FilterKey.USER_DEVICE, type: FilterType.MULTIPLE, category: FilterCategory.GEAR, label: 'User Device', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/device' },
  [FilterKey.PLATFORM]: { key: FilterKey.PLATFORM, type: FilterType.MULTIPLE_DROPDOWN, category: FilterCategory.GEAR, label: 'Platform', operator: 'is', operatorOptions: filterOptions.baseOperators, icon: 'filters/platform', options: platformOptions },
  [FilterKey.REVID]: { key: FilterKey.REVID, type: FilterType.MULTIPLE, category: FilterCategory.GEAR, label: 'RevId', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/rev-id' },
  [FilterKey.REFERRER]: { key: FilterKey.REFERRER, type: FilterType.MULTIPLE, category: FilterCategory.RECORDING_ATTRIBUTES, label: 'Referrer', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/referrer' },
  [FilterKey.DURATION]: { key: FilterKey.DURATION, type: FilterType.DURATION, category: FilterCategory.RECORDING_ATTRIBUTES, label: 'Duration', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/duration' },
  [FilterKey.USER_COUNTRY]: { key: FilterKey.USER_COUNTRY, type: FilterType.DROPDOWN, category: FilterCategory.RECORDING_ATTRIBUTES, label: 'User Country', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/country', options: countryOptions },
  [FilterKey.CONSOLE]: { key: FilterKey.CONSOLE, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'Console', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/console' },
  [FilterKey.USERID]: { key: FilterKey.USERID, type: FilterType.MULTIPLE, category: FilterCategory.USER, label: 'UserId', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/userid' },
  [FilterKey.USERANONYMOUSID]: { key: FilterKey.USERANONYMOUSID, type: FilterType.MULTIPLE, category: FilterCategory.USER, label: 'UserAnonymousId', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/userid' },

  // PERFORMANCE
  [FilterKey.DOM_COMPLETE]: { key: FilterKey.DOM_COMPLETE, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'DOM Complete', operator: 'is', operatorOptions: filterOptions.stringOperators, sourceOperatorOptions: filterOptions.customOperators, source: [], icon: 'filters/dom-complete', isEvent: true, hasSource: true, sourceOperator: '=', sourceType: FilterType.NUMBER },
  [FilterKey.LARGEST_CONTENTFUL_PAINT_TIME]: { key: FilterKey.LARGEST_CONTENTFUL_PAINT_TIME, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Largest Contentful Paint Time', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/lcpt', isEvent: true },
  // [FilterKey.TIME_BETWEEN_EVENTS]: { key: FilterKey.TIME_BETWEEN_EVENTS, type: FilterType.NUMBER, category: FilterCategory.PERFORMANCE, label: 'Time Between Events', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/click' },
  [FilterKey.TTFB]: { key: FilterKey.TTFB, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Time to First Byte', operator: 'is', operatorOptions: filterOptions.stringOperators, sourceOperatorOptions: filterOptions.customOperators, source: [], icon: 'filters/ttfb', isEvent: true },
  [FilterKey.AVG_CPU_LOAD]: { key: FilterKey.AVG_CPU_LOAD, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Avg CPU Load', operator: 'is', operatorOptions: filterOptions.stringOperators, sourceOperatorOptions: filterOptions.customOperators, source: [], icon: 'filters/cpu-load', isEvent: true },
  [FilterKey.AVG_MEMORY_USAGE]: { key: FilterKey.AVG_MEMORY_USAGE, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Avg Memory Usage', operator: 'is', operatorOptions: filterOptions.stringOperators, sourceOperatorOptions: filterOptions.customOperators, source: [], icon: 'filters/memory-load', isEvent: true },
  [FilterKey.FETCH_FAILED]: { key: FilterKey.AVG_MEMORY_USAGE, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Fetch Failed', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/fetch-failed', isEvent: true },
  [FilterKey.ISSUE]: { key: FilterKey.ISSUE, type: FilterType.ISSUE, category: FilterCategory.JAVASCRIPT, label: 'Issue', operator: 'is', operatorOptions: filterOptions.baseOperators, icon: 'filters/click', options: ISSUE_OPTIONS },
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
  
  hasNoValue: false,
  isFilter: false,
  actualValue: '',
  
  hasSource: false,
  source: [""],
  sourceType: '',
  sourceOperator: '=',
  sourceOperatorOptions: [],

  operator: '',
  operatorOptions: [],  
  isEvent: false,
  index: 0,
  options: [],
}, {
  keyKey: "_key",
  fromJS: ({ value, type, ...filter }) => {
    const _filter = filtersMap[type]
    return {
      ...filter,
      ..._filter,
      key: _filter.key,
      type: _filter.type, // camelCased(filter.type.toLowerCase()),
      value: value
    }
  },
})

// const getOperatorDefault = (type) => {
//   if (type === MISSING_RESOURCE) return 'true';
//   if (type === SLOW_SESSION) return 'true';
//   if (type === CLICK_RAGE) return 'true';
//   if (type === CLICK) return 'on';
  
//   return 'is';
// }