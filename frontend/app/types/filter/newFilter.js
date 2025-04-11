import {
  clickSelectorOperators,
  issueOptions,
} from 'App/constants/filterOptions';
import Record from 'Types/Record';
import filterOptions, { countries, platformOptions } from 'App/constants';
import { observable } from 'mobx';
import Search from '@/mstore/types/search';
import { FilterType, FilterKey, FilterCategory } from './filterType';

const countryOptions = Object.keys(countries).map((i) => ({
  label: countries[i],
  value: i,
}));
const containsFilters = [
  {
    key: 'contains',
    label: 'contains',
    text: 'contains',
    value: 'contains',
  },
];

const filterOrder = {
  [FilterCategory.EVENTS]: 0,
  [FilterCategory.AUTOCAPTURE]: 1,
  [FilterCategory.DEVTOOLS]: 2,
  [FilterCategory.USER]: 3,
  [FilterCategory.SESSION]: 4,
  [FilterCategory.ISSUE]: 5,
  [FilterCategory.METADATA]: 6,
};

export const mobileFilters = [
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
    sourceOperatorOptions: filterOptions.customOperators
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
    sourceOperatorOptions: filterOptions.customOperators
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
    sourcePlaceholder: 'E.g. 12'
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

export const flagConditionFilters = [
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
    key: FilterKey.REFERRER,
    type: FilterType.MULTIPLE,
    category: FilterCategory.SESSION,
    label: 'Referrer',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/arrow-return-right',
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
  {
    key: FilterKey.USERID,
    type: FilterType.MULTIPLE,
    category: FilterCategory.USER,
    label: 'User Id',
    operator: 'isUndefined',
    operatorOptions: [
      { label: 'is undefined', value: 'isUndefined' },
      {
        key: 'isAny',
        label: 'is any',
        value: 'isAny',
      },
    ],
    icon: 'filters/userid',
  },
].sort((a, b) => {
  const aOrder = filterOrder[a.category] ?? 9;
  const bOrder = filterOrder[b.category] ?? 9;
  return aOrder - bOrder;
});

export const conditionalFilters = [
  {
    key: FilterKey.CLICK,
    type: FilterType.MULTIPLE,
    category: FilterCategory.EVENTS,
    subCategory: FilterCategory.AUTOCAPTURE,
    label: 'Click',
    operator: 'on',
    operatorOptions: filterOptions.targetConditional,
    icon: 'filters/click',
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
    operatorOptions: filterOptions.stringConditional,
    icon: 'filters/location',
    isEvent: true,
  },
  {
    key: FilterKey.CUSTOM,
    type: FilterType.MULTIPLE,
    category: FilterCategory.DEVTOOLS,
    label: 'Custom Events',
    placeholder: 'Enter event key',
    operator: 'is',
    operatorOptions: filterOptions.stringConditional,
    icon: 'filters/custom',
    isEvent: true,
  },
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
        operatorOptions: filterOptions.stringConditional,
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
    ],
    icon: 'filters/fetch',
    isEvent: true,
  },
  {
    key: FilterKey.ERROR,
    type: FilterType.MULTIPLE,
    category: FilterCategory.DEVTOOLS,
    label: 'Error Message',
    placeholder: 'E.g. Uncaught SyntaxError',
    operator: 'is',
    operatorOptions: filterOptions.stringConditional,
    icon: 'filters/error',
    isEvent: true,
  },
  {
    key: FilterKey.DURATION,
    type: FilterType.DURATION,
    category: FilterCategory.SESSION,
    label: 'Duration',
    operator: 'is',
    operatorOptions: filterOptions.getOperatorsByKeys(['is']),
    icon: 'filters/duration',
    isEvent: false,
  },
  {
    key: FilterKey.FEATURE_FLAG,
    type: FilterType.STRING,
    category: FilterCategory.METADATA,
    label: 'Feature Flag',
    operator: 'is',
    operatorOptions: filterOptions.stringConditional,
    isEvent: false,
  },
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
].sort((a, b) => {
  const aOrder = filterOrder[a.category] ?? 9;
  const bOrder = filterOrder[b.category] ?? 9;
  return aOrder - bOrder;
});

export const mobileConditionalFilters = [
  {
    key: FilterKey.DURATION,
    type: FilterType.DURATION,
    category: FilterCategory.SESSION,
    label: 'Duration',
    operator: 'is',
    operatorOptions: filterOptions.getOperatorsByKeys(['is']),
    icon: 'filters/duration',
    isEvent: false,
  },
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
        operatorOptions: filterOptions.stringConditional,
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
    ],
    icon: 'filters/fetch',
    isEvent: true,
  },
  {
    key: FilterKey.CUSTOM,
    type: FilterType.MULTIPLE,
    category: FilterCategory.DEVTOOLS,
    label: 'Custom Events',
    placeholder: 'Enter event key',
    operator: 'is',
    operatorOptions: filterOptions.stringConditional,
    icon: 'filters/custom',
    isEvent: true,
  },
  {
    key: 'thermalState',
    type: FilterType.MULTIPLE_DROPDOWN,
    category: FilterCategory.DEVTOOLS,
    label: 'Device Thermal State',
    placeholder: 'Pick an option',
    operator: 'is',
    operatorOptions: filterOptions.getOperatorsByKeys(['is']),
    icon: 'filters/cpu-load',
    options: [
      { label: 'nominal', value: '0' },
      { label: 'warm', value: '1' },
      { label: 'hot', value: '2' },
      { label: 'critical', value: '3' },
    ],
  },
  {
    key: 'mainThreadCPU',
    type: FilterType.STRING,
    category: FilterCategory.DEVTOOLS,
    label: 'Main CPU Load %',
    placeholder: '0 .. 100',
    operator: '=',
    operatorOptions: filterOptions.customOperators,
    icon: 'filters/cpu-load',
  },
  {
    key: 'viewComponent',
    type: FilterType.STRING,
    category: FilterCategory.EVENTS,
    subCategory: FilterCategory.AUTOCAPTURE,
    label: 'View on screen',
    placeholder: 'View Name',
    operator: 'is',
    operatorOptions: filterOptions.getOperatorsByKeys(['is']),
    icon: 'filters/view',
  },
  {
    key: FilterKey.USERID,
    type: FilterType.MULTIPLE,
    category: FilterCategory.USER,
    label: 'User Id',
    operator: 'isUndefined',
    operatorOptions: [
      {
        key: 'isUndefined',
        label: 'is undefined',
        value: 'isUndefined',
      },
      {
        key: 'isAny',
        label: 'is present',
        value: 'isAny',
      },
    ],
    icon: 'filters/userid',
  },
  {
    key: 'logEvent',
    type: FilterType.STRING,
    category: FilterCategory.DEVTOOLS,
    label: 'Log in console',
    placeholder: 'logged value',
    operator: 'is',
    operatorOptions: filterOptions.stringOperators,
    icon: 'filters/console',
  },
  {
    key: 'clickEvent',
    type: FilterType.STRING,
    category: FilterCategory.EVENTS,
    subCategory: FilterCategory.AUTOCAPTURE,
    label: 'Tap on view',
    placeholder: 'View Name',
    operator: 'is',
    operatorOptions: filterOptions.getOperatorsByKeys(['is']),
    icon: 'filters/click',
  },
  {
    key: 'memoryUsage',
    type: FilterType.STRING,
    category: FilterCategory.DEVTOOLS,
    label: 'Memory usage %',
    placeholder: '0 .. 100',
    operatorOptions: filterOptions.customOperators,
    icon: 'filters/memory-load',
  },
];

export const eventKeys = filters.filter((i) => i.isEvent).map((i) => i.key);
export const nonFlagFilters = filters
  .filter((i) => flagConditionFilters.findIndex((f) => f.key === i.key) === -1)
  .map((i) => i.key);
export const nonConditionalFlagFilters = filters
  .filter(
    (i) =>
      conditionalFilters.findIndex((f) => f.key === i.key) === -1 &&
      mobileConditionalFilters.findIndex((f) => f.key === i.key) === -1,
  )
  .map((i) => i.key);

export const clickmapFilter = {
  key: FilterKey.LOCATION,
  type: FilterType.MULTIPLE,
  category: FilterCategory.EVENTS,
  subCategory: FilterCategory.AUTOCAPTURE,
  label: 'Visited URL',
  placeholder: 'Enter URL or path',
  operator: filterOptions.pageUrlOperators[0].value,
  operatorOptions: filterOptions.pageUrlOperators,
  icon: 'filters/location',
  isEvent: true,
};

const mapFilters = (list) =>
  list.reduce((acc, filter) => {
    filter.value = filter.value
      ? Array.isArray(filter.value)
        ? filter.value
        : [filter.value]
      : [''];
    acc[filter.key] = filter;
    return acc;
  }, {});

const liveFilterSupportedOperators = ['is', 'contains'];
const liveFilterKeys = [
  FilterKey.METADATA,
  FilterKey.USERID,
  FilterKey.USER_COUNTRY,
  FilterKey.USER_CITY,
  FilterKey.USER_STATE,
  FilterKey.USERANONYMOUSID,
  FilterKey.USER_BROWSER,
  FilterKey.USER_OS,
  FilterKey.USER_DEVICE,
  FilterKey.PLATFORM,
  FilterKey.UTM_MEDIUM,
  FilterKey.UTM_SOURCE,
  FilterKey.UTM_CAMPAIGN,
];
const mapLiveFilters = (list) => {
  const obj = {};
  list.forEach((filter) => {
    if (
      filter.category !== FilterCategory.EVENTS &&
      filter.category !== FilterCategory.DEVTOOLS &&
      liveFilterKeys.includes(filter.key)
    ) {
      obj[filter.key] = { ...filter };
      obj[filter.key].operatorOptions = filter.operatorOptions.filter(
        (operator) => liveFilterSupportedOperators.includes(operator.value),
      );
      if (filter.key === FilterKey.PLATFORM) {
        obj[filter.key].operator = 'is';
      }
    }
  });

  return obj;
};

export const filterLabelMap = filters.reduce((acc, filter) => {
  acc[filter.key] = filter.label;
  return acc;
}, {});

export let filtersMap = observable(mapFilters(filters));
export let liveFiltersMap = observable(mapLiveFilters(filters));
export const fflagsConditionsMap = observable(mapFilters(flagConditionFilters));
export const conditionalFiltersMap = observable(mapFilters(conditionalFilters));
export const mobileConditionalFiltersMap = observable(
  mapFilters(mobileConditionalFilters),
);

export const clearMetaFilters = () => {
  filtersMap = mapFilters(filters);
  liveFiltersMap = mapLiveFilters(filters);
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

export const addElementToFlagConditionsMap = (
  category = FilterCategory.METADATA,
  key,
  type = FilterType.MULTIPLE,
  operator = 'is',
  operatorOptions = filterOptions.stringOperators,
  icon = 'filters/metadata',
  isEvent = false,
) => {
  fflagsConditionsMap[key] = {
    key,
    type,
    category,
    label: getMetadataLabel(key),
    operator,
    operatorOptions,
    icon,
    isLive: true,
    isEvent,
  };
};

export const addElementToConditionalFiltersMap = (
  category = FilterCategory.METADATA,
  key,
  type = FilterType.MULTIPLE,
  operator = 'is',
  operatorOptions = filterOptions.stringOperators,
  icon = 'filters/metadata',
  isEvent = false,
) => {
  conditionalFiltersMap[key] = {
    key,
    type,
    category,
    label: getMetadataLabel(key),
    operator,
    operatorOptions,
    icon,
    isLive: true,
    isEvent,
  };
};

export const addElementToMobileConditionalFiltersMap = (
  category = FilterCategory.METADATA,
  key,
  type = FilterType.MULTIPLE,
  operator = 'is',
  operatorOptions = filterOptions.stringOperators,
  icon = 'filters/metadata',
  isEvent = false,
) => {
  mobileConditionalFiltersMap[key] = {
    key,
    type,
    category,
    label: getMetadataLabel(key),
    operator,
    operatorOptions,
    icon,
    isLive: true,
    isEvent,
  };
};

export const addElementToLiveFiltersMap = (
  category = FilterCategory.METADATA,
  key,
  type = FilterType.MULTIPLE,
  operator = 'contains',
  operatorOptions = containsFilters,
  icon = 'filters/metadata',
) => {
  liveFiltersMap[key] = {
    key,
    type,
    category,
    label: getMetadataLabel(key),
    operator,
    operatorOptions,
    icon,
    operatorDisabled: true,
    isLive: true,
  };
};

export default Record(
  {
    timestamp: 0,
    key: '',
    label: '',
    placeholder: '',
    icon: '',
    type: '',
    value: [''],
    category: '',

    custom: '',
    level: '',

    hasNoValue: false,
    isFilter: false,
    actualValue: '',

    hasSource: false,
    source: [''],
    sourceType: '',
    sourceOperator: '=',
    sourcePlaceholder: '',
    sourceUnit: '',
    sourceOperatorOptions: [],

    operator: '',
    operatorOptions: [],
    operatorDisabled: false,
    isEvent: false,
    index: 0,
    options: [],
    filters: [],
    excludes: [],
  },
  {
    keyKey: '_key',
    fromJS: ({ value, type, subFilter = false, ...filter }) => {
      let _filter = {};
      if (subFilter) {
        const mainFilter = filtersMap[subFilter];
        const subFilterMap = {};
        mainFilter.filters.forEach((option) => {
          subFilterMap[option.key] = option;
        });
        _filter = subFilterMap[type];
      } else if (type === FilterKey.METADATA) {
        _filter = filtersMap[`_${filter.source}`];
      } else if (filtersMap[filter.key]) {
        _filter = filtersMap[filter.key];
      } else {
        _filter = filtersMap[type];
      }

      if (!_filter) {
        _filter = {
          key: filter.key,
          type: 'MULTIPLE',
        };
      }

      return {
        ..._filter,
        ...filter,
        key: _filter.key,
        type: _filter.type, // camelCased(filter.type.toLowerCase()),
        value: value.length === 0 || !value ? [''] : value,
      };
    },
  },
);

const WEB_EXCLUDE = [
  FilterKey.CLICK_MOBILE,
  FilterKey.SWIPE_MOBILE,
  FilterKey.INPUT_MOBILE,
  FilterKey.VIEW_MOBILE,
  FilterKey.CUSTOM_MOBILE,
  FilterKey.REQUEST_MOBILE,
  FilterKey.ERROR_MOBILE,
];

const MOBILE_EXCLUDE = [
  FilterKey.CLICK,
  FilterKey.INPUT,
  FilterKey.ERROR,
  FilterKey.CUSTOM,
  FilterKey.LOCATION,
  FilterKey.FETCH,
  FilterKey.DOM_COMPLETE,
  FilterKey.LARGEST_CONTENTFUL_PAINT_TIME,
  FilterKey.TTFB,
  FilterKey.USER_BROWSER,
  FilterKey.PLATFORM,
  FilterKey.TAGGED_ELEMENT,
  FilterKey.STATEACTION,
  FilterKey.UTM_CAMPAIGN,
  FilterKey.UTM_SOURCE,
  FilterKey.UTM_MEDIUM,
  FilterKey.SLOW_SESSION,
];

/**
 * Group filters by category
 * @returns
 * @param map
 * @param isMobile
 */
export const generateFilterOptions = (map, isMobile = false) => {
  const filterSection = {};
  Object.keys(map).forEach((key) => {
    if (isMobile && MOBILE_EXCLUDE.includes(key)) {
      return;
    }

    if (!isMobile && WEB_EXCLUDE.includes(key)) {
      return;
    }

    const filter = map[key];
    if (filterSection.hasOwnProperty(filter.category)) {
      filterSection[filter.category].push(filter);
    } else {
      filterSection[filter.category] = [filter];
    }
  });
  return filterSection;
};

export const generateFlagConditionOptions = (map) => {
  const filterSection = {};
  Object.keys(map).forEach((key) => {
    const filter = map[key];
    if (filterSection.hasOwnProperty(filter.category)) {
      filterSection[filter.category].push(filter);
    } else {
      filterSection[filter.category] = [filter];
    }
  });
  return filterSection;
};

export const generateLiveFilterOptions = (map) => {
  const filterSection = {};

  Object.keys(map)
    .filter((i) => map[i].isLive)
    .forEach((key) => {
      const filter = map[key];
      filter.operator = 'contains';
      filter.operatorDisabled = true;
      if (filterSection.hasOwnProperty(filter.category)) {
        filterSection[filter.category].push(filter);
      } else {
        filterSection[filter.category] = [filter];
      }
    });
  return filterSection;
};

export const getFilterFromJson = (json) => {
  const mapFilters = (filters) =>
    filters.map((f) => {
      const filter = { ...filtersMap[f.key], ...f };

      if (f.filters) {
        const mainFilterOptions = filtersMap[f.key]?.filters || [];
        const subFilterMap = Object.fromEntries(
          mainFilterOptions.map((option) => [option.key, option]),
        );

        filter.filters = f.filters.map((subFilter) => {
          const baseFilter =
            subFilterMap[subFilter.key] || filtersMap[subFilter.type] || {};
          return {
            ...baseFilter,
            ...subFilter,
            key: baseFilter.key || subFilter.key,
            type: baseFilter.type || subFilter.type,
            value: subFilter.value?.length ? subFilter.value : [''],
          };
        });
      }

      return filter;
    });

  return new Search({
    ...json,
    filters: mapFilters(json.filters),
  });
};
