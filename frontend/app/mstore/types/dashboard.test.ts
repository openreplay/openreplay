import Period, { CUSTOM_RANGE, LAST_24_HOURS } from 'Types/app/period';
import {
  getDashboardDefaultPeriod,
  getSerializedDashboardPeriod,
} from './dashboardPeriod';

describe('dashboard period config helpers', () => {
  it('falls back to the default dashboard period when config is missing', () => {
    const period = getDashboardDefaultPeriod({});

    expect(period.rangeName).toBe(LAST_24_HOURS);
  });

  it('serializes a preset period without dropping start and end', () => {
    const period = Period({ rangeName: LAST_24_HOURS });

    expect(getSerializedDashboardPeriod(period)).toEqual({
      rangeName: LAST_24_HOURS,
      start: period.start,
      end: period.end,
    });
  });

  it('preserves custom ranges for dashboard defaults', () => {
    const period = Period({
      rangeName: CUSTOM_RANGE,
      start: 1700000000000,
      end: 1700086400000,
    });

    const defaultPeriod = getDashboardDefaultPeriod({ defaultPeriod: period });

    expect(defaultPeriod.rangeName).toBe(CUSTOM_RANGE);
    expect(defaultPeriod.start).toBe(1700000000000);
    expect(defaultPeriod.end).toBe(1700086400000);
  });
});
