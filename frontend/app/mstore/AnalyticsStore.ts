import { makeAutoObservable, runInAction } from 'mobx';
import { analyticsService } from '@/services';
import {
  EventsResponse,
  EventsPayload,
  UserResp,
  UsersResponse,
  UsersPayload,
} from '@/services/AnalyticsService';
import { Filter } from '@/mstore/types/filterConstants';
import Period, { LAST_24_HOURS } from 'Types/app/period';
import Event, {
  listColumns as eventListColumns,
} from './types/Analytics/Event';
import User, { listColumns as userListColumns } from './types/Analytics/User';
import { filterStore } from 'App/mstore';
import { checkFilterValue } from './types/filter';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const defaultPayload = {
  sortOrder: 'desc',
  sortBy: 'created_at',
  limit: 20,
  startTimestamp: Date.now() - ONE_DAY_MS,
  endTimestamp: Date.now(),
  columns: [],
  page: 1,
  filters: [] as Filter[],
} as EventsPayload | UsersPayload;

export default class AnalyticsStore {
  events: { total: number; events: Event[] } = {
    total: 0,
    events: [],
  };
  newEvents = 0;
  lastFetchedAt: number = 0;
  users: { total: number; users: User[] } = {
    total: 0,
    users: [],
  };
  loading: boolean = false;
  period = Period({ rangeName: LAST_24_HOURS });
  payloadFilters: EventsPayload = defaultPayload;
  usersPayloadFilters: UsersPayload = {
    ...defaultPayload,
    columns: userListColumns,
    sortBy: '$created_at',
  };

  constructor() {
    makeAutoObservable(this);
  }

  reset = () => {
    this.payloadFilters = defaultPayload;
    this.period = Period({ rangeName: LAST_24_HOURS });
    this.events = { total: 0, events: [] };
  };

  setPeriod = (period: any) => {
    this.period = period;
  };

  updateTimestamps = (period: any) => {
    const { start, end, rangeName } = period;
    this.setPeriod(Period({ start, end, rangeName }));
    this.editPayload({
      page: 1,
      startTimestamp: start,
      endTimestamp: end,
    });
  };

  editPayload = (newPayload: Partial<EventsPayload>) => {
    this.payloadFilters = {
      ...this.payloadFilters,
      ...newPayload,
    };
    if (!('page' in newPayload)) {
      this.payloadFilters.page = 1;
    }
  };

  editUsersPayload = (newPayload: Partial<UsersPayload>) => {
    this.usersPayloadFilters = {
      ...this.usersPayloadFilters,
      ...newPayload,
    };
    if (!('page' in newPayload)) {
      this.usersPayloadFilters.page = 1;
    }
  };

  processFilter = async (filter: Filter) => {
    if (filter.isEvent && (!filter.filters || filter.filters.length === 0)) {
      const props = await filterStore.getEventFilters(filter.id);
      filter.filters = props?.filter((prop) => prop.defaultProperty);
    }
    filter.value = checkFilterValue(filter.value);
    filter.operator = filter.operator || 'is';
    filter.filters = filter.filters
      ? filter.filters.map((subFilter: any) => ({
          ...subFilter,
          value: checkFilterValue(subFilter.value),
        }))
      : [];

    return filter;
  };

  addFilter = async (filter: Filter) => {
    const newFilter = await this.processFilter(filter);

    const oldFilters = this.payloadFilters.filters;
    runInAction(() => {
      this.payloadFilters.filters = [...oldFilters, newFilter];
      this.payloadFilters.page = 1;
    });
  };

  addUserFilter = async (filter: Filter) => {
    const newFilter = await this.processFilter(filter);

    const oldFilters = this.usersPayloadFilters.filters;
    runInAction(() => {
      this.usersPayloadFilters.filters = [...oldFilters, newFilter];
      this.usersPayloadFilters.page = 1;
    });
  };

  updateUserFilter = (filterIndex: number, filter: Filter) => {
    this.usersPayloadFilters.filters[filterIndex] = filter;
    this.usersPayloadFilters.page = 1;
  };

  removeUserFilter = (filterIndex: number) => {
    this.usersPayloadFilters.filters = this.usersPayloadFilters.filters.filter(
      (_filter, i) => i !== filterIndex,
    );
    this.usersPayloadFilters.page = 1;
  };

  updateFilter = (filterIndex: number, filter: Filter) => {
    this.payloadFilters.filters[filterIndex] = filter;
    this.payloadFilters.page = 1;
  };

  removeFilter = (filterIndex: number) => {
    this.payloadFilters.filters = this.payloadFilters.filters.filter(
      (_filter, i) => i !== filterIndex,
    );
    this.payloadFilters.page = 1;
  };

  setLoading = (loading: boolean) => {
    this.loading = loading;
  };

  fetchEvents = async () => {
    this.newEvents = 0;
    this.lastFetchedAt = Date.now();
    this.setLoading(true);
    try {
      const data: EventsResponse = await analyticsService.getEvents({
        ...this.payloadFilters,
        columns: eventListColumns,
      });
      this.events = {
        total: data.total,
        events: data.events.map((ev) => new Event(ev)),
      };

      return data;
    } catch (e) {
      console.error('AnalyticsStore.fetchEvents', e);
      return { events: [], total: 0 };
    } finally {
      this.setLoading(false);
    }
  };

  checkLatest = async () => {
    const data = await analyticsService.getEvents({
      ...this.payloadFilters,
      startTimestamp: this.lastFetchedAt,
      endTimestamp: Date.now(),
      limit: 1,
      sortOrder: 'desc',
      sortBy: 'created_at',
      columns: eventListColumns,
    });
    if (data.total > 0) {
      this.newEvents = data.total;
    }
  };

  fetchUsers = async (query: string) => {
    this.setLoading(true);
    try {
      const data: UsersResponse = await analyticsService.getUsers({
        ...this.usersPayloadFilters,
        query,
      });
      this.users = {
        total: data.total,
        users: data.users.map((user) => new User(user)),
      };

      return data;
    } catch (e) {
      console.error('AnalyticsStore.fetchUsers', e);
      return { users: [], total: 0 };
    } finally {
      this.setLoading(false);
    }
  };

  fetchUserInfo = async (userId: string): Promise<User | null> => {
    this.setLoading(true);
    try {
      const data: UserResp = await analyticsService.getUser(userId);
      return new User(data);
    } catch (e) {
      console.error('AnalyticsStore.fetchUserInfo', e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  };

  fetchUserEvents = async (
    userId: string,
    sort: 'asc' | 'desc',
    period: { start: number; end: number },
    hiddenEvents: string[] = [],
  ) => {
    this.setLoading(true);
    try {
      const data = await analyticsService.getUserActivity(userId, {
        sortOrder: sort,
        sortBy: 'created_at',
        limit: 100,
        startTimestamp: period.start,
        endTimestamp: period.end,
        page: 1,
        hideEvents: hiddenEvents,
      });
      return {
        total: data.total,
        events: data.events.map((ev) => new Event(ev)),
      };
    } catch (e) {
      console.error('AnalyticsStore.fetchUserEvents', e);
      return { events: [], total: 0 };
    } finally {
      this.setLoading(false);
    }
  };

  updateUser = async (
    userId: string,
    updatedUser: Partial<UserResp>,
  ): Promise<boolean> => {
    this.setLoading(true);
    try {
      await analyticsService.updateUser(userId, updatedUser);
      return true;
    } catch (e) {
      console.error('AnalyticsStore.updateUser', e);
      return false;
    } finally {
      this.setLoading(false);
    }
  };

  deleteUser = async (userId: string): Promise<boolean> => {
    this.setLoading(true);
    try {
      await analyticsService.deleteUser(userId);
      return true;
    } catch (e) {
      console.error('AnalyticsStore.deleteUser', e);
      return false;
    } finally {
      this.setLoading(false);
    }
  };
}
