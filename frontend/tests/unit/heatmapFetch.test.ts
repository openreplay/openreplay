import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { heatmapJumpTime } from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/ClickMapCard/heatmapJumpTime';
import { scrollReach } from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/ClickMapCard/scrollReach';
import {
  minimapBox,
  windowView,
} from 'App/components/Session/Player/ClickMapRenderer/HeatmapMinimap';
import {
  HEATMAP,
  HEATMAP_CLICKS,
  HEATMAP_SCROLL_MAP,
} from 'App/constants/card';
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

  it("keeps a scroll map's depths and drops stale clicks", async () => {
    const depths = {
      sessions: 10,
      fold: 30,
      depths: [{ depth: 50, sessions: 10 }],
    };
    getMetricChartData.mockImplementation((_m, params: any) =>
      Promise.resolve(params.metricType === HEATMAP_CLICKS ? depths : session),
    );
    fetchSessionInfo.mockResolvedValue({ domURL: ['dom.mobs'] });
    const metric = heatmapWidget();
    metric.data.points = points;
    metric.metricOf = HEATMAP_SCROLL_MAP;
    await new DashboardStore().fetchMetricChartData(metric, {}, false, period);
    expect(metric.data.scroll).toEqual(depths);
    expect(metric.data.points).toEqual([]);
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

describe('scrollReach', () => {
  const data = {
    sessions: 1200,
    fold: 30,
    depths: [
      { depth: 30, sessions: 200 },
      { depth: 45, sessions: 250 },
      { depth: 60, sessions: 300 },
      { depth: 80, sessions: 250 },
      { depth: 100, sessions: 200 },
    ],
  };

  it('turns deepest depths into the share that saw each depth', () => {
    const r = scrollReach(data)!;
    expect(r.reach[0]).toBe(100);
    expect(r.reach[30]).toBe(100);
    expect(r.reach[31]).toBeCloseTo(83.33, 1);
    expect(r.reach[100]).toBeCloseTo(16.67, 1);
  });

  it('marks where readers fall to 75, 50 and 25%, and the median', () => {
    const r = scrollReach(data)!;
    expect(r.marks).toEqual([
      { share: 75, depth: 46 },
      { share: 50, depth: 61 },
      { share: 25, depth: 81 },
    ]);
    expect(r.median).toBe(61);
  });

  it('omits a line nobody stops before', () => {
    const r = scrollReach({
      sessions: 4,
      fold: 100,
      depths: [{ depth: 100, sessions: 4 }],
    })!;
    expect(r.marks).toEqual([]);
    expect(r.median).toBe(100);
  });

  it('has nothing to draw without sessions', () => {
    expect(scrollReach({ sessions: 0, fold: 30, depths: [] })).toBeNull();
    expect(scrollReach(null)).toBeNull();
  });
});

describe('heatmap minimap', () => {
  it('fills the column, or the window height for a long page', () => {
    expect(minimapBox(72, 500, 1280, 2560)).toEqual({ width: 72, height: 144 });
    const long = minimapBox(72, 500, 1280, 25600);
    expect(long.height).toBe(500);
    expect(long.width).toBeCloseTo(25, 0);
  });

  it('frames what the window shows', () => {
    expect(
      windowView({ scrollTop: 500, scrollHeight: 2000, clientHeight: 400 }),
    ).toEqual({ top: 0.25, size: 0.2 });
    expect(
      windowView({ scrollTop: 0, scrollHeight: 300, clientHeight: 400 }),
    ).toEqual({ top: 0, size: 1 });
  });
});
