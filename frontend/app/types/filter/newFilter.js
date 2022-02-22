import Record from 'Types/Record';
import { FilterType, FilterKey, FilterCategory } from './filterType'
import filterOptions, { countries, platformOptions } from 'App/constants';
import { capitalize } from 'App/utils';

const countryOptions = Object.keys(countries).map(i => ({ text: countries[i], value: i }));
const containsFilters = [{ key: 'contains', text: 'contains', value: 'contains' }]

const ISSUE_OPTIONS = [
  { text: 'Click Rage', value: 'click_rage' },
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

export const filtersMap = {
  // EVENTS 
  [FilterKey.CLICK]: { key: FilterKey.CLICK, type: FilterType.MULTIPLE, category: FilterCategory.INTERACTIONS, label: 'Click', operator: 'on', operatorOptions: filterOptions.targetOperators, icon: 'filters/click', isEvent: true },
  [FilterKey.INPUT]: { key: FilterKey.INPUT, type: FilterType.MULTIPLE, category: FilterCategory.INTERACTIONS, label: 'Input', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/input', isEvent: true },
  [FilterKey.LOCATION]: { key: FilterKey.LOCATION, type: FilterType.MULTIPLE, category: FilterCategory.INTERACTIONS, label: 'Page', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/location', isEvent: true },
  [FilterKey.CUSTOM]: { key: FilterKey.CUSTOM, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'Custom Events', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/custom', isEvent: true },
  [FilterKey.REQUEST]: { key: FilterKey.REQUEST, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'Fetch', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/fetch', isEvent: true },
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
  [FilterKey.DURATION]: { key: FilterKey.DURATION, type: FilterType.DURATION, category: FilterCategory.RECORDING_ATTRIBUTES, label: 'Duration', operator: 'is', operatorOptions: filterOptions.getOperatorsByKeys(['is']), icon: 'filters/duration' },
  [FilterKey.USER_COUNTRY]: { key: FilterKey.USER_COUNTRY, type: FilterType.MULTIPLE_DROPDOWN, category: FilterCategory.RECORDING_ATTRIBUTES, label: 'User Country', operator: 'is', operatorOptions: filterOptions.getOperatorsByKeys(['is', 'isAny', 'isNot']), icon: 'filters/country', options: countryOptions },
  // [FilterKey.CONSOLE]: { key: FilterKey.CONSOLE, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'Console', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/console' },
  [FilterKey.USERID]: { key: FilterKey.USERID, type: FilterType.MULTIPLE, category: FilterCategory.USER, label: 'User Id', operator: 'is', operatorOptions: filterOptions.stringOperators.concat([{ text: 'is undefined', value: 'isUndefined'}]), icon: 'filters/userid' },
  [FilterKey.USERANONYMOUSID]: { key: FilterKey.USERANONYMOUSID, type: FilterType.MULTIPLE, category: FilterCategory.USER, label: 'User AnonymousId', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/userid' },

  // PERFORMANCE
  [FilterKey.DOM_COMPLETE]: { key: FilterKey.DOM_COMPLETE, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'DOM Complete', operator: 'isAny', operatorOptions: filterOptions.stringOperators, source: [], icon: 'filters/dom-complete', isEvent: true, hasSource: true, sourceOperator: '=', sourceType: FilterType.NUMBER, sourceOperatorOptions: filterOptions.customOperators },
  [FilterKey.LARGEST_CONTENTFUL_PAINT_TIME]: { key: FilterKey.LARGEST_CONTENTFUL_PAINT_TIME, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Largest Contentful Paint', operator: 'isAny', operatorOptions: filterOptions.stringOperators, source: [], icon: 'filters/lcpt', isEvent: true, hasSource: true, sourceOperator: '=', sourceType: FilterType.NUMBER, sourceOperatorOptions: filterOptions.customOperators },
  [FilterKey.TTFB]: { key: FilterKey.TTFB, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Time to First Byte', operator: 'isAny', operatorOptions: filterOptions.stringOperators, source: [], icon: 'filters/ttfb', isEvent: true, hasSource: true, sourceOperator: '=', sourceType: FilterType.NUMBER, sourceOperatorOptions: filterOptions.customOperators },
  [FilterKey.AVG_CPU_LOAD]: { key: FilterKey.AVG_CPU_LOAD, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Avg CPU Load', operator: 'isAny', operatorOptions: filterOptions.stringOperators, source: [], icon: 'filters/cpu-load', isEvent: true, hasSource: true, sourceOperator: '=', sourceType: FilterType.NUMBER, sourceOperatorOptions: filterOptions.customOperators },
  [FilterKey.AVG_MEMORY_USAGE]: { key: FilterKey.AVG_MEMORY_USAGE, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Avg Memory Usage', operator: 'isAny', operatorOptions: filterOptions.stringOperators, source: [], icon: 'filters/memory-load', isEvent: true, hasSource: true, sourceOperator: '=', sourceType: FilterType.NUMBER, sourceOperatorOptions: filterOptions.customOperators },
  [FilterKey.FETCH_FAILED]: { key: FilterKey.FETCH_FAILED, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Failed Request', operator: 'isAny', operatorOptions: filterOptions.stringOperators, icon: 'filters/fetch-failed', isEvent: true },
  [FilterKey.ISSUE]: { key: FilterKey.ISSUE, type: FilterType.ISSUE, category: FilterCategory.JAVASCRIPT, label: 'Issue', operator: 'is', operatorOptions: filterOptions.baseOperators, icon: 'filters/click', options: ISSUE_OPTIONS },
}

export const liveFiltersMap = {
  [FilterKey.USERID]: { key: FilterKey.USERID, type: FilterType.STRING, category: FilterCategory.USER, label: 'User Id', operator: 'contains', operatorOptions: containsFilters, icon: 'filters/userid', isLive: true },
}

/**
 * Add a new filter to the filter list
 * @param {*} category 
 * @param {*} key 
 * @param {*} type 
 * @param {*} operator 
 * @param {*} operatorOptions 
 * @param {*} icon 
 */
export const addElementToFiltersMap = (
  category = FilterCategory.METADATA,
  key,
  type = FilterType.MULTIPLE,
  operator = 'is',
  operatorOptions = filterOptions.stringOperators,
  icon = 'filters/metadata'
) => {
  filtersMap[key] = { key, type, category, label: capitalize(key), operator: operator, operatorOptions, icon, isLive: true }
}

export const addElementToLiveFiltersMap = (
  category = FilterCategory.METADATA,
  key,
  type = FilterType.STRING,
  operator = 'contains',
  operatorOptions = containsFilters,
  icon = 'filters/metadata'
) => {
  liveFiltersMap[key] = { key, type, category, label: capitalize(key), operator: operator, operatorOptions, icon, isLive: true }
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
  fromJS: ({ value, key, type, ...filter }) => {
    // const _filter = filtersMap[key] || filtersMap[type] || {};
    const _filter = filtersMap[type];
    return {
      ...filter,
      ..._filter,
      key: _filter.key,
      type: _filter.type, // camelCased(filter.type.toLowerCase()),
      value: value.length === 0 ? [""] : value, // make sure there an empty value
    }
  },
})

/**
 * Group filters by category
 * @param {*} filtersMap 
 * @returns 
 */
export const generateFilterOptions = (map) => {
  const _options = {};
  Object.keys(map).forEach(key => {
    const filter = map[key];
    if (_options.hasOwnProperty(filter.category)) {
      _options[filter.category].push(filter);
    } else {
      _options[filter.category] = [filter];
    }
  });
  return _options;
}

export const generateLiveFilterOptions = (map) => {
  const _options = {};

  Object.keys(map).filter(i => map[i].isLive).forEach(key => {
    const filter = map[key];
    filter.operator = 'contains';
    // filter.type = FilterType.STRING;
    // filter.type = FilterType.AUTOCOMPLETE_LOCAL;
    // filter.options = countryOptions;
    // filter.operatorOptions = [{ key: 'contains', text: 'contains', value: 'contains' }]
    if (_options.hasOwnProperty(filter.category)) {
      _options[filter.category].push(filter);
    } else {
      _options[filter.category] = [filter];
    }
  });
  return _options;
}