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
import Event, { listColumns } from './types/Analytics/Event';
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
  users: { total: number; users: UserResp[] } = {
    total: 0,
    users: [],
  };
  loading: boolean = false;
  period = Period({ rangeName: LAST_24_HOURS });
  payloadFilters: EventsPayload = defaultPayload;
  usersPayloadFilters: UsersPayload = defaultPayload;

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
        columns: listColumns,
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

  fetchUsers = async () => {
    this.setLoading(true);
  };
}
