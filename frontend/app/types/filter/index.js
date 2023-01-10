import { KEYS } from 'Types/filter/customFilter';
import { TYPES } from 'Types/filter/event';

export { default } from './filter';
export * from './filter';


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

export const defaultOperator = (filter) => {
  let { type, key } = filter;
  type = type || key;

  switch(type) {
    // on element
    case (TYPES.CLICK):
      return 'on';

    // string
    case TYPES.CUSTOM:
    case TYPES.CONSOLE:
    case TYPES.GRAPHQL:
    case TYPES.STATEACTION:
    case TYPES.FETCH:
    case TYPES.REVID:
    case TYPES.USERID:
    case TYPES.USERANONYMOUSID:
    case TYPES.ERROR:
    case TYPES.INPUT:
    case TYPES.URL:
    case TYPES.USER_BROWSER:
    case TYPES.USER_DEVICE:
    case TYPES.USER_OS:
    case TYPES.REFERRER:
    case TYPES.DURATION:
    case TYPES.USER_COUNTRY:
    case TYPES.METADATA:
    case 'metadata':
    case TYPES.LOCATION:
    case TYPES.VIEW:
      return 'is';

    // boolean
    case KEYS.SLOW_SESSION:
    case KEYS.MISSING_RESOURCE: // true/false
      return 'true';
    case KEYS.CLICK_RAGE:
      return 'onAnything';
    default:
      return 'is';
  }
}

export const operatorOptions = (filter) => {
  let { type, key } = filter;
  type = type || key;
  
  switch (type) {
    // on element
    case TYPES.CLICK:
      return targetFilterOptions;

    // string
    case TYPES.LOCATION:
    case TYPES.VIEW:
    case TYPES.METADATA:
    case TYPES.CUSTOM:
    case TYPES.CONSOLE:
    case TYPES.GRAPHQL:
    case TYPES.STATEACTION:
    case TYPES.FETCH:
    case TYPES.USERID:
    case TYPES.USERANONYMOUSID:
    case TYPES.REVID:
    case 'metadata':
    case KEYS.ERROR:
    case TYPES.DOM_COMPLETE:
    case TYPES.LARGEST_CONTENTFUL_PAINT_TIME:
    case TYPES.TIME_BETWEEN_EVENTS:
    case TYPES.TTFB:
    case TYPES.AVG_CPU_LOAD:
    case TYPES.AVG_MEMORY_USAGE:
      return stringFilterOptions;
    
    case TYPES.INPUT:
    case KEYS.URL:
    case KEYS.USER_BROWSER:
    case KEYS.PLATFORM:
    case KEYS.USER_DEVICE:
    case KEYS.USER_OS:
    case KEYS.REFERRER:
    case KEYS.DURATION:
    case KEYS.USER_COUNTRY:
      return filterOptions;
    
    // boolean
    case KEYS.SLOW_SESSION:
      return [{ key: 'true', text: 'true', value: 'true' }];
    case KEYS.MISSING_RESOURCE: // true/false
      return [{ key: 'inImages', text: 'in images', value: 'true' }];
    case KEYS.CLICK_RAGE:
      return [{ key: 'onAnything', text: 'on anything', value: 'true' }]
  }
}