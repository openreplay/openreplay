export const options = [
  { key: 'on', text: 'on', value: 'on' }, 
  { key: 'notOn', text: 'not on', value: 'notOn' },
  { key: 'onAny', text: 'on any', value: 'onAny' },
  { key: 'is', text: 'is', value: 'is' },
  { key: 'isAny', text: 'is any', value: 'isAny' },
  { key: 'isNot', text: 'is not', value: 'isNot' },
  { key: 'startsWith', text: 'starts with', value: 'startsWith' },
  { key: 'endsWith', text: 'ends with', value: 'endsWith' },
  { key: 'contains', text: 'contains', value: 'contains' },
  { key: 'notContains', text: 'not contains', value: 'notContains' },
  { key: 'hasAnyValue', text: 'has any value', value: 'hasAnyValue' },
  { key: 'hasNoValue', text: 'has no value', value: 'hasNoValue' },   
  { key: 'isSignedUp', text: 'is signed up', value: 'isSignedUp' },
  { key: 'notSignedUp', text: 'not signed up', value: 'notSignedUp' },  
  { key: 'before', text: 'before', value: 'before' },
  { key: 'after', text: 'after', value: 'after' },
  { key: 'inRage', text: 'in rage', value: 'inRage' },
  { key: 'notInRage', text: 'not in rage', value: 'notInRage' },
  { key: 'withinLast', text: 'within last', value: 'withinLast' },
  { key: 'notWithinLast', text: 'not within last', value: 'notWithinLast' },
  { key: 'greaterThan', text: 'greater than', value: 'greaterThan' },
  { key: 'lessThan', text: 'less than', value: 'lessThan' },
  { key: 'equal', text: 'equal', value: 'equal' },
  { key: 'not equal', text: 'not equal', value: 'not equal' },
  { key: 'onSelector', text: 'on selector', value: 'onSelector' },
  { key: 'onText', text: 'on text', value: 'onText' },
  { key: 'onComponent', text: 'on component', value: 'onComponent' },
];

const filterKeys = ['is', 'isNot'];
const stringFilterKeys = ['is', 'isAny', 'isNot', 'contains', 'startsWith', 'endsWith', 'notContains'];
const targetFilterKeys = ['on', 'notOn', 'onAny', 'contains', 'startsWith', 'endsWith', 'notContains'];
const signUpStatusFilterKeys = ['isSignedUp', 'notSignedUp'];
const rangeFilterKeys = ['before', 'after', 'on', 'inRange', 'notInRange', 'withInLast', 'notWithInLast'];

const getOperatorsByKeys = (keys) => {
  return options.filter(option => keys.includes(option.key));
};

export const baseOperators = options.filter(({key}) => filterKeys.includes(key));
export const stringOperators = options.filter(({key}) => stringFilterKeys.includes(key));
export const targetOperators = options.filter(({key}) => targetFilterKeys.includes(key));
export const booleanOperators = [
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

export const metricTypes = [
  { text: 'Timeseries', value: 'timeseries' },
  { text: 'Table', value: 'table' },
];

export const metricOf = [
  { text: 'Session Count', value: 'sessionCount', key: 'timeseries' },
  { text: 'Users', value: 'USERID', key: 'table' },
  { text: 'Issues', value: 'ISSUES', key: 'table' },
  { text: 'Browser', value: 'USERBROWSER', key: 'table' },
  { text: 'Device', value: 'USERDEVICE', key: 'table' },
  { text: 'Country', value: 'USERCOUNTRY', key: 'table' },
  { text: 'URL', value: 'VISITED_URL', key: 'table' },
]

export const issueOptions = [
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

export default {
  options,
  baseOperators,
  stringOperators,
  targetOperators,
  booleanOperators,
  customOperators,
  getOperatorsByKeys,
  metricTypes,
  metricOf,
  issueOptions,
}