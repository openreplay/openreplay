export interface Operator {
  value: string;
  label: string;
  displayName: string;
  description?: string;
}

export interface FilterProperty {
  name: string;
  displayName: string;
  description: string;
  type: string; // 'number' | 'string' | 'boolean' | etc.
}

export interface Filter {
  id?: string;
  name: string;
  displayName?: string;
  description?: string;
  possibleTypes?: string[];
  autoCaptured: boolean;
  metadataName: string;
  category: string; // 'event' | 'filter' | 'action' | etc.
  subCategory?: string;
  type?: string; // 'number' | 'string' | 'boolean' | etc.
  icon?: string;
  properties?: FilterProperty[];
  operator?: string;
  operators?: Operator[];
  isEvent?: boolean;
  value?: string[];
  propertyOrder?: string;
}

export const OPERATORS = {
  string: [
    { value: 'is', label: 'is', displayName: 'Is', description: 'Exact match' },
    { value: 'isNot', label: 'isNot', displayName: 'Is not', description: 'Not an exact match' },
    { value: 'contains', label: 'contains', displayName: 'Contains', description: 'Contains the string' },
    {
      value: 'doesNotContain',
      label: 'doesNotContain',
      displayName: 'Does not contain',
      description: 'Does not contain the string'
    },
    { value: 'startsWith', label: 'startsWith', displayName: 'Starts with', description: 'Starts with the string' },
    { value: 'endsWith', label: 'endsWith', displayName: 'Ends with', description: 'Ends with the string' },
    { value: 'isBlank', label: 'isBlank', displayName: 'Is blank', description: 'Is empty or null' },
    { value: 'isNotBlank', label: 'isNotBlank', displayName: 'Is not blank', description: 'Is not empty or null' }
  ],

  number: [
    { value: 'equals', label: 'equals', displayName: 'Equals', description: 'Exactly equals the value' },
    {
      value: 'doesNotEqual',
      label: 'doesNotEqual',
      displayName: 'Does not equal',
      description: 'Does not equal the value'
    },
    { value: 'greaterThan', label: 'greaterThan', displayName: 'Greater than', description: 'Greater than the value' },
    { value: 'lessThan', label: 'lessThan', displayName: 'Less than', description: 'Less than the value' },
    {
      value: 'greaterThanOrEquals',
      label: 'greaterThanOrEquals',
      displayName: 'Greater than or equals',
      description: 'Greater than or equal to the value'
    },
    {
      value: 'lessThanOrEquals',
      label: 'lessThanOrEquals',
      displayName: 'Less than or equals',
      description: 'Less than or equal to the value'
    },
    { value: 'isBlank', label: 'isBlank', displayName: 'Is blank', description: 'Is empty or null' },
    { value: 'isNotBlank', label: 'isNotBlank', displayName: 'Is not blank', description: 'Is not empty or null' }
  ],

  boolean: [
    { value: 'isTrue', label: 'isTrue', displayName: 'Is true', description: 'Value is true' },
    { value: 'isFalse', label: 'isFalse', displayName: 'Is false', description: 'Value is false' },
    { value: 'isBlank', label: 'isBlank', displayName: 'Is blank', description: 'Is null' },
    { value: 'isNotBlank', label: 'isNotBlank', displayName: 'Is not blank', description: 'Is not null' }
  ],

  date: [
    { value: 'on', label: 'on', displayName: 'On', description: 'On the exact date' },
    { value: 'notOn', label: 'notOn', displayName: 'Not on', description: 'Not on the exact date' },
    { value: 'before', label: 'before', displayName: 'Before', description: 'Before the date' },
    { value: 'after', label: 'after', displayName: 'After', description: 'After the date' },
    { value: 'onOrBefore', label: 'onOrBefore', displayName: 'On or before', description: 'On or before the date' },
    { value: 'onOrAfter', label: 'onOrAfter', displayName: 'On or after', description: 'On or after the date' },
    { value: 'isBlank', label: 'isBlank', displayName: 'Is blank', description: 'Is empty or null' },
    { value: 'isNotBlank', label: 'isNotBlank', displayName: 'Is not blank', description: 'Is not empty or null' }
  ],

  array: [
    { value: 'contains', label: 'contains', displayName: 'Contains', description: 'Array contains the value' },
    {
      value: 'doesNotContain',
      label: 'doesNotContain',
      displayName: 'Does not contain',
      description: 'Array does not contain the value'
    },
    { value: 'hasAny', label: 'hasAny', displayName: 'Has any', description: 'Array has any of the values' },
    { value: 'hasAll', label: 'hasAll', displayName: 'Has all', description: 'Array has all of the values' },
    { value: 'isEmpty', label: 'isEmpty', displayName: 'Is empty', description: 'Array is empty' },
    { value: 'isNotEmpty', label: 'isNotEmpty', displayName: 'Is not empty', description: 'Array is not empty' }
  ]
};

export const COMMON_FILTERS: Filter[] = [];

export const getOperatorsByType = (type: string): Operator[] => {
  let operators: Operator[] = [];

  switch (type.toLowerCase()) {
    case 'string':
      operators = OPERATORS.string;
      break;
    case 'number':
    case 'integer':
    case 'float':
    case 'decimal':
      operators = OPERATORS.number;
      break;
    case 'boolean':
      operators = OPERATORS.boolean;
      break;
    case 'date':
    case 'datetime':
    case 'timestamp':
      operators = OPERATORS.date;
      break;
    case 'array':
    case 'list':
      operators = OPERATORS.array;
      break;
    default:
      // Default to string operators if type is unknown
      operators = OPERATORS.string;
      break;
  }

  return operators;
};

// export const getOperatorsByType = (types: string[]): Operator[] => {
//   const operatorSet = new Set<Operator>();
//
//   if (!types || types.length === 0) {
//     return [...OPERATORS.string];
//   }
//
//   // Process each type in the array
//   types.forEach(type => {
//     let operators: Operator[] = [];
//
//     switch (type.toLowerCase()) {
//       case 'string':
//         operators = OPERATORS.string;
//         break;
//       case 'number':
//       case 'integer':
//       case 'float':
//       case 'decimal':
//         operators = OPERATORS.number;
//         break;
//       case 'boolean':
//         operators = OPERATORS.boolean;
//         break;
//       case 'date':
//       case 'datetime':
//       case 'timestamp':
//         operators = OPERATORS.date;
//         break;
//       case 'array':
//       case 'list':
//         operators = OPERATORS.array;
//         break;
//       default:
//         // Default to string operators if type is unknown
//         operators = OPERATORS.string;
//         break;
//     }
//
//     // Add operators to the set
//     operators.forEach(operator => {
//       operatorSet.add(operator);
//     });
//   });
//
//   // Convert Set back to Array and return
//   return Array.from(operatorSet);
// };
