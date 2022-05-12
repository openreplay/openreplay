import Record from 'Types/Record';
import { FilterType, FilterKey, FilterCategory } from './filterType'
import filterOptions, { countries, platformOptions } from 'App/constants';
import { capitalize } from 'App/utils';

const countryOptions = Object.keys(countries).map(i => ({ text: countries[i], value: i }));
const containsFilters = [{ key: 'contains', text: 'contains', value: 'contains' }]

export const metaFilter = { key: FilterKey.METADATA, type: FilterType.MULTIPLE, category: FilterCategory.METADATA, label: 'Metadata', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/metadata' };
export const filtersMap = {
  // EVENTS 
  [FilterKey.CLICK]: { key: FilterKey.CLICK, type: FilterType.MULTIPLE, category: FilterCategory.INTERACTIONS, label: 'Click', operator: 'on', operatorOptions: filterOptions.targetOperators, icon: 'filters/click', isEvent: true },
  [FilterKey.INPUT]: { key: FilterKey.INPUT, type: FilterType.MULTIPLE, category: FilterCategory.INTERACTIONS, label: 'Input', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/input', isEvent: true },
  [FilterKey.LOCATION]: { key: FilterKey.LOCATION, type: FilterType.MULTIPLE, category: FilterCategory.INTERACTIONS, label: 'Path', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/location', isEvent: true },
  [FilterKey.CUSTOM]: { key: FilterKey.CUSTOM, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'Custom Events', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/custom', isEvent: true },
  // [FilterKey.REQUEST]: { key: FilterKey.REQUEST, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'Fetch', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/fetch', isEvent: true },
  [FilterKey.FETCH]: { key: FilterKey.FETCH, type: FilterType.SUB_FILTERS, category: FilterCategory.JAVASCRIPT, operator: 'is', label: 'Network Request', filters: [
    { key: FilterKey.FETCH_URL, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'with URL', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/fetch' },
    { key: FilterKey.FETCH_STATUS_CODE, type: FilterType.NUMBER_MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'with status code', operator: '=', operatorOptions: filterOptions.customOperators, icon: 'filters/fetch' },
    { key: FilterKey.FETCH_METHOD, type: FilterType.MULTIPLE_DROPDOWN, category: FilterCategory.PERFORMANCE, label: 'with method', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/fetch', options: filterOptions.methodOptions },
    { key: FilterKey.FETCH_DURATION, type: FilterType.NUMBER, category: FilterCategory.PERFORMANCE, label: 'with duration (ms)', operator: '=', operatorOptions: filterOptions.customOperators, icon: 'filters/fetch' },
    { key: FilterKey.FETCH_REQUEST_BODY, type: FilterType.STRING, category: FilterCategory.PERFORMANCE, label: 'with request body', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/fetch' },
    { key: FilterKey.FETCH_RESPONSE_BODY, type: FilterType.STRING, category: FilterCategory.PERFORMANCE, label: 'with response body', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/fetch' },
  ], icon: 'filters/fetch', isEvent: true },
  [FilterKey.GRAPHQL]: { key: FilterKey.GRAPHQL, type: FilterType.SUB_FILTERS, category: FilterCategory.JAVASCRIPT, label: 'GraphQL', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/graphql', isEvent: true, filters: [
    { key: FilterKey.GRAPHQL_NAME, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'with name', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/fetch' },
    { key: FilterKey.GRAPHQL_METHOD, type: FilterType.MULTIPLE_DROPDOWN, category: FilterCategory.PERFORMANCE, label: 'with method', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/fetch', options: filterOptions.methodOptions },
    { key: FilterKey.GRAPHQL_REQUEST_BODY, type: FilterType.STRING, category: FilterCategory.PERFORMANCE, label: 'with request body', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/fetch' },
    { key: FilterKey.GRAPHQL_RESPONSE_BODY, type: FilterType.STRING, category: FilterCategory.PERFORMANCE, label: 'with response body', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/fetch' },
  ]},
  [FilterKey.STATEACTION]: { key: FilterKey.STATEACTION, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'StateAction', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/state-action', isEvent: true },
  [FilterKey.ERROR]: { key: FilterKey.ERROR, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'Error', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/error', isEvent: true },
  // [FilterKey.METADATA]: { key: FilterKey.METADATA, type: FilterType.MULTIPLE, category: FilterCategory.METADATA, label: 'Metadata', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/metadata', isEvent: true },

  // FILTERS
  [FilterKey.USER_OS]: { key: FilterKey.USER_OS, type: FilterType.MULTIPLE, category: FilterCategory.GEAR, label: 'User OS', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/os' },
  [FilterKey.USER_BROWSER]: { key: FilterKey.USER_BROWSER, type: FilterType.MULTIPLE, category: FilterCategory.GEAR, label: 'User Browser', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/browser' },
  [FilterKey.USER_DEVICE]: { key: FilterKey.USER_DEVICE, type: FilterType.MULTIPLE, category: FilterCategory.GEAR, label: 'User Device', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/device' },
  [FilterKey.PLATFORM]: { key: FilterKey.PLATFORM, type: FilterType.MULTIPLE_DROPDOWN, category: FilterCategory.GEAR, label: 'Platform', operator: 'is', operatorOptions: filterOptions.baseOperators, icon: 'filters/platform', options: platformOptions },
  [FilterKey.REVID]: { key: FilterKey.REVID, type: FilterType.MULTIPLE, category: FilterCategory.GEAR, label: 'Version ID', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'collection' },
  [FilterKey.REFERRER]: { key: FilterKey.REFERRER, type: FilterType.MULTIPLE, category: FilterCategory.RECORDING_ATTRIBUTES, label: 'Referrer', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/arrow-return-right' },
  [FilterKey.DURATION]: { key: FilterKey.DURATION, type: FilterType.DURATION, category: FilterCategory.RECORDING_ATTRIBUTES, label: 'Duration', operator: 'is', operatorOptions: filterOptions.getOperatorsByKeys(['is']), icon: 'filters/duration' },
  [FilterKey.USER_COUNTRY]: { key: FilterKey.USER_COUNTRY, type: FilterType.MULTIPLE_DROPDOWN, category: FilterCategory.USER, label: 'User Country', operator: 'is', operatorOptions: filterOptions.getOperatorsByKeys(['is', 'isAny', 'isNot']), icon: 'filters/country', options: countryOptions },
  // [FilterKey.CONSOLE]: { key: FilterKey.CONSOLE, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'Console', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/console' },
  [FilterKey.USERID]: { key: FilterKey.USERID, type: FilterType.MULTIPLE, category: FilterCategory.USER, label: 'User Id', operator: 'is', operatorOptions: filterOptions.stringOperators.concat([{ text: 'is undefined', value: 'isUndefined'}]), icon: 'filters/userid' },
  [FilterKey.USERANONYMOUSID]: { key: FilterKey.USERANONYMOUSID, type: FilterType.MULTIPLE, category: FilterCategory.USER, label: 'User AnonymousId', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/userid' },

  // PERFORMANCE
  [FilterKey.DOM_COMPLETE]: { key: FilterKey.DOM_COMPLETE, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'DOM Complete', operator: 'isAny', operatorOptions: filterOptions.stringOperatorsPerformance, source: [], icon: 'filters/dom-complete', isEvent: true, hasSource: true, sourceOperator: '>=', sourceType: FilterType.NUMBER, sourceOperatorOptions: filterOptions.customOperators },
  [FilterKey.LARGEST_CONTENTFUL_PAINT_TIME]: { key: FilterKey.LARGEST_CONTENTFUL_PAINT_TIME, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Largest Contentful Paint', operator: 'isAny', operatorOptions: filterOptions.stringOperatorsPerformance, source: [], icon: 'filters/lcpt', isEvent: true, hasSource: true, sourceOperator: '>=', sourceType: FilterType.NUMBER, sourceOperatorOptions: filterOptions.customOperators },
  [FilterKey.TTFB]: { key: FilterKey.TTFB, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Time to First Byte', operator: 'isAny', operatorOptions: filterOptions.stringOperatorsPerformance, source: [], icon: 'filters/ttfb', isEvent: true, hasSource: true, sourceOperator: '>=', sourceType: FilterType.NUMBER, sourceOperatorOptions: filterOptions.customOperators },
  [FilterKey.AVG_CPU_LOAD]: { key: FilterKey.AVG_CPU_LOAD, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Avg CPU Load', operator: 'isAny', operatorOptions: filterOptions.stringOperatorsPerformance, source: [], icon: 'filters/cpu-load', isEvent: true, hasSource: true, sourceOperator: '>=', sourceType: FilterType.NUMBER, sourceOperatorOptions: filterOptions.customOperators },
  [FilterKey.AVG_MEMORY_USAGE]: { key: FilterKey.AVG_MEMORY_USAGE, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Avg Memory Usage', operator: 'isAny', operatorOptions: filterOptions.stringOperatorsPerformance, source: [], icon: 'filters/memory-load', isEvent: true, hasSource: true, sourceOperator: '>=', sourceType: FilterType.NUMBER, sourceOperatorOptions: filterOptions.customOperators },
  [FilterKey.FETCH_FAILED]: { key: FilterKey.FETCH_FAILED, type: FilterType.MULTIPLE, category: FilterCategory.PERFORMANCE, label: 'Failed Request', operator: 'isAny', operatorOptions: filterOptions.stringOperatorsPerformance, icon: 'filters/fetch-failed', isEvent: true },
  [FilterKey.ISSUE]: { key: FilterKey.ISSUE, type: FilterType.ISSUE, category: FilterCategory.JAVASCRIPT, label: 'Issue', operator: 'is', operatorOptions: filterOptions.getOperatorsByKeys(['is', 'isAny', 'isNot']), icon: 'filters/click', options: filterOptions.issueOptions },
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

  filters: [],
}, {
  keyKey: "_key",
  fromJS: ({ value, type, subFilter = false, ...filter }) => {
    let _filter = {};
    if (subFilter) {
      const mainFilter = filtersMap[subFilter];
      const subFilterMap = {}
      mainFilter.filters.forEach(option => {
        subFilterMap[option.key] = option
      })
      _filter = subFilterMap[type]
    } else {
      if (type === FilterKey.METADATA) {
        _filter = filtersMap[filter.source];
      } else {
        _filter = filtersMap[type];
      }
    }
    return {
      ..._filter,
      ...filter,
      key: _filter.key,
      type: _filter.type, // camelCased(filter.type.toLowerCase()),
      value: value.length === 0 || !value ? [""] : value,
    }
  },
})

/**
 * Group filters by category
 * @param {*} filtersMap 
 * @returns 
 */
export const generateFilterOptions = (map) => {
  const filterSection = {};
  Object.keys(map).forEach(key => {
    const filter = map[key];
    if (filterSection.hasOwnProperty(filter.category)) {
      filterSection[filter.category].push(filter);
    } else {
      filterSection[filter.category] = [filter];
    }
  });
  return filterSection;
}

export const generateLiveFilterOptions = (map) => {
  const filterSection = {};

  Object.keys(map).filter(i => map[i].isLive).forEach(key => {
    const filter = map[key];
    filter.operator = 'contains';
    if (filterSection.hasOwnProperty(filter.category)) {
      filterSection[filter.category].push(filter);
    } else {
      filterSection[filter.category] = [filter];
    }
  });
  return filterSection;
}