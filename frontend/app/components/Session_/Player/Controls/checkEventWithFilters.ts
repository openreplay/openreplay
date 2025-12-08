import FilterItem from '@/mstore/types/filterItem';
import { FilterKey } from '@/types/filter/filterType';

export const checkEventWithFilters = (event: Event, filters: FilterItem[]) => {
  const filter = filters.find(
    (f) => f.name.toUpperCase() === event.type.toUpperCase(),
  );
  if (filter?.operator) {
    let operator = operators[filter.operator];
    if (operator) {
      let usedValue = filter.value ?? [];
      let target = '';
      if (filter.name === FilterKey.CLICK) {
        const { value, operator: opStr } = handleClick(filter);
        usedValue = value;
        operator = operators[opStr];
        target = event.label;
      }
      if (filter.name === FilterKey.LOCATION) {
        const { value, operator: opStr } = handleLocation(filter);
        usedValue = value;
        operator = operators[opStr];
        target = event.url ? new URL(event.url).pathname : '';
      }
      if (filter.name === FilterKey.TAGGED_ELEMENT) {
        const { value, operator: opStr } = handleTag(filter);
        usedValue = value;
        operator = operators[opStr];
        target = event.name;
      }
      if (filter.name === FilterKey.INPUT) {
        const { value, operator: opStr } = handleInput(filter);
        usedValue = value;
        operator = operators[opStr];
        target = event.label;
      }
      if (isArrayEmpty(usedValue)) return true;
      return !!operator(target, usedValue);
    }
  }
  return false;
};

const isArrayEmpty = (arr: any[]) =>
  arr.length === 0 || (arr.length === 1 && arr[0] === '');

const handleClick = (filter: FilterItem) => {
  const subfilter = filter.filters?.find((f) => f.name === 'label');
  const value = subfilter?.value ?? [];
  const operator = subfilter?.operator || filter.operator;
  return { value, operator };
};

const handleLocation = (filter: FilterItem) => {
  const subfilter = filter.filters?.find((f) => f.name === 'urlPath');
  const value = subfilter?.value ?? [];
  const operator = subfilter?.operator || filter.operator;
  return { value, operator };
};

const handleTag = (filter: FilterItem) => {
  const subfilter = filter.filters?.find((f) => f.name === 'tag_id');
  const value = subfilter?.value ?? [];
  const operator = subfilter?.operator || filter.operator;
  return { value, operator };
};

const handleInput = (filter: FilterItem) => {
  const subfilter = filter.filters?.find((f) => f.name === 'label');
  const value = subfilter?.value ?? [];
  const operator = subfilter?.operator || filter.operator;
  return { value, operator };
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
  selectorIs: (val: string, target: string[]) =>
    target.some((t) => val.includes(t)),
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
