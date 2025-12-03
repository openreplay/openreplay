import { makeAutoObservable } from 'mobx';
import { analyticsService } from '@/services';
import { EventsResponse, EventsPayload } from '@/services/AnalyticsService';
import { Filter } from '@/mstore/types/filterConstants';
import Period, { LAST_24_HOURS } from 'Types/app/period';
import Event, { listColumns } from './types/Analytics/Event';

export default class AnalyticsStore {
  events: { total: number; events: Event[] } = {
    total: 0,
    events: [],
  };
  loading: boolean = false;
  period = Period({ rangeName: LAST_24_HOURS });
  payloadFilters: EventsPayload = {
    sortOrder: 'desc',
    sortBy: 'time',
    limit: 10,
    startTimestamp: Date.now() - 3600 * 1000,
    endTimestamp: Date.now(),
    columns: [],
    page: 1,
    filters: [] as Filter[],
  };

  constructor() {
    makeAutoObservable(this);
  }

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

  addFilter = (filter: Filter) => {
    this.payloadFilters.filters.push(filter);
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
}
