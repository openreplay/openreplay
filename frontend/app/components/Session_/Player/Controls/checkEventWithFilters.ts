import FilterItem from '@/mstore/types/filterItem';

export const checkEventWithFilters = (event: Event, filters: FilterItem[]) => {
  let result = false;
  filters.forEach((filter) => {
    if (filter.key.toUpperCase() === event.type.toUpperCase()) {
      if (filter.operator) {
        const operator = operators[filter.operator];
        if (operator) {
            result = !!operator(event.label, filter.value);
        }
      }
    }
  });
  return result
};

const operators = {
  is: (val: string, target: string[]) => target.some((t) => val.includes(t)),
  isAny: () => true,
  isNot: (val: string, target: string[]) =>
    !target.some((t) => val.includes(t)),
  contains: (val: string, target: string[]) =>
    target.some((t) => val.includes(t)),
  notContains: (val: string, target: string[]) =>
    !target.some((t) => val.includes(t)),
  startsWith: (val: string, target: string[]) =>
    target.some((t) => val.startsWith(t)),
  endsWith: (val: string, target: string[]) =>
    target.some((t) => val.endsWith(t)),
  greaterThan: (val: number, target: number) => val > target,
  greaterOrEqual: (val: number, target: number) => val >= target,
  lessOrEqual: (val: number, target: number) => val <= target,
  lessThan: (val: number, target: number) => val < target,
  on: (val: string, target: string[]) => target.some((t) => val.includes(t)),
  notOn: (val: string, target: string[]) =>
    !target.some((t) => val.includes(t)),
  onAny: () => true,
  selectorIs: (val: string, target: string[]) => target.some((t) => val.includes(t)),
  selectorIsAny: () => true,
  selectorIsNot: (val: string, target: string[]) =>
    !target.some((t) => val.includes(t)),
  selectorContains: (val: string, target: string[]) =>
    target.some((t) => val.includes(t)),
  selectorNotContains: (val: string, target: string[]) =>
    !target.some((t) => val.includes(t)),
  selectorStartsWith: (val: string, target: string[]) =>
    target.some((t) => val.startsWith(t)),
  selectorEndsWith: (val: string, target: string[]) =>
    target.some((t) => val.endsWith(t)),
};
