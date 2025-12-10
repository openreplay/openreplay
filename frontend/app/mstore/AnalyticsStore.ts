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

const defaultPayload = {
  sortOrder: 'desc',
  sortBy: 'created_at',
  limit: 10,
  startTimestamp: Date.now() - 3600 * 1000,
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

  addFilter = async (filter: Filter) => {
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
    const oldFilters = this.payloadFilters.filters;

    runInAction(() => {
      this.payloadFilters.filters = [...oldFilters, filter];
    });
  };

  updateFilter = (filterIndex: number, filter: Filter) => {
    this.payloadFilters.filters[filterIndex] = filter;
  };

  removeFilter = (filterIndex: number) => {
    this.payloadFilters.filters = this.payloadFilters.filters.filter(
      (_filter, i) => i !== filterIndex,
    );
  };

  setLoading = (loading: boolean) => {
    this.loading = loading;
  };

  fetchEvents = async () => {
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
      return null;
    } finally {
      this.setLoading(false);
    }
  };

  fetchUserEvents = async (userId: string, sort: 'asc' | 'desc', period: { start: number, end: number }) => {
    this.setLoading(true);
    try {
      const data = await analyticsService.getUserActivity(
        userId,
        {
          sortOrder: sort,
          sortBy: 'created_at',
          limit: 100,
          startTimestamp: period.start,
          endTimestamp: period.end,
          page: 1,
          hideEvents: [],
        },
      );
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
