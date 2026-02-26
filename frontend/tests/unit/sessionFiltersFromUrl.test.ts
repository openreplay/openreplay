import { describe, expect, it } from '@jest/globals';
import { Filter } from '../../app/mstore/types/filterConstants';
import {
  getFiltersFromQueryParams,
  mergeFiltersWithUrlFilters,
} from '../../app/utils/sessionFiltersFromUrl';

const createFilter = (
  name: string,
  overrides: Partial<Filter> = {},
): Filter =>
  ({
    id: name,
    name,
    category: 'session',
    operator: 'is',
    value: [''],
    filters: [],
    toJSON() {
      return {};
    },
    ...overrides,
  }) as Filter;

describe('sessionFiltersFromUrl', () => {
  it('maps referrer and userid query params to session filters', () => {
    const searchParams = new URLSearchParams(
      'referrer=https%3A%2F%2Fapp.example.com%2Fcheckout&userid=alex',
    );
    const availableFilters = [
      createFilter('referrer'),
      createFilter('userId'),
      createFilter('userBrowser'),
    ];

    const filters = getFiltersFromQueryParams(searchParams, availableFilters);

    expect(filters).toHaveLength(2);
    expect(filters.find((f) => f.name === 'referrer')?.value).toEqual([
      'https://app.example.com/checkout',
    ]);
    expect(filters.find((f) => f.name === 'userId')?.value).toEqual(['alex']);
  });

  it('merges aliases for the same filter and removes duplicates', () => {
    const searchParams = new URLSearchParams('uid=alex&userid=alex&userid=sam');
    const availableFilters = [createFilter('userId')];

    const filters = getFiltersFromQueryParams(searchParams, availableFilters);

    expect(filters).toHaveLength(1);
    expect(filters[0].name).toBe('userId');
    expect(filters[0].value).toEqual(['alex', 'sam']);
  });

  it('ignores sid and unknown query parameters', () => {
    const searchParams = new URLSearchParams('sid=shared-id&foo=bar');
    const availableFilters = [createFilter('referrer')];

    const filters = getFiltersFromQueryParams(searchParams, availableFilters);

    expect(filters).toEqual([]);
  });

  it('overrides existing filters with URL filters by identity', () => {
    const existingFilters = [
      createFilter('referrer', { value: ['https://old.example.com'] }),
      createFilter('userBrowser', { value: ['Chrome'] }),
    ];
    const urlFilters = [
      createFilter('referrer', { value: ['https://new.example.com'] }),
    ];

    const mergedFilters = mergeFiltersWithUrlFilters(existingFilters, urlFilters);

    expect(mergedFilters).toHaveLength(2);
    expect(
      mergedFilters.find((filter) => filter.name === 'userBrowser')?.value,
    ).toEqual(['Chrome']);
    expect(
      mergedFilters.find((filter) => filter.name === 'referrer')?.value,
    ).toEqual(['https://new.example.com']);
  });
});
