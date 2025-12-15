export type JsonData = Record<string, any>;

export interface Operator {
  value: string;
  label: string;
  displayName: string;
  description?: string;
}

type FilterScope = 'users' | 'sessions' | 'events';

export interface Filter {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  possibleTypes?: string[];
  dataType?: string;
  autoCaptured?: boolean;
  metadataName?: string;
  eventName?: string;
  category: string; // 'event' | 'filter' | 'action' | etc.
  subCategory?: string;
  type?: string; // 'number' | 'string' | 'boolean' | etc.
  icon?: string;
  operator?: string;
  operators?: Operator[];
  isEvent?: boolean;
  value?: string[];
  propertyOrder?: string;
  filters?: Filter[];
  autoOpen?: boolean;
  defaultProperty?: boolean;
  isConditional?: boolean;
  scope?: FilterScope[];

  toJSON(): JsonData;
}

export const OPERATORS = {
  string: [
    { value: 'is', label: 'is', displayName: 'Is', description: 'Exact match' },
    {
      value: 'isAny',
      label: 'is any',
      displayName: 'Is any',
      description: 'Any of the values',
    },
    {
      value: 'isNot',
      label: 'is not',
      displayName: 'Is not',
      description: 'Not an exact match',
    },
    {
      value: 'contains',
      label: 'contains',
      displayName: 'Contains',
      description: 'Contains the string',
    },
    {
      value: 'notContains',
      label: 'does not contain',
      displayName: 'Does not contain',
      description: 'Does not contain the string',
    },
    {
      value: 'startsWith',
      label: 'starts with',
      displayName: 'Starts with',
      description: 'Starts with the string',
    },
    {
      value: 'endsWith',
      label: 'ends with',
      displayName: 'Ends with',
      description: 'Ends with the string',
    },
    {
      value: 'regex',
      label: 'regex',
      displayName: 'Regex',
      description: 'Matches the regex pattern',
    },
  ],

  int: [
    {
      value: '=',
      label: 'equals',
      displayName: 'Equals',
      description: 'Exactly equals the value',
    },
    {
      value: '!=',
      label: 'not equals',
      displayName: 'Not equals',
      description: 'Not equals the value',
    },
    {
      value: '>',
      label: 'greater than',
      displayName: 'Greater than',
      description: 'Greater than the value',
    },
    {
      value: '<',
      label: 'less than',
      displayName: 'Less than',
      description: 'Less than the value',
    },
    {
      value: '>=',
      label: 'greater than or equals',
      displayName: 'Greater than or equals',
      description: 'Greater than or equals the value',
    },
    {
      value: '<=',
      label: 'less than or equals',
      displayName: 'Less than or equals',
      description: 'Less than or equals the value',
    },
  ],

  number: [
    {
      value: '=',
      label: 'equals',
      displayName: 'Equals',
      description: 'Exactly equals the value',
    },
    {
      value: '!=',
      label: 'does not equal', // Fixed: added space
      displayName: 'Does not equal',
      description: 'Does not equal the value',
    },
    {
      value: '>',
      label: 'greater than',
      displayName: 'Greater than',
      description: 'Greater than the value',
    },
    {
      value: '<',
      label: 'less than', // Fixed: added space and lowercased
      displayName: 'Less than',
      description: 'Less than the value',
    },
    {
      value: '>=',
      label: 'greater than or equals', // Fixed: added spaces and lowercased
      displayName: 'Greater than or equals',
      description: 'Greater than or equal to the value',
    },
    {
      value: '<=',
      label: 'less than or equals', // Fixed: added spaces and lowercased
      displayName: 'Less than or equals',
      description: 'Less than or equal to the value',
    },
  ],

  boolean: [
    {
      value: 'isTrue',
      label: 'is true', // Fixed: added space and lowercased
      displayName: 'Is true',
      description: 'Value is true',
    },
    {
      value: 'isFalse',
      label: 'is false', // Fixed: added space and lowercased
      displayName: 'Is false',
      description: 'Value is false',
    },
    {
      value: 'isBlank',
      label: 'is blank', // Fixed: added space and lowercased
      displayName: 'Is blank',
      description: 'Is null',
    },
    {
      value: 'isNotBlank',
      label: 'is not blank', // Fixed: added spaces and lowercased
      displayName: 'Is not blank',
      description: 'Is not null',
    },
  ],

  date: [
    {
      value: 'on',
      label: 'on',
      displayName: 'On',
      description: 'On the exact date',
    },
    {
      value: 'notOn',
      label: 'not on', // Fixed: added space and lowercased
      displayName: 'Not on',
      description: 'Not on the exact date',
    },
    {
      value: 'before',
      label: 'before',
      displayName: 'Before',
      description: 'Before the date',
    },
    {
      value: 'after',
      label: 'after',
      displayName: 'After',
      description: 'After the date',
    },
    {
      value: 'onOrBefore',
      label: 'on or before', // Fixed: added spaces and lowercased
      displayName: 'On or before',
      description: 'On or before the date',
    },
    {
      value: 'onOrAfter',
      label: 'on or after', // Fixed: added spaces and lowercased
      displayName: 'On or after',
      description: 'On or after the date',
    },
    {
      value: 'isBlank',
      label: 'is blank', // Fixed: added space and lowercased
      displayName: 'Is blank',
      description: 'Is empty or null',
    },
    {
      value: 'isNotBlank',
      label: 'is not blank', // Fixed: added spaces and lowercased
      displayName: 'Is not blank',
      description: 'Is not empty or null',
    },
  ],

  array: [
    {
      value: 'contains',
      label: 'contains',
      displayName: 'Contains',
      description: 'Array contains the value',
    },
    {
      value: 'notContains',
      label: 'does not contain',
      displayName: 'Does not contain',
      description: 'Array does not contain the value',
    },
    {
      value: 'hasAny',
      label: 'has any', // Fixed: added space and lowercased
      displayName: 'Has any',
      description: 'Array has any of the values',
    },
    {
      value: 'hasAll',
      label: 'has all', // Fixed: added space and lowercased
      displayName: 'Has all',
      description: 'Array has all of the values',
    },
    {
      value: 'isEmpty',
      label: 'is empty', // Fixed: added space and lowercased
      displayName: 'Is empty',
      description: 'Array is empty',
    },
    {
      value: 'isNotEmpty',
      label: 'is not empty', // Fixed: added spaces and lowercased
      displayName: 'Is not empty',
      description: 'Array is not empty',
    },
  ],

  duration: [
    { value: '=', label: 'is', displayName: 'Is', description: 'Exact match' },
  ],
};

export const COMMON_FILTERS: Filter[] = [];

export const getOperatorsByType = (type?: string): Operator[] => {
  let operators: Operator[] = [];

  switch (type?.toLowerCase()) {
    case 'string':
      operators = OPERATORS.string;
      break;
    case 'number':
      operators = OPERATORS.number;
      break;
    case 'boolean':
      operators = OPERATORS.boolean;
      break;
    case 'date':
    case 'timestamp':
      operators = OPERATORS.date;
      break;
    case 'array':
      operators = OPERATORS.array;
      break;
    case 'duration':
      operators = OPERATORS.duration;
      break;
    default:
      // Default to string operators if type is unknown
      operators = OPERATORS.string;
      break;
  }

  return operators;
};
