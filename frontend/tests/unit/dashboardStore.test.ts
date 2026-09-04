import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LAST_7_DAYS } from 'Types/app/period';

import { DASHBOARD_TIME_RANGE } from 'App/constants/storageKeys';
import { CUSTOM_RANGE } from 'App/dateRange';
import DashboardStore from 'App/mstore/dashboardStore';

jest.mock('@/mstore/index', () => ({
  filterStore: {
    findEvent: jest.fn(() => ({ filters: [] })),
    getEventFilters: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock('App/mstore', () => ({
  filterStore: {
    findEvent: jest.fn(() => ({ filters: [] })),
    getEventFilters: jest.fn(() => Promise.resolve([])),
  },
  sessionStore: {},
}));

jest.mock('App/services', () => ({
  dashboardService: {},
  metricService: {},
}));

describe('DashboardStore time range preference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('restores the saved preset for dashboard and drill-down periods', () => {
    localStorage.setItem(DASHBOARD_TIME_RANGE, LAST_7_DAYS);

    const store = new DashboardStore();

    expect(store.period.rangeName).toBe(LAST_7_DAYS);
    expect(store.drillDownPeriod.rangeName).toBe(LAST_7_DAYS);
  });

  it('persists a selected preset', () => {
    const store = new DashboardStore();

    store.setPeriod({ rangeName: LAST_7_DAYS });

    expect(localStorage.getItem(DASHBOARD_TIME_RANGE)).toBe(LAST_7_DAYS);
  });

  it('returns to the last preset after a custom range', () => {
    localStorage.setItem(DASHBOARD_TIME_RANGE, LAST_7_DAYS);
    const store = new DashboardStore();
    const end = Date.now();
    const start = end - 7 * 24 * 60 * 60 * 1000;

    store.setPeriod({
      start,
      end,
      rangeName: CUSTOM_RANGE,
    });
    store.resetPeriod();

    expect(localStorage.getItem(DASHBOARD_TIME_RANGE)).toBe(LAST_7_DAYS);
    expect(store.period.rangeName).toBe(LAST_7_DAYS);
  });
});
