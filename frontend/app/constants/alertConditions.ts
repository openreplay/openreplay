export const numberConditions = [
  { value: '>', label: 'greater than' },
  { value: '<', label: 'less than' },
  { value: '>=', label: 'greater than or equal to' },
  { value: '<=', label: 'less than or equal to' },
] as const;

export const stringConditions = [
  { value: 'contains', label: 'contains' },
  { value: 'notContains', label: 'does not contain' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
] as const;

export type ConditionKind = 'number' | 'string';

export const conditionsFor = (kind: ConditionKind) =>
  kind === 'string' ? stringConditions : numberConditions;

export const isStringCondition = (operator?: string) =>
  stringConditions.some((c) => c.value === operator);

export default [...numberConditions, ...stringConditions];
