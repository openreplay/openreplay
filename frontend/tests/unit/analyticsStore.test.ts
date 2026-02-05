import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AnalyticsStore from '../../app/mstore/AnalyticsStore';
import { Filter } from '../../app/mstore/types/filterConstants';
import Event from '../../app/mstore/types/Analytics/Event';
import User from '../../app/mstore/types/Analytics/User';

const mockGetEvents = jest.fn();
const mockGetUsers = jest.fn();
const mockGetUser = jest.fn();
const mockGetUserActivity = jest.fn();
const mockUpdateUser = jest.fn();
const mockDeleteUser = jest.fn();

jest.mock('../../app/services', () => ({
  analyticsService: {
    getEvents: (...args: any[]) => mockGetEvents(...args),
    getUsers: (...args: any[]) => mockGetUsers(...args),
    getUser: (...args: any[]) => mockGetUser(...args),
    getUserActivity: (...args: any[]) => mockGetUserActivity(...args),
    updateUser: (...args: any[]) => mockUpdateUser(...args),
    deleteUser: (...args: any[]) => mockDeleteUser(...args),
  },
}));

const mockGetEventFilters = jest.fn();
const mockFindEvent = jest.fn();

jest.mock('../../app/mstore', () => ({
  filterStore: {
    getEventFilters: (...args: any[]) => mockGetEventFilters(...args),
    findEvent: (...args: any[]) => mockFindEvent(...args),
  },
}));

jest.mock('../../app/mstore/types/filter', () => ({
  checkFilterValue: (value: any) => value,
}));

const createMockEvent = (overrides: Record<string, any> = {}) => ({
  $event_name: 'test_event',
  event_id: 'event-123',
  created_at: Date.now(),
  distinct_id: 'distinct-123',
  session_id: 'session-123',
  $city: 'New York',
  $os: 'Windows',
  $auto_captured: false,
  $user_id: 'user-123',
  ...overrides,
});

const createMockUser = (overrides: Record<string, any> = {}) => ({
  $user_id: 'user-123',
  $name: 'John Doe',
  $email: 'john@example.com',
  $city: 'New York',
  $state: 'NY',
  $country: 'USA',
  $created_at: Date.now(),
  $last_seen: Date.now(),
  distinct_ids: ['distinct-1', 'distinct-2'],
  properties: {},
  ...overrides,
});

const createMockFilter = (overrides: Partial<Filter> = {}): Filter => ({
  id: 'filter-1',
  name: 'Test Filter',
  type: 'string',
  isEvent: false,
  value: ['test'],
  operator: 'is',
  filters: [],
  ...overrides,
} as Filter);

describe('AnalyticsStore', () => {
  let store: AnalyticsStore;

  beforeEach(() => {
    jest.clearAllMocks();
    store = new AnalyticsStore();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      expect(store.events).toEqual({ total: 0, events: [] });
      expect(store.newEvents).toBe(0);
      expect(store.users).toEqual({ total: 0, users: [] });
      expect(store.loading).toBe(false);
      expect(store.payloadFilters.limit).toBe(10);
      expect(store.payloadFilters.sortOrder).toBe('desc');
      expect(store.payloadFilters.sortBy).toBe('created_at');
      expect(store.payloadFilters.page).toBe(1);
    });

    it('should have correct initial usersPayloadFilters', () => {
      expect(store.usersPayloadFilters.sortBy).toBe('$created_at');
      expect(store.usersPayloadFilters.columns.length).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should reset payloadFilters and events to initial state', () => {
      store.payloadFilters.page = 5;
      store.payloadFilters.limit = 50;
      store.events = { total: 10, events: [new Event(createMockEvent())] };

      store.reset();

      expect(store.payloadFilters.page).toBe(1);
      expect(store.payloadFilters.limit).toBe(10);
      expect(store.events).toEqual({ total: 0, events: [] });
    });
  });

  describe('setPeriod', () => {
    it('should set the period', () => {
      const newPeriod = { start: 1000, end: 2000, rangeName: 'custom' };
      store.setPeriod(newPeriod);
      expect(store.period).toEqual(newPeriod);
    });
  });

  describe('updateTimestamps', () => {
    it('should update period and payload timestamps', () => {
      const start = Date.now() - 86400000;
      const end = Date.now();
      const rangeName = 'LAST_24_HOURS';

      store.updateTimestamps({ start, end, rangeName });

      expect(store.payloadFilters.startTimestamp).toBe(start);
      expect(store.payloadFilters.endTimestamp).toBe(end);
      expect(store.payloadFilters.page).toBe(1);
    });
  });

  describe('editPayload', () => {
    it('should merge new payload with existing', () => {
      store.editPayload({ limit: 25, sortOrder: 'asc' });

      expect(store.payloadFilters.limit).toBe(25);
      expect(store.payloadFilters.sortOrder).toBe('asc');
    });

    it('should reset page to 1 if page is not in newPayload', () => {
      store.payloadFilters.page = 5;
      store.editPayload({ limit: 20 });

      expect(store.payloadFilters.page).toBe(1);
    });

    it('should not reset page if page is in newPayload', () => {
      store.payloadFilters.page = 5;
      store.editPayload({ limit: 20, page: 3 });

      expect(store.payloadFilters.page).toBe(3);
    });
  });

  describe('editUsersPayload', () => {
    it('should merge new payload with existing users payload', () => {
      store.editUsersPayload({ limit: 50, sortOrder: 'asc' });

      expect(store.usersPayloadFilters.limit).toBe(50);
      expect(store.usersPayloadFilters.sortOrder).toBe('asc');
    });

    it('should reset page to 1 if page is not in newPayload', () => {
      store.usersPayloadFilters.page = 5;
      store.editUsersPayload({ limit: 20 });

      expect(store.usersPayloadFilters.page).toBe(1);
    });

    it('should not reset page if page is in newPayload', () => {
      store.usersPayloadFilters.page = 5;
      store.editUsersPayload({ limit: 20, page: 3 });

      expect(store.usersPayloadFilters.page).toBe(3);
    });
  });

  describe('processFilter', () => {
    it('should process a simple filter', async () => {
      const filter = createMockFilter({ isEvent: false });

      const result = await store.processFilter(filter);

      expect(result.operator).toBe('is');
      expect(result.filters).toEqual([]);
    });

    it('should fetch event filters if isEvent and no filters', async () => {
      const mockEventProps = [
        { defaultProperty: true, name: 'prop1' },
        { defaultProperty: false, name: 'prop2' },
      ];
      mockGetEventFilters.mockResolvedValue(mockEventProps);

      const filter = createMockFilter({ isEvent: true, filters: [] });

      const result = await store.processFilter(filter);

      expect(mockGetEventFilters).toHaveBeenCalledWith(filter.id);
      expect(result.filters).toEqual([{ defaultProperty: true, name: 'prop1' }]);
    });

    it('should set default operator if not provided', async () => {
      const filter = createMockFilter({ operator: undefined });

      const result = await store.processFilter(filter);

      expect(result.operator).toBe('is');
    });
  });

  describe('addFilter', () => {
    it('should add a new filter to payloadFilters', async () => {
      const filter = createMockFilter();

      await store.addFilter(filter);

      expect(store.payloadFilters.filters.length).toBe(1);
      expect(store.payloadFilters.page).toBe(1);
    });

    it('should append to existing filters', async () => {
      store.payloadFilters.filters = [createMockFilter({ id: 'existing' })];
      const newFilter = createMockFilter({ id: 'new-filter' });

      await store.addFilter(newFilter);

      expect(store.payloadFilters.filters.length).toBe(2);
    });
  });

  describe('addUserFilter', () => {
    it('should add a new filter to usersPayloadFilters', async () => {
      const filter = createMockFilter();

      await store.addUserFilter(filter);

      expect(store.usersPayloadFilters.filters.length).toBe(1);
      expect(store.usersPayloadFilters.page).toBe(1);
    });
  });

  describe('updateUserFilter', () => {
    it('should update filter at specified index', () => {
      store.usersPayloadFilters.filters = [
        createMockFilter({ id: 'filter-1' }),
        createMockFilter({ id: 'filter-2' }),
      ];
      const updatedFilter = createMockFilter({ id: 'filter-1', value: ['updated'] });

      store.updateUserFilter(0, updatedFilter);

      expect(store.usersPayloadFilters.filters[0].value).toEqual(['updated']);
      expect(store.usersPayloadFilters.page).toBe(1);
    });
  });

  describe('removeUserFilter', () => {
    it('should remove filter at specified index', () => {
      store.usersPayloadFilters.filters = [
        createMockFilter({ id: 'filter-1' }),
        createMockFilter({ id: 'filter-2' }),
        createMockFilter({ id: 'filter-3' }),
      ];

      store.removeUserFilter(1);

      expect(store.usersPayloadFilters.filters.length).toBe(2);
      expect(store.usersPayloadFilters.filters.map((f) => f.id)).toEqual([
        'filter-1',
        'filter-3',
      ]);
      expect(store.usersPayloadFilters.page).toBe(1);
    });
  });

  describe('updateFilter', () => {
    it('should update filter at specified index', () => {
      store.payloadFilters.filters = [
        createMockFilter({ id: 'filter-1' }),
        createMockFilter({ id: 'filter-2' }),
      ];
      const updatedFilter = createMockFilter({ id: 'filter-1', value: ['updated'] });

      store.updateFilter(0, updatedFilter);

      expect(store.payloadFilters.filters[0].value).toEqual(['updated']);
      expect(store.payloadFilters.page).toBe(1);
    });
  });

  describe('removeFilter', () => {
    it('should remove filter at specified index', () => {
      store.payloadFilters.filters = [
        createMockFilter({ id: 'filter-1' }),
        createMockFilter({ id: 'filter-2' }),
        createMockFilter({ id: 'filter-3' }),
      ];

      store.removeFilter(1);

      expect(store.payloadFilters.filters.length).toBe(2);
      expect(store.payloadFilters.filters.map((f) => f.id)).toEqual([
        'filter-1',
        'filter-3',
      ]);
      expect(store.payloadFilters.page).toBe(1);
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      expect(store.loading).toBe(false);

      store.setLoading(true);
      expect(store.loading).toBe(true);

      store.setLoading(false);
      expect(store.loading).toBe(false);
    });
  });

  describe('setEvents', () => {
    it('should set events and total', () => {
      const events = [new Event(createMockEvent())];

      store.setEvents(events, 100);

      expect(store.events.events).toEqual(events);
      expect(store.events.total).toBe(100);
    });
  });

  describe('fetchEvents', () => {
    it('should fetch and set events', async () => {
      const mockResponse = {
        total: 2,
        events: [createMockEvent({ event_id: '1' }), createMockEvent({ event_id: '2' })],
      };
      mockGetEvents.mockResolvedValue(mockResponse);

      const result = await store.fetchEvents();

      expect(mockGetEvents).toHaveBeenCalled();
      expect(store.events.total).toBe(2);
      expect(store.events.events.length).toBe(2);
      expect(store.events.events[0]).toBeInstanceOf(Event);
      expect(store.loading).toBe(false);
      expect(store.newEvents).toBe(0);
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors and return empty result', async () => {
      const mockError = new Error('API error');
      console.error = jest.fn();
      mockGetEvents.mockRejectedValue(mockError);

      const result = await store.fetchEvents();

      expect(console.error).toHaveBeenCalledWith('AnalyticsStore.fetchEvents', mockError);
      expect(result).toEqual({ events: [], total: 0 });
      expect(store.loading).toBe(false);
    });

    it('should update lastFetchedAt timestamp', async () => {
      mockGetEvents.mockResolvedValue({ total: 0, events: [] });
      const beforeFetch = Date.now();

      await store.fetchEvents();

      expect(store.lastFetchedAt).toBeGreaterThanOrEqual(beforeFetch);
    });
  });

  describe('fetchPropertyEvents', () => {
    it('should fetch events with property filter', async () => {
      const mockResponse = {
        total: 1,
        events: [createMockEvent()],
      };
      mockGetEvents.mockResolvedValue(mockResponse);
      const propFilter = createMockFilter();

      const result = await store.fetchPropertyEvents(propFilter);

      expect(mockGetEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: [propFilter],
          columns: expect.arrayContaining(['description']),
        }),
      );
      expect(result.total).toBe(1);
      expect(result.events[0]).toBeInstanceOf(Event);
      expect(store.loading).toBe(false);
    });

    it('should handle errors and return empty result', async () => {
      const mockError = new Error('API error');
      console.error = jest.fn();
      mockGetEvents.mockRejectedValue(mockError);

      const result = await store.fetchPropertyEvents(createMockFilter());

      expect(console.error).toHaveBeenCalledWith(
        'AnalyticsStore.fetchPropertyEvents',
        mockError,
      );
      expect(result).toEqual({ events: [], total: 0 });
      expect(store.loading).toBe(false);
    });
  });

  describe('checkLatest', () => {
    it('should update newEvents count when new events exist', async () => {
      store.lastFetchedAt = Date.now() - 60000;
      mockGetEvents.mockResolvedValue({ total: 5, events: [] });

      await store.checkLatest();

      expect(store.newEvents).toBe(5);
      expect(mockGetEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          startTimestamp: store.lastFetchedAt,
          limit: 1,
          sortOrder: 'desc',
          sortBy: 'created_at',
        }),
      );
    });

    it('should not update newEvents when no new events', async () => {
      store.lastFetchedAt = Date.now() - 60000;
      mockGetEvents.mockResolvedValue({ total: 0, events: [] });

      await store.checkLatest();

      expect(store.newEvents).toBe(0);
    });
  });

  describe('fetchUsers', () => {
    it('should fetch and set users', async () => {
      const mockResponse = {
        total: 2,
        users: [createMockUser({ $user_id: '1' }), createMockUser({ $user_id: '2' })],
      };
      mockGetUsers.mockResolvedValue(mockResponse);

      const result = await store.fetchUsers('search query');

      expect(mockGetUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'search query',
        }),
      );
      expect(store.users.total).toBe(2);
      expect(store.users.users.length).toBe(2);
      expect(store.users.users[0]).toBeInstanceOf(User);
      expect(store.loading).toBe(false);
      expect(result).toEqual(mockResponse);
    });

    it('should add propName filter when provided', async () => {
      const mockPropFilter = createMockFilter({ name: 'testProp' });
      mockFindEvent.mockReturnValue(mockPropFilter);
      mockGetUsers.mockResolvedValue({ total: 0, users: [] });

      await store.fetchUsers('query', 'testProp');

      expect(mockFindEvent).toHaveBeenCalledWith({ name: 'testProp' });
      expect(mockGetUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({ operator: 'isAny', readonly: true }),
          ]),
        }),
      );
    });

    it('should handle errors and return empty result', async () => {
      const mockError = new Error('API error');
      console.error = jest.fn();
      mockGetUsers.mockRejectedValue(mockError);

      const result = await store.fetchUsers('query');

      expect(console.error).toHaveBeenCalledWith('AnalyticsStore.fetchUsers', mockError);
      expect(result).toEqual({ users: [], total: 0 });
      expect(store.loading).toBe(false);
    });
  });

  describe('fetchUserInfo', () => {
    it('should fetch and return user info', async () => {
      const mockUser = createMockUser();
      mockGetUser.mockResolvedValue(mockUser);

      const result = await store.fetchUserInfo('user-123');

      expect(mockGetUser).toHaveBeenCalledWith('user-123');
      expect(result).toBeInstanceOf(User);
      expect(result?.userId).toBe('user-123');
      expect(store.loading).toBe(false);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('API error');
      console.error = jest.fn();
      mockGetUser.mockRejectedValue(mockError);

      await expect(store.fetchUserInfo('user-123')).rejects.toThrow('API error');
      expect(console.error).toHaveBeenCalledWith(
        'AnalyticsStore.fetchUserInfo',
        mockError,
      );
      expect(store.loading).toBe(false);
    });
  });

  describe('fetchUserEvents', () => {
    it('should fetch user activity events', async () => {
      const mockResponse = {
        total: 5,
        events: [createMockEvent(), createMockEvent()],
      };
      mockGetUserActivity.mockResolvedValue(mockResponse);
      const period = { start: Date.now() - 86400000, end: Date.now() };

      const result = await store.fetchUserEvents('user-123', 'desc', period, ['hidden'], 1, 50);

      expect(mockGetUserActivity).toHaveBeenCalledWith('user-123', {
        sortOrder: 'desc',
        sortBy: 'created_at',
        limit: 50,
        startTimestamp: period.start,
        endTimestamp: period.end,
        page: 1,
        hideEvents: ['hidden'],
      });
      expect(result.total).toBe(5);
      expect(result.events.length).toBe(2);
      expect(result.events[0]).toBeInstanceOf(Event);
      expect(store.loading).toBe(false);
    });

    it('should use default values for optional parameters', async () => {
      mockGetUserActivity.mockResolvedValue({ total: 0, events: [] });
      const period = { start: 1000, end: 2000 };

      await store.fetchUserEvents('user-123', 'asc', period);

      expect(mockGetUserActivity).toHaveBeenCalledWith('user-123', {
        sortOrder: 'asc',
        sortBy: 'created_at',
        limit: 100,
        startTimestamp: 1000,
        endTimestamp: 2000,
        page: 1,
        hideEvents: [],
      });
    });

    it('should handle errors and return empty result', async () => {
      const mockError = new Error('API error');
      console.error = jest.fn();
      mockGetUserActivity.mockRejectedValue(mockError);

      const result = await store.fetchUserEvents('user-123', 'desc', { start: 0, end: 1000 });

      expect(console.error).toHaveBeenCalledWith(
        'AnalyticsStore.fetchUserEvents',
        mockError,
      );
      expect(result).toEqual({ events: [], total: 0 });
      expect(store.loading).toBe(false);
    });
  });

  describe('updateUser', () => {
    it('should update user and return true on success', async () => {
      mockUpdateUser.mockResolvedValue(undefined);

      const result = await store.updateUser('user-123', { $name: 'Updated Name' });

      expect(mockUpdateUser).toHaveBeenCalledWith('user-123', { $name: 'Updated Name' });
      expect(result).toBe(true);
      expect(store.loading).toBe(false);
    });

    it('should return false on error', async () => {
      const mockError = new Error('API error');
      console.error = jest.fn();
      mockUpdateUser.mockRejectedValue(mockError);

      const result = await store.updateUser('user-123', { $name: 'Updated Name' });

      expect(console.error).toHaveBeenCalledWith('AnalyticsStore.updateUser', mockError);
      expect(result).toBe(false);
      expect(store.loading).toBe(false);
    });
  });

  describe('deleteUser', () => {
    it('should delete user and return true on success', async () => {
      mockDeleteUser.mockResolvedValue(undefined);

      const result = await store.deleteUser('user-123');

      expect(mockDeleteUser).toHaveBeenCalledWith('user-123');
      expect(result).toBe(true);
      expect(store.loading).toBe(false);
    });

    it('should return false on error', async () => {
      const mockError = new Error('API error');
      console.error = jest.fn();
      mockDeleteUser.mockRejectedValue(mockError);

      const result = await store.deleteUser('user-123');

      expect(console.error).toHaveBeenCalledWith('AnalyticsStore.deleteUser', mockError);
      expect(result).toBe(false);
      expect(store.loading).toBe(false);
    });
  });
});
