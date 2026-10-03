import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

jest.mock(
  'App/components/Dashboard/components/MetricTypeItem/MetricTypeItem',
  () => ({}),
);
jest.mock('App/components/ui/SVG', () => ({}));

const originalSeriesLimit = process.env.DASHBOARD_SERIES_LIMIT;

const loadSeriesLimit = async () => {
  const { MAX_DASHBOARD_SERIES } = await import('App/constants/card');
  return MAX_DASHBOARD_SERIES;
};

describe('dashboard series limit configuration', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.DASHBOARD_SERIES_LIMIT;
  });

  afterAll(() => {
    if (originalSeriesLimit === undefined) {
      delete process.env.DASHBOARD_SERIES_LIMIT;
    } else {
      process.env.DASHBOARD_SERIES_LIMIT = originalSeriesLimit;
    }
  });

  it('defaults to the backend maximum', async () => {
    await expect(loadSeriesLimit()).resolves.toBe(5);
  });

  it('uses a configured limit below the backend maximum', async () => {
    process.env.DASHBOARD_SERIES_LIMIT = '3';

    await expect(loadSeriesLimit()).resolves.toBe(3);
  });

  it('caps a configured limit at the backend maximum', async () => {
    process.env.DASHBOARD_SERIES_LIMIT = '10';

    await expect(loadSeriesLimit()).resolves.toBe(5);
  });

  it.each(['0', '-1', '2.5', 'invalid'])(
    'falls back for invalid value %s',
    async (value) => {
      process.env.DASHBOARD_SERIES_LIMIT = value;

      await expect(loadSeriesLimit()).resolves.toBe(5);
    },
  );
});
