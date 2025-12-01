import { makeAutoObservable } from 'mobx';
import { analyticsService } from '@/services';
import {
  EventsResponse,
  EventResp,
  EventsPayload,
} from '@/services/AnalyticsService';
import { Filter } from '@/mstore/types/filterConstants';

export default class AnalyticsStore {
  events: EventsResponse = {
    total: 0,
    events: [],
  };
  loading: boolean = false;

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
      const data: EventsResponse = await analyticsService.getEvents(
        this.payloadFilters,
      );
      this.events = data;

      return data;
    } catch (e) {
      console.error('AnalyticsStore.fetchEvents', e);
      return { events: [], total: 0 };
    } finally {
      this.setLoading(false);
    }
  };
}
