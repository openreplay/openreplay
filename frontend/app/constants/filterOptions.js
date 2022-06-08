import { FilterKey, IssueType } from 'Types/filter/filterType';
// TODO remove text property from options
export const options = [
  { key: 'on', text: 'on', label: 'on', value: 'on' }, 
  { key: 'notOn', text: 'not on', label: 'not on', value: 'notOn' },
  { key: 'onAny', text: 'on any', label: 'on any', value: 'onAny' },
  { key: 'is', text: 'is', label: 'is', value: 'is' },
  { key: 'isAny', text: 'is any', label: 'is any', value: 'isAny' },
  { key: 'inAnyPage', text: 'in any page', label: 'in any page', value: 'isAny' },
  { key: 'isNot', text: 'is not', label: 'is not', value: 'isNot' },
  { key: 'startsWith', text: 'starts with', label: 'starts with', value: 'startsWith' },
  { key: 'endsWith', text: 'ends with', label: 'ends with', value: 'endsWith' },
  { key: 'contains', text: 'contains', label: 'contains', value: 'contains' },
  { key: 'notContains', text: 'not contains', label: 'not contains', value: 'notContains' },
  { key: 'hasAnyValue', text: 'has any value', label: 'has any value', value: 'hasAnyValue' },
  { key: 'hasNoValue', text: 'has no value', label: 'has no value', value: 'hasNoValue' },   
  { key: 'isSignedUp', text: 'is signed up', label: 'is signed up', value: 'isSignedUp' },
  { key: 'notSignedUp', text: 'not signed up', label: 'not signed up', value: 'notSignedUp' },  
  { key: 'before', text: 'before', label: 'before', value: 'before' },
  { key: 'after', text: 'after', label: 'after', value: 'after' },
  { key: 'inRage', text: 'in rage', label: 'in rage', value: 'inRage' },
  { key: 'notInRage', text: 'not in rage', label: 'not in rage', value: 'notInRage' },
  { key: 'withinLast', text: 'within last', label: 'within last', value: 'withinLast' },
  { key: 'notWithinLast', text: 'not within last', label: 'not within last', value: 'notWithinLast' },
  { key: 'greaterThan', text: 'greater than', label: 'greater than', value: 'greaterThan' },
  { key: 'lessThan', text: 'less than', label: 'less than', value: 'lessThan' },
  { key: 'equal', text: 'equal', label: 'equal', value: 'equal' },
  { key: 'not equal', text: 'not equal', label: 'not equal', value: 'not equal' },
  { key: 'onSelector', text: 'on selector', label: 'on selector', value: 'onSelector' },
  { key: 'onText', text: 'on text', label: 'on text', value: 'onText' },
  { key: 'onComponent', text: 'on component', label: 'on component', value: 'onComponent' },
];

const filterKeys = ['is', 'isNot'];
const stringFilterKeys = ['is', 'isAny', 'isNot', 'contains', 'startsWith', 'endsWith', 'notContains'];
const stringFilterKeysPerformance = ['is', 'inAnyPage', 'isNot', 'contains', 'startsWith', 'endsWith', 'notContains'];
const targetFilterKeys = ['on', 'notOn', 'onAny', 'contains', 'startsWith', 'endsWith', 'notContains'];
const signUpStatusFilterKeys = ['isSignedUp', 'notSignedUp'];
const rangeFilterKeys = ['before', 'after', 'on', 'inRange', 'notInRange', 'withInLast', 'notWithInLast'];

const getOperatorsByKeys = (keys) => {
  return options.filter(option => keys.includes(option.key));
};

export const baseOperators = options.filter(({key}) => filterKeys.includes(key));
export const stringOperators = options.filter(({key}) => stringFilterKeys.includes(key));
export const stringOperatorsPerformance = options.filter(({key}) => stringFilterKeysPerformance.includes(key));
export const targetOperators = options.filter(({key}) => targetFilterKeys.includes(key));
export const booleanOperators = [
  { key: 'true', text: 'true', label: 'true', value: 'true' },
  { key: 'false', text: 'false', label: 'false', value: 'false' },
]

export const customOperators = [
  { key: '=', text: '=', label: '=', value: '=' },
  { key: '<', text: '<', label: '<', value: '<' },
  { key: '>', text: '>', label: '>', value: '>' },
  { key: '<=', text: '<=', label: '<=', value: '<=' },
  { key: '>=', text: '>=', label: '>=', value: '>=' },
]

export const metricTypes = [
  { text: 'Timeseries', label: 'Timeseries', value: 'timeseries' },
  { text: 'Table', label: 'Table', value: 'table' },
  { label: 'Funnel', value: 'funnel' },
  { label: 'Errors', value: 'errors' },
  { label: 'Sessions', value: 'sessions' },
];

export const tableColumnName = {
    [FilterKey.USERID]: 'Users',
    [FilterKey.ISSUE]: 'Issues',
    [FilterKey.USER_BROWSER]: 'Browsers',
    [FilterKey.USER_DEVICE]: 'Devices',
    [FilterKey.USER_COUNTRY]: 'Countries',
    [FilterKey.LOCATION]: 'URLs',
}

export const metricOf = [
  { text: 'Session Count', label: 'Session Count', value: 'sessionCount', type: 'timeseries' },
  { text: 'Users', label: 'Users', value: FilterKey.USERID, type: 'table' },
  { text: 'Issues', label: 'Issues', value: FilterKey.ISSUE, type: 'table' },
  { text: 'Browsers', label: 'Browsers', value: FilterKey.USER_BROWSER, type: 'table' },
  { text: 'Devices', label: 'Devices', value: FilterKey.USER_DEVICE, type: 'table' },
  { text: 'Countries', label: 'Countries', value: FilterKey.USER_COUNTRY, type: 'table' },
  { text: 'URLs', label: 'URLs', value: FilterKey.LOCATION, type: 'table' },
]

export const methodOptions = [
  { text: 'GET', label: 'GET', value: 'GET' },
  { text: 'POST', label: 'POST', value: 'POST' },
  { text: 'PUT', label: 'PUT', value: 'PUT' },
  { text: 'DELETE', label: 'DELETE', value: 'DELETE' },
  { text: 'PATCH', label: 'PATCH', value: 'PATCH' },
  { text: 'HEAD', label: 'HEAD', value: 'HEAD' },
  { text: 'OPTIONS', label: 'OPTIONS', value: 'OPTIONS' },
  { text: 'TRACE', label: 'TRACE', value: 'TRACE' },
  { text: 'CONNECT', label: 'CONNECT', value: 'CONNECT' },  
]

export const issueOptions = [
  { text: 'Click Rage', label: 'Click Rage', value: IssueType.CLICK_RAGE },
  { text: 'Dead Click', label: 'Dead Click', value: IssueType.DEAD_CLICK },
  { text: 'Excessive Scrolling', label: 'Excessive Scrolling', value: IssueType.EXCESSIVE_SCROLLING },
  { text: 'Bad Request', label: 'Bad Request', value: IssueType.BAD_REQUEST },
  { text: 'Missing Resource', label: 'Missing Resource', value: IssueType.MISSING_RESOURCE },
  { text: 'Memory', label: 'Memory', value: IssueType.MEMORY },
  { text: 'CPU', label: 'CPU', value: IssueType.CPU },
  { text: 'Slow Resource', label: 'Slow Resource', value: IssueType.SLOW_RESOURCE },
  { text: 'Slow Page Load', label: 'Slow Page Load', value: IssueType.SLOW_PAGE_LOAD },
  { text: 'Crash', label: 'Crash', value: IssueType.CRASH },
  { text: 'Custom', label: 'Custom', value: IssueType.CUSTOM },
  { text: 'Error', label: 'Error', value: IssueType.JS_EXCEPTION },
]

export default {
  options,
  baseOperators,
  stringOperators,
  targetOperators,
  booleanOperators,
  customOperators,
  stringOperatorsPerformance,
  getOperatorsByKeys,
  metricTypes,
  metricOf,
  issueOptions,
  methodOptions,
}