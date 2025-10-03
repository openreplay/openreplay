import FilterItem from '@/mstore/types/filterItem';
import { FilterKey } from '@/types/filter/filterType';

export const checkEventWithFilters = (event: Event, filters: FilterItem[]) => {
  const filter = filters.find(
    (f) => f.name.toUpperCase() === event.type.toUpperCase(),
  );
  if (filter?.operator) {
    const operator = operators[filter.operator];
    if (operator) {
      let usedValue = filter.value ?? [];
      if (filter.name === FilterKey.CLICK) {
        usedValue = handleClick(filter);
        if (isArrayEmpty(usedValue)) return true;
        return !!operator(event.label, usedValue);
      }
      if (filter.name === FilterKey.LOCATION) {
        usedValue = handleLocation(filter);
        const pathname = event.url ? new URL(event.url).pathname : '';
        if (isArrayEmpty(usedValue)) return true;
        return !!operator(pathname, usedValue);
      }
      if (filter.name === FilterKey.TAGGED_ELEMENT) {
        usedValue = handleTag(filter);
        if (isArrayEmpty(usedValue)) return true;
        return !!operator(event.name, usedValue);
      }
      if (filter.name === FilterKey.INPUT) {
        usedValue = handleInput(filter);
        if (isArrayEmpty(usedValue)) return true;
        return !!operator(event.label, usedValue);
      }
      if (isArrayEmpty(usedValue)) return true;
      return !!operator(event.label, usedValue);
    }
  }
  return false;
};

const isArrayEmpty = (arr: any[]) =>
  arr.length === 0 || (arr.length === 1 && arr[0] === '');

const handleClick = (filter: FilterItem) => {
  const value = filter.filters?.find((f) => f.name === 'label')?.value ?? [];
  return value;
};

const handleLocation = (filter: FilterItem) => {
  const value = filter.filters?.find((f) => f.name === 'url_path')?.value ?? [];
  return value;
};

const handleTag = (filter: FilterItem) => {
  const value = filter.filters?.find((f) => f.name === 'tag_id')?.value ?? [];
  return value;
};

const handleInput = (filter: FilterItem) => {
  const value = filter.filters?.find((f) => f.name === 'label')?.value ?? [];
  return value;
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
