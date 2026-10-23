import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { heatmapJumpTime } from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/ClickMapCard/heatmapJumpTime';
import { HEATMAP, HEATMAP_CLICKS } from 'App/constants/card';
import DashboardStore from 'App/mstore/dashboardStore';
import Widget from 'App/mstore/types/widget';

const getMetricChartData = jest.fn<(...args: any[]) => Promise<any>>();
const fetchSessionInfo = jest.fn<(...args: any[]) => Promise<any>>();

jest.mock('App/mstore', () => ({
  sessionStore: { fetchSessionInfo: (...a: any[]) => fetchSessionInfo(...a) },
  filterStore: {
    findEvent: jest.fn(() => ({ filters: [] })),
    getEventFilters: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock('App/services', () => ({
  metricService: {
    getMetricChartData: (...a: any[]) => getMetricChartData(...a),
  },
  dashboardService: {},
}));

const period = {
  toTimestamps: () => ({ startTimestamp: 1, endTimestamp: 2 }),
};

function heatmapWidget() {
  const w = new Widget();
  w.metricType = HEATMAP;
  return w;
}

const session = {
  sessionId: '42',
  startTs: 1700000000000,
  eventTimestamp: 1700000012345,
};
const points = [{ normalizedX: 10, normalizedY: 20, count: 3 }];

describe('heatmap card data', () => {
  beforeEach(() => {
    getMetricChartData.mockReset();
    fetchSessionInfo.mockReset();
  });

  it('requests clicks alongside the session, not after it', async () => {
    let releaseSession!: (v: any) => void;
    getMetricChartData.mockImplementation((_m, params: any) =>
      params.metricType === HEATMAP_CLICKS
        ? Promise.resolve(points)
        : new Promise((r) => (releaseSession = r)),
    );
    fetchSessionInfo.mockResolvedValue({
      domURL: ['dom.mobs'],
      startTs: 1700000000321,
      trackerVersion: '19.0.0',
    });

    const store = new DashboardStore();
    const metric = heatmapWidget();
    const done = store.fetchMetricChartData(metric, {}, true, period);

    // both requests are out while the session one is still pending
    expect(getMetricChartData).toHaveBeenCalledTimes(2);
    const clicksCall = getMetricChartData.mock.calls.find(
      (c: any[]) => c[1].metricType === HEATMAP_CLICKS,
    )!;
    // clicks go through /cards/try even for a saved card
    expect(clicksCall[2]).toBe(false);

    releaseSession(session);
    await done;
    expect(metric.data.points).toEqual(points);
    expect(metric.data.domURL).toEqual(['dom.mobs']);
    expect(metric.data.startedAt).toBe(1700000000321);
  });

  it('keeps the session when the clicks request fails', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    getMetricChartData.mockImplementation((_m, params: any) =>
      params.metricType === HEATMAP_CLICKS
        ? Promise.reject(new Error('boom'))
        : Promise.resolve(session),
    );
    fetchSessionInfo.mockResolvedValue({ domURL: ['dom.mobs'] });

    const metric = heatmapWidget();
    await new DashboardStore().fetchMetricChartData(metric, {}, false, period);
    expect(metric.data.sessionId).toBe('42');
    expect(metric.data.points).toEqual([]);
    error.mockRestore();
  });

  it('refetches clicks on every load even when the same session comes back', async () => {
    getMetricChartData.mockImplementation((_m, params: any) =>
      Promise.resolve(params.metricType === HEATMAP_CLICKS ? points : session),
    );
    fetchSessionInfo.mockResolvedValue({ domURL: ['dom.mobs'] });
    const store = new DashboardStore();
    const metric = heatmapWidget();

    await store.fetchMetricChartData(
      metric,
      { includeClickRage: false },
      false,
      period,
    );
    const narrowed = [{ normalizedX: 50, normalizedY: 50, count: 1 }];
    getMetricChartData.mockImplementation((_m, params: any) =>
      Promise.resolve(
        params.metricType === HEATMAP_CLICKS ? narrowed : session,
      ),
    );
    await store.fetchMetricChartData(
      metric,
      { includeClickRage: true },
      false,
      period,
    );

    expect(metric.data.sessionId).toBe('42');
    expect(metric.data.points).toEqual(narrowed);
  });

  it('does not request clicks for other card types', async () => {
    getMetricChartData.mockResolvedValue([]);
    const metric = new Widget();
    metric.metricType = 'timeseries';
    await new DashboardStore().fetchMetricChartData(metric, {}, false, period);
    expect(getMetricChartData).toHaveBeenCalledTimes(1);
  });
});

describe('heatmapJumpTime', () => {
  it('lands 1ms before the click, on the session real start', () => {
    expect(
      heatmapJumpTime({
        startTs: 1700000000000, // second-truncated by the heatmap query
        startedAt: 1700000000321,
        eventTimestamp: 1700000012345,
      }),
    ).toBe(12345 - 321 - 1);
  });

  it('falls back to the session start without a click', () => {
    expect(heatmapJumpTime({ startTs: 1700000000000 })).toBe(0);
  });
});
