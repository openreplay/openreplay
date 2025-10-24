import { describe, expect, it, beforeEach, jest } from '@jest/globals';

jest.mock('App/mstore/types/filterItem', () => {
  return class FilterItem {
    key: any;
    value: any;
    operator: any;
    source: any;
    sourceOperator: any;
    isEvent: any;
    filters: any;
    constructor(data: any = {}) {
      Object.assign(this, data);
    }
    fromJson(data: any) {
      Object.assign(this, data);
      return this;
    }
    merge(data: any) {
      Object.assign(this, data);
    }
    toJson() {
      return {
        type: this.key || this.type,
        value: this.value,
        operator: this.operator,
        source: this.source,
        sourceOperator: this.sourceOperator,
        isEvent: this.isEvent,
        filters: Array.isArray(this.filters) ? this.filters : [],
      };
    }
  };
});

jest.mock('Types/filter/newFilter', () => {
  const { FilterKey, FilterCategory } = require('Types/filter/filterType');
  return {
    filtersMap: {
      [FilterKey.USERID]: {
        key: FilterKey.USERID,
        type: FilterKey.USERID,
        category: FilterCategory.USER,
        operator: 'is',
        value: [''],
      },
      [FilterKey.DURATION]: {
        key: FilterKey.DURATION,
        type: FilterKey.DURATION,
        category: FilterCategory.SESSION,
        operator: 'is',
        value: [0, 0],
      },
      [FilterKey.ISSUE]: {
        key: FilterKey.ISSUE,
        type: FilterKey.ISSUE,
        category: FilterCategory.ISSUE,
        operator: 'is',
        value: [],
      },
    },
    conditionalFiltersMap: {},
    generateFilterOptions: jest.fn(() => []),
    liveFiltersMap: {},
    mobileConditionalFiltersMap: {},
  };
});

const mockSessionFetch = jest.fn().mockResolvedValue({});

const mockSessionStore = {
  fetchSessions: mockSessionFetch,
  total: 0,
  clearList: jest.fn(),
};
const mockSettingsStore = {
  sessionSettings: { durationFilter: { count: 0 } },
};

jest.mock('App/services', () => ({
  searchService: { fetchSavedSearch: jest.fn() },
  sessionService: {
    getSessions: jest.fn().mockResolvedValue({ sessions: [], total: 0 }),
  },
}));
jest.mock('App/mstore', () => ({
  sessionStore: mockSessionStore,
  settingsStore: mockSettingsStore,
}));

import SearchStore, {
  checkValues,
  filterMap,
} from '../../app/mstore/searchStore';
import SavedSearch from '../../app/mstore/types/savedSearch';
import { FilterCategory, FilterKey } from '../../app/types/filter/filterType';

describe('searchStore utilities', () => {
  it('checkValues handles duration', () => {
    const res = checkValues(FilterKey.DURATION, ['', 1000]);
    expect(res).toEqual([0, 1000]);
  });

  it('checkValues filters empty values', () => {
    const res = checkValues(FilterKey.USERID, ['a', '', null]);
    expect(res).toEqual(['a']);
  });

  it('filterMap maps metadata type correctly', () => {
    const data = {
      category: FilterCategory.METADATA,
      value: ['val'],
      key: '_source',
      operator: 'is',
      sourceOperator: 'is',
      source: '_source',
      custom: false,
      isEvent: false,
      filters: null,
    };
    const mapped = filterMap(data as any);
    expect(mapped.type).toBe(FilterKey.METADATA);
    expect(mapped.source).toBe('source');
    expect(mapped.value).toEqual(['val']);
  });
});

describe('SearchStore class', () => {
  let store: SearchStore;
  beforeEach(() => {
    store = new SearchStore();
    mockSessionFetch.mockClear();
  });

  it('addFilterByKeyAndValue adds filter and triggers fetch', () => {
    store.addFilterByKeyAndValue(FilterKey.USERID, ['42']);
    expect(store.instance.filters.length).toBe(1);
    expect(mockSessionFetch).toHaveBeenCalled();
  });

  it('fetchSessions applies duration filter from settings', async () => {
    mockSettingsStore.sessionSettings.durationFilter = {
      operator: '<',
      count: 1,
      countType: 'sec',
    };
    await store.fetchSessions();
    const call = mockSessionFetch.mock.calls[0][0];
    const duration = call.filters.find(
      (f: any) => f.name === FilterKey.DURATION,
    );
    expect(duration).toBeTruthy();
    expect(duration.value).toEqual([1000, 0]);
  });
});
