import { observable } from 'mobx';

import filterOptions, { countries, platformOptions } from 'App/constants';
import {
  clickSelectorOperators,
  issueOptions,
} from 'App/constants/filterOptions';

import { FilterCategory, FilterKey, FilterType } from './filterType';

const countryOptions = Object.keys(countries).map((i) => ({
  label: countries[i],
  value: i,
}));

const filterOrder = {
  [FilterCategory.EVENTS]: 0,
  [FilterCategory.AUTOCAPTURE]: 1,
  [FilterCategory.DEVTOOLS]: 2,
  [FilterCategory.USER]: 3,
  [FilterCategory.SESSION]: 4,
  [FilterCategory.ISSUE]: 5,
  [FilterCategory.METADATA]: 6,
};

const mobileFilters = [
  {
    key: FilterKey.CLICK_MOBILE,
    type: FilterType.MULTIPLE,
    category: FilterCategory.EVENTS,
    subCategory: FilterCategory.AUTOCAPTURE,
    label: 'Tap',
    operator: 'on',
    operatorOptions: filterOptions.targetOperators,
    icon: 'filters/click',
    isEvent: true,
  },
  {
    key: FilterKey.INPUT_MOBILE,
    type: FilterType.MULTIPLE,
    category: FilterCategory.EVENTS,
    subCategory: FilterCategory.AUTOCAPTURE,
    label: 'Text Input',
    placeholder: 'Enter input label name',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/input',
    isEvent: true,
  },
  {
    key: FilterKey.VIEW_MOBILE,
    type: FilterType.MULTIPLE,
    category: FilterCategory.EVENTS,
    subCategory: FilterCategory.AUTOCAPTURE,
    label: 'Screen',
    placeholder: 'Enter screen name',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/screen',
    isEvent: true,
  },
  {
    key: FilterKey.CUSTOM_MOBILE,
    type: FilterType.MULTIPLE,
    category: FilterCategory.EVENTS,
    label: 'Custom Events',
    placeholder: 'Enter event key',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/custom',
    isEvent: true,
  },
  {
    key: FilterKey.ERROR_MOBILE,
    type: FilterType.MULTIPLE,
    category: FilterCategory.DEVTOOLS,
    label: 'Error Message',
    placeholder: 'E.g. Uncaught SyntaxError',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/error',
    isEvent: true,
  },
  {
    key: FilterKey.SWIPE_MOBILE,
    type: FilterType.MULTIPLE,
    category: FilterCategory.EVENTS,
    subCategory: FilterCategory.AUTOCAPTURE,
    label: 'Swipe',
    operator: 'on',
    operatorOptions: filterOptions.targetOperators,
    icon: 'filters/chevrons-up-down',
    isEvent: true,
  },
];

const issueFilters = issueOptions.map((i) => ({
  key: `${FilterKey.ISSUE}_${i.value}`,
  type: FilterType.ISSUE,
  category: FilterCategory.ISSUE,
  label: i.label,
  value: i.value,
  placeholder: 'Select an issue',
  operator: 'is',
  operatorOptions: filterOptions.getOperatorsByKeys(['is', 'isAny', 'isNot']),
  icon: 'filters/click',
  options: filterOptions.issueOptions,
}));
export const filters = [
  ...mobileFilters,
  {
    key: FilterKey.CLICK,
    type: FilterType.MULTIPLE,
    category: FilterCategory.EVENTS,
    subCategory: FilterCategory.AUTOCAPTURE,
    label: 'Click',
    operator: 'on',
    operatorOptions: filterOptions.targetOperators.concat(
      clickSelectorOperators,
    ),
    icon: 'filters/click',
    isEvent: true,
  },
  {
    key: FilterKey.INPUT,
    type: FilterType.MULTIPLE,
    category: FilterCategory.EVENTS,
    subCategory: FilterCategory.AUTOCAPTURE,
    label: 'Text Input',
    placeholder: 'Enter input label name',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/input',
    isEvent: true,
  },
  {
    key: FilterKey.LOCATION,
    type: FilterType.MULTIPLE,
    category: FilterCategory.EVENTS,
    subCategory: FilterCategory.AUTOCAPTURE,
    label: 'Visited URL',
    placeholder: 'Enter path',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/location',
    isEvent: true,
  },
  {
    key: FilterKey.TAGGED_ELEMENT,
    type: FilterType.MULTIPLE_DROPDOWN,
    category: FilterCategory.EVENTS,
    subCategory: FilterCategory.AUTOCAPTURE,
    label: 'Tagged Element',
    operator: 'is',
    isEvent: true,
    icon: 'filters/tag-element',
    operatorOptions: filterOptions.tagElementOperators,
    options: [],
  },
  {
    key: FilterKey.CUSTOM,
    type: FilterType.MULTIPLE,
    category: FilterCategory.EVENTS,
    label: 'Custom Events',
    placeholder: 'Enter event key',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/custom',
    isEvent: true,
  },
  // { key: FilterKey.REQUEST, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'Fetch', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/fetch', isEvent: true },
  {
    key: FilterKey.FETCH,
    type: FilterType.SUB_FILTERS,
    category: FilterCategory.DEVTOOLS,
    operator: 'is',
    label: 'Network Request',
    filters: [
      {
        key: FilterKey.FETCH_URL,
        type: FilterType.MULTIPLE,
        category: FilterCategory.DEVTOOLS,
        label: 'with URL',
        placeholder: 'Enter path or URL',
        operator: 'is',
        operatorOptions: filterOptions.stringOperators,
        icon: 'filters/fetch',
      },
      {
        key: FilterKey.FETCH_STATUS_CODE,
        type: FilterType.NUMBER_MULTIPLE,
        category: FilterCategory.DEVTOOLS,
        label: 'with status code',
        placeholder: 'Enter status code',
        operator: '=',
        operatorOptions: filterOptions.customOperators,
        icon: 'filters/fetch',
      },
      {
        key: FilterKey.FETCH_METHOD,
        type: FilterType.MULTIPLE_DROPDOWN,
        category: FilterCategory.DEVTOOLS,
        label: 'with method',
        operator: 'is',
        placeholder: 'Select method type',
        operatorOptions: filterOptions.stringOperatorsLimited,
        icon: 'filters/fetch',
        options: filterOptions.methodOptions,
      },
      {
        key: FilterKey.FETCH_DURATION,
        type: FilterType.NUMBER,
        category: FilterCategory.DEVTOOLS,
        label: 'with duration (ms)',
        placeholder: 'E.g. 12',
        operator: '=',
        operatorOptions: filterOptions.customOperators,
        icon: 'filters/fetch',
      },
      {
        key: FilterKey.FETCH_REQUEST_BODY,
        type: FilterType.STRING,
        category: FilterCategory.DEVTOOLS,
        label: 'with request body',
        operator: 'is',
        operatorOptions: filterOptions.stringOperators,
        icon: 'filters/fetch',
      },
      {
        key: FilterKey.FETCH_RESPONSE_BODY,
        type: FilterType.STRING,
        category: FilterCategory.DEVTOOLS,
        label: 'with response body',
        operator: 'is',
        operatorOptions: filterOptions.stringOperators,
        icon: 'filters/fetch',
      },
    ],
    icon: 'filters/fetch',
    isEvent: true,
  },
  {
    key: FilterKey.GRAPHQL,
    type: FilterType.SUB_FILTERS,
    category: FilterCategory.DEVTOOLS,
    label: 'GraphQL',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/graphql',
    isEvent: true,
    filters: [
      {
        key: FilterKey.GRAPHQL_NAME,
        type: FilterType.MULTIPLE,
        category: FilterCategory.DEVTOOLS,
        label: 'with name',
        operator: 'is',
        operatorOptions: filterOptions.stringOperators,
        icon: 'filters/fetch',
      },
      {
        key: FilterKey.GRAPHQL_METHOD,
        type: FilterType.MULTIPLE_DROPDOWN,
        category: FilterCategory.DEVTOOLS,
        label: 'with method',
        operator: 'is',
        operatorOptions: filterOptions.stringOperatorsLimited,
        icon: 'filters/fetch',
        options: filterOptions.methodOptions,
      },
      {
        key: FilterKey.GRAPHQL_REQUEST_BODY,
        type: FilterType.STRING,
        category: FilterCategory.DEVTOOLS,
        label: 'with request body',
        operator: 'is',
        operatorOptions: filterOptions.stringOperators,
        icon: 'filters/fetch',
      },
      {
        key: FilterKey.GRAPHQL_RESPONSE_BODY,
        type: FilterType.STRING,
        category: FilterCategory.DEVTOOLS,
        label: 'with response body',
        operator: 'is',
        operatorOptions: filterOptions.stringOperators,
        icon: 'filters/fetch',
      },
    ],
  },
  {
    key: FilterKey.STATEACTION,
    type: FilterType.MULTIPLE,
    category: FilterCategory.DEVTOOLS,
    label: 'State Action',
    placeholder: 'E.g. 12',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/state-action',
    isEvent: true,
  },
  {
    key: FilterKey.ERROR,
    type: FilterType.MULTIPLE,
    category: FilterCategory.DEVTOOLS,
    label: 'Error Message',
    placeholder: 'E.g. Uncaught SyntaxError',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/error',
    isEvent: true,
  },
  // { key: FilterKey.METADATA, type: FilterType.MULTIPLE, category: FilterCategory.METADATA, label: 'Metadata', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/metadata', isEvent: true },

  // FILTERS
  {
    key: FilterKey.REFERRER,
    type: FilterType.MULTIPLE,
    category: FilterCategory.SESSION,
    label: 'Referrer',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/arrow-return-right',
  },
  {
    key: FilterKey.DURATION,
    type: FilterType.DURATION,
    category: FilterCategory.SESSION,
    label: 'Duration',
    operator: 'is',
    operatorOptions: filterOptions.getOperatorsByKeys(['is']),
    icon: 'filters/duration',
  },
  {
    key: FilterKey.UTM_SOURCE,
    type: FilterType.MULTIPLE,
    category: FilterCategory.SESSION,
    label: 'UTM Source',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/country',
  },
  {
    key: FilterKey.UTM_MEDIUM,
    type: FilterType.MULTIPLE,
    category: FilterCategory.SESSION,
    label: 'UTM Medium',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/country',
  },
  {
    key: FilterKey.UTM_CAMPAIGN,
    type: FilterType.MULTIPLE,
    category: FilterCategory.SESSION,
    label: 'UTM Campaign',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/country',
  },
  {
    key: FilterKey.USER_COUNTRY,
    type: FilterType.MULTIPLE_DROPDOWN,
    category: FilterCategory.SESSION,
    label: 'Country',
    operator: 'is',
    operatorOptions: filterOptions.getOperatorsByKeys(['is', 'isAny', 'isNot']),
    icon: 'filters/country',
    options: countryOptions,
  },
  {
    key: FilterKey.USER_CITY,
    type: FilterType.MULTIPLE,
    category: FilterCategory.SESSION,
    label: 'City',
    operator: 'is',
    operatorOptions: filterOptions.getOperatorsByKeys(['is', 'isAny', 'isNot']),
    icon: 'filters/country',
    options: countryOptions,
  },
  {
    key: FilterKey.USER_STATE,
    type: FilterType.MULTIPLE,
    category: FilterCategory.SESSION,
    label: 'State / Province',
    operator: 'is',
    operatorOptions: filterOptions.getOperatorsByKeys(['is', 'isAny', 'isNot']),
    icon: 'filters/country',
    options: countryOptions,
  },
  // { key: FilterKey.CONSOLE, type: FilterType.MULTIPLE, category: FilterCategory.JAVASCRIPT, label: 'Console', operator: 'is', operatorOptions: filterOptions.stringOperators, icon: 'filters/console' },
  {
    key: FilterKey.USERID,
    type: FilterType.MULTIPLE,
    category: FilterCategory.USER,
    label: 'User Id',
    placeholder: 'E.g. Alex, or alex@domain.com, or EMP123',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators.concat([
      { label: 'is undefined', value: 'isUndefined' },
    ]),
    icon: 'filters/userid',
  },
  {
    key: FilterKey.USERANONYMOUSID,
    type: FilterType.MULTIPLE,
    category: FilterCategory.USER,
    label: 'User AnonymousId',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/userid',
  },

  {
    key: FilterKey.AVG_CPU_LOAD,
    type: FilterType.MULTIPLE,
    category: FilterCategory.DEVTOOLS,
    label: 'Avg CPU Load',
    placeholder: 'Enter path',
    operator: 'isAny',
    operatorOptions: filterOptions.stringOperatorsPerformance,
    source: [],
    icon: 'filters/cpu-load',
    isEvent: true,
    hasSource: true,
    sourceOperator: '>=',
    sourcePlaceholder: 'E.g. 12',
    sourceUnit: '%',
    sourceType: FilterType.NUMBER,
    sourceOperatorOptions: filterOptions.customOperators,
  },
  {
    key: FilterKey.DOM_COMPLETE,
    type: FilterType.MULTIPLE,
    category: FilterCategory.DEVTOOLS,
    label: 'DOM Complete',
    placeholder: 'Enter path',
    operator: 'isAny',
    operatorOptions: filterOptions.stringOperatorsPerformance,
    source: [],
    icon: 'filters/dom-complete',
    isEvent: true,
    hasSource: true,
    sourceOperator: '>=',
    sourcePlaceholder: 'E.g. 12',
    sourceUnit: 'ms',
    sourceType: FilterType.NUMBER,
    sourceOperatorOptions: filterOptions.customOperators,
  },
  {
    key: FilterKey.LARGEST_CONTENTFUL_PAINT_TIME,
    type: FilterType.MULTIPLE,
    category: FilterCategory.DEVTOOLS,
    label: 'Largest Contentful Paint',
    placeholder: 'Enter path',
    operator: 'isAny',
    operatorOptions: filterOptions.stringOperatorsPerformance,
    source: [],
    icon: 'filters/lcpt',
    isEvent: true,
    hasSource: true,
    sourceOperator: '>=',
    sourcePlaceholder: 'E.g. 12',
    sourceUnit: 'ms',
    sourceType: FilterType.NUMBER,
    sourceOperatorOptions: filterOptions.customOperators,
  },
  {
    key: FilterKey.TTFB,
    type: FilterType.MULTIPLE,
    category: FilterCategory.DEVTOOLS,
    label: 'Time to First Byte',
    placeholder: 'Enter path',
    operator: 'isAny',
    operatorOptions: filterOptions.stringOperatorsPerformance,
    source: [],
    icon: 'filters/ttfb',
    isEvent: true,
    hasSource: true,
    sourceOperator: '>=',
    sourceUnit: 'ms',
    sourceType: FilterType.NUMBER,
    sourceOperatorOptions: filterOptions.customOperators,
    sourcePlaceholder: 'E.g. 12',
  },
  {
    key: FilterKey.AVG_MEMORY_USAGE,
    type: FilterType.MULTIPLE,
    category: FilterCategory.DEVTOOLS,
    label: 'Avg Memory Usage',
    placeholder: 'Enter path',
    operator: 'isAny',
    operatorOptions: filterOptions.stringOperatorsPerformance,
    source: [],
    icon: 'filters/memory-load',
    isEvent: true,
    hasSource: true,
    sourceOperator: '>=',
    sourcePlaceholder: 'E.g. 12',
    sourceUnit: 'mb',
    sourceType: FilterType.NUMBER,
    sourceOperatorOptions: filterOptions.customOperators,
  },
  {
    key: FilterKey.ISSUE,
    type: FilterType.ISSUE,
    category: FilterCategory.ISSUE,
    label: 'Issue',
    placeholder: 'Select an issue',
    operator: 'is',
    operatorOptions: filterOptions.getOperatorsByKeys(['is', 'isAny', 'isNot']),
    icon: 'filters/click',
    options: filterOptions.issueOptions,
  },
  ...issueFilters,
  {
    key: FilterKey.USER_OS,
    type: FilterType.MULTIPLE,
    category: FilterCategory.SESSION,
    label: 'OS',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/os',
  },
  {
    key: FilterKey.USER_BROWSER,
    type: FilterType.MULTIPLE,
    category: FilterCategory.SESSION,
    label: 'Browser',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/browser',
  },
  {
    key: FilterKey.USER_DEVICE,
    type: FilterType.MULTIPLE,
    category: FilterCategory.SESSION,
    label: 'Device',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/device',
  },
  {
    key: FilterKey.PLATFORM,
    type: FilterType.MULTIPLE_DROPDOWN,
    category: FilterCategory.SESSION,
    label: 'Platform',
    operator: 'is',
    operatorOptions: filterOptions.baseOperators,
    icon: 'filters/platform',
    options: platformOptions,
  },
  {
    key: FilterKey.REVID,
    type: FilterType.MULTIPLE,
    category: FilterCategory.SESSION,
    label: 'Version ID',
    placeholder: 'E.g. v1.0.8',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'collection',
  },
].sort((a, b) => {
  const aOrder = filterOrder[a.category] ?? 9;
  const bOrder = filterOrder[b.category] ?? 9;
  return aOrder - bOrder;
});

export const eventKeys = filters.filter((i) => i.isEvent).map((i) => i.key);

const mapFilters = (list) =>
  list.reduce((acc, filter) => {
    filter.value = filter.value
      ? Array.isArray(filter.value)
        ? filter.value
        : [filter.value]
      : [''];
    filter.name = filter.type;
    acc[filter.key] = filter;
    return acc;
  }, {});

export const filterLabelMap = filters.reduce((acc, filter) => {
  acc[filter.key] = filter.label;
  return acc;
}, {});

export let filtersMap = observable(mapFilters(filters));

export const clearMetaFilters = () => {
  filtersMap = mapFilters(filters);
};

/**
 * Add a new filter to the filter list
 * @param {*} category
 * @param {*} key
 * @param {*} type
 * @param {*} operator
 * @param {*} operatorOptions
 * @param {*} icon
 * @param {*} isEvent
 */
export const addElementToFiltersMap = (
  category = FilterCategory.METADATA,
  key,
  type = FilterType.MULTIPLE,
  operator = 'is',
  operatorOptions = filterOptions.stringOperators,
  icon = 'filters/metadata',
  isEvent = false,
) => {
  filtersMap[key] = {
    key,
    type,
    category,
    // remove _ from key
    label: getMetadataLabel(key),
    operator,
    operatorOptions,
    icon,
    isLive: true,
    isEvent,
  };
};

export const addOptionsToFilter = (key, options) => {
  if (filtersMap[key] && filtersMap[key].options) {
    filtersMap[key].options = options;
  }
};

function getMetadataLabel(key) {
  return key.replace(/^_/, '').charAt(0).toUpperCase() + key.slice(2);
}
