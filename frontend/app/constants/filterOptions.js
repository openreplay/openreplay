import { FilterKey, IssueType, IssueCategory } from 'Types/filter/filterType';
// TODO remove text property from options
export const options = [
  { key: 'on', label: 'on', value: 'on' },
  { key: 'notOn', label: 'not on', value: 'notOn' },
  { key: 'onAny', label: 'on any', value: 'onAny' },
  { key: 'is', label: 'is', value: 'is' },
  { key: 'isAny', label: 'is any', value: 'isAny' },
  { key: 'inAnyPage', label: 'in any page', value: 'isAny' },
  { key: 'isNot', label: 'is not', value: 'isNot' },
  { key: 'startsWith', label: 'starts with', value: 'startsWith' },
  { key: 'endsWith', label: 'ends with', value: 'endsWith' },
  { key: 'contains', label: 'contains', value: 'contains' },
  { key: 'notContains', label: 'not contains', value: 'notContains' },
  { key: 'hasAnyValue', label: 'has any value', value: 'hasAnyValue' },
  { key: 'hasNoValue', label: 'has no value', value: 'hasNoValue' },
  { key: 'isSignedUp', label: 'is signed up', value: 'isSignedUp' },
  { key: 'notSignedUp', label: 'not signed up', value: 'notSignedUp' },
  { key: 'before', label: 'before', value: 'before' },
  { key: 'after', label: 'after', value: 'after' },
  { key: 'inRage', label: 'in rage', value: 'inRage' },
  { key: 'notInRage', label: 'not in rage', value: 'notInRage' },
  { key: 'withinLast', label: 'within last', value: 'withinLast' },
  { key: 'notWithinLast', label: 'not within last', value: 'notWithinLast' },
  { key: 'greaterThan', label: 'greater than', value: 'greaterThan' },
  { key: 'lessThan', label: 'less than', value: 'lessThan' },
  { key: 'equal', label: 'equal', value: 'equal' },
  { key: 'not equal', label: 'not equal', value: 'not equal' },
  { key: 'onSelector', label: 'on selector', value: 'onSelector' },
  { key: 'onText', label: 'on text', value: 'onText' },
  { key: 'onComponent', label: 'on component', value: 'onComponent' }
];

const filterKeys = ['is', 'isNot'];
const stringFilterKeysLimited = ['is', 'isAny', 'isNot'];
const stringFilterKeys = ['is', 'isAny', 'isNot', 'contains', 'startsWith', 'endsWith', 'notContains'];
const stringFilterKeysPerformance = ['is', 'inAnyPage', 'isNot', 'contains', 'startsWith', 'endsWith', 'notContains'];
const targetFilterKeys = ['on', 'notOn', 'onAny', 'contains', 'startsWith', 'endsWith', 'notContains'];
const signUpStatusFilterKeys = ['isSignedUp', 'notSignedUp'];
const rangeFilterKeys = ['before', 'after', 'on', 'inRange', 'notInRange', 'withInLast', 'notWithInLast'];
const pageUrlFilter = ['contains', 'startsWith', 'endsWith'];

const getOperatorsByKeys = (keys) => {
  return options.filter(option => keys.includes(option.key));
};

export const baseOperators = options.filter(({ key }) => filterKeys.includes(key));
export const stringOperatorsLimited = options.filter(({ key }) => stringFilterKeysLimited.includes(key));
export const stringOperators = options.filter(({ key }) => stringFilterKeys.includes(key));
export const stringOperatorsPerformance = options.filter(({ key }) => stringFilterKeysPerformance.includes(key));
export const targetOperators = options.filter(({ key }) => targetFilterKeys.includes(key));
export const targetConditional = options.filter(({ key }) => ['on', 'notOn', 'startsWith', 'endsWith', 'contains'].includes(key));
export const stringConditional = options.filter(({ key }) => ['isAny', 'is', 'isNot', 'startsWith', 'endsWith', 'contains'].includes(key));

export const booleanOperators = [
  { key: 'true', label: 'true', value: 'true' },
  { key: 'false', label: 'false', value: 'false' }
];
export const pageUrlOperators = options.filter(({ key }) => pageUrlFilter.includes(key));

export const customOperators = [
  { key: '=', label: '=', value: '=' },
  { key: '<', label: '<', value: '<' },
  { key: '>', label: '>', value: '>' },
  { key: '<=', label: '<=', value: '<=' },
  { key: '>=', label: '>=', value: '>=' }
];

export const metricTypes = [
  { label: 'Timeseries', value: 'timeseries' },
  { label: 'Table', value: 'table' },
  { label: 'Funnel', value: 'funnel' }
  // { label: 'Errors', value: 'errors' },
  // { label: 'Sessions', value: 'sessions' },
];

export const tableColumnName = {
  [FilterKey.USERID]: 'Users',
  [FilterKey.ISSUE]: 'Issues',
  [FilterKey.USER_BROWSER]: 'Browser',
  [FilterKey.USER_DEVICE]: 'Devices',
  [FilterKey.USER_COUNTRY]: 'Countries',
  [FilterKey.LOCATION]: 'URLs'
};

export const metricOf = [
  { label: 'Session Count', value: 'sessionCount', type: 'timeseries' },
  { label: 'Users', value: FilterKey.USERID, type: 'table' },
  { label: 'Sessions', value: FilterKey.SESSIONS, type: 'table' },
  { label: 'JS Errors', value: FilterKey.ERRORS, type: 'table' },
  { label: 'Issues', value: FilterKey.ISSUE, type: 'table' },
  { label: 'Browser', value: FilterKey.USER_BROWSER, type: 'table' },
  { label: 'Devices', value: FilterKey.USER_DEVICE, type: 'table' },
  { label: 'Countries', value: FilterKey.USER_COUNTRY, type: 'table' },
  { label: 'URLs', value: FilterKey.LOCATION, type: 'table' }

];

export const methodOptions = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'HEAD', value: 'HEAD' },
  { label: 'OPTIONS', value: 'OPTIONS' },
  { label: 'TRACE', value: 'TRACE' },
  { label: 'CONNECT', value: 'CONNECT' }
];

export const issueOptions = [
  { label: 'Click Rage', value: IssueType.CLICK_RAGE },
  { label: 'Dead Click', value: IssueType.DEAD_CLICK },
  { label: 'Excessive Scrolling', value: IssueType.EXCESSIVE_SCROLLING },
  { label: 'Bad Request', value: IssueType.BAD_REQUEST },
  { label: 'Missing Resource', value: IssueType.MISSING_RESOURCE },
  { label: 'Memory', value: IssueType.MEMORY },
  { label: 'CPU', value: IssueType.CPU },
  { label: 'Slow Resource', value: IssueType.SLOW_RESOURCE },
  { label: 'Slow Page Load', value: IssueType.SLOW_PAGE_LOAD },
  { label: 'Crash', value: IssueType.CRASH },
  { label: 'Custom', value: IssueType.CUSTOM },
  { label: 'Error', value: IssueType.JS_EXCEPTION },
  { label: 'Mouse Thrashing', value: IssueType.MOUSE_THRASHING }
];

export const issueCategories = [
  { label: 'Resources', value: IssueCategory.RESOURCES },
  { label: 'Network Request', value: IssueCategory.NETWORK },
  { label: 'Click Rage', value: IssueCategory.RAGE },
  { label: 'JS Errors', value: IssueCategory.ERRORS }
];

export const pathAnalysisEvents = [
  { value: FilterKey.LOCATION, label: 'Pages' },
  { value: FilterKey.CLICK, label: 'Clicks' },
  { value: FilterKey.INPUT, label: 'Input' },
  { value: FilterKey.CUSTOM, label: 'Custom' }
];

export const issueCategoriesMap = issueCategories.reduce((acc, { value, label }) => {
  acc[value] = label;
  return acc;
}, {});

export default {
  options,
  baseOperators,
  stringOperators,
  stringOperatorsLimited,
  targetOperators,
  booleanOperators,
  customOperators,
  stringOperatorsPerformance,
  getOperatorsByKeys,
  metricTypes,
  metricOf,
  issueOptions,
  issueCategories,
  methodOptions,
  pageUrlOperators,
  targetConditional,
  stringConditional
};
