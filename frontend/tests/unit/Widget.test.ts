import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.mock('App/mstore', () => ({
  filterStore: {
    findEvent: jest.fn(() => ({ filters: [] })),
    getEventFilters: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock('App/services', () => ({
  metricService: {},
}));

import Widget, { InsightIssue } from 'App/mstore/types/widget';

const fakePeriod = { startTimestamp: 0, endTimestamp: 86400000 };

describe('Widget.isNewSeriesFormat (via setData)', () => {
  it('returns early for null/undefined data', () => {
    const w = new Widget();
    expect(w.setData(null, fakePeriod)).toBeUndefined();
    expect(w.setData(undefined, fakePeriod)).toBeUndefined();
  });
});

describe('Widget.calculateTotalSeries', () => {
  it('sums non-timestamp keys per entry', () => {
    const w = new Widget();
    const data = [
      { timestamp: 1, a: 10, b: 20 },
      { timestamp: 2, a: 5, b: 15 },
    ];
    const result = w.calculateTotalSeries(data);
    expect(result).toEqual([
      { timestamp: 1, a: 10, b: 20, Total: 30 },
      { timestamp: 2, a: 5, b: 15, Total: 20 },
    ]);
  });

  it('returns empty array for non-array input', () => {
    const w = new Widget();
    expect(w.calculateTotalSeries(null)).toEqual([]);
    expect(w.calculateTotalSeries('string')).toEqual([]);
    expect(w.calculateTotalSeries({})).toEqual([]);
  });

  it('handles entries with only timestamp', () => {
    const w = new Widget();
    const result = w.calculateTotalSeries([{ timestamp: 1 }]);
    expect(result).toEqual([{ timestamp: 1, Total: 0 }]);
  });

  it('ignores time key alongside timestamp', () => {
    const w = new Widget();
    const result = w.calculateTotalSeries([
      { timestamp: 1, time: '12:00', a: 5 },
    ]);
    // both "timestamp" and "time" are excluded from the sum
    expect(result[0].Total).toBe(5);
  });
});

describe('Widget.transformNewSeriesFormat (timeseries)', () => {
  it('transforms flat series (no breakdown) into chart + namesMap', () => {
    const w = new Widget();
    w.metricType = 'timeseries';

    const data = {
      series: {
        'Series 1': {
          $overall: { '1000': 10, '2000': 20 },
        },
      },
    };

    const result = w.setData(data, fakePeriod);
    expect(result.namesMap).toEqual(['Series 1']);
    expect(result.chart).toHaveLength(2);
    expect(result.chart[0]).toHaveProperty('Series 1', 10);
    expect(result.chart[1]).toHaveProperty('Series 1', 20);
  });

  it('transforms series with breakdown into leaf-level chart lines', () => {
    const w = new Widget();
    w.metricType = 'timeseries';

    const data = {
      series: {
        'Series 1': {
          $overall: { '1000': 30 },
          US: { '1000': 20 },
          EU: { '1000': 10 },
        },
      },
    };

    const result = w.setData(data, fakePeriod);
    // breakdown lines are collected from non-$overall keys
    expect(result.namesMap).toContain('Series 1 / US');
    expect(result.namesMap).toContain('Series 1 / EU');
    // sorted by total descending
    expect(result.namesMap[0]).toBe('Series 1 / US');
  });

  it('handles multiple series', () => {
    const w = new Widget();
    w.metricType = 'timeseries';

    const data = {
      series: {
        'Series A': { $overall: { '1000': 100 } },
        'Series B': { $overall: { '1000': 50 } },
      },
    };

    const result = w.setData(data, fakePeriod);
    expect(result.namesMap).toContain('Series A');
    expect(result.namesMap).toContain('Series B');
    expect(result.chart[0]).toHaveProperty('Series A', 100);
    expect(result.chart[0]).toHaveProperty('Series B', 50);
  });

  it('fills missing timestamps with 0', () => {
    const w = new Widget();
    w.metricType = 'timeseries';

    const data = {
      series: {
        A: { $overall: { '1000': 10, '2000': 20 } },
        B: { $overall: { '1000': 5 } }, // missing ts 2000
      },
    };

    const result = w.setData(data, fakePeriod);
    const point2000 = result.chart.find((p: any) => p.timestamp === 2000);
    expect(point2000.B).toBe(0);
    expect(point2000.A).toBe(20);
  });

  it('prefixes names with "Previous" for comparison data', () => {
    const w = new Widget();
    w.metricType = 'timeseries';

    const data = {
      series: {
        'Series 1': { $overall: { '1000': 10 } },
      },
    };

    const result = w.setData(data, fakePeriod, true);
    expect(result.namesMap).toEqual(['Previous Series 1']);
    expect(result.chart[0]).toHaveProperty('Previous Series 1', 10);
  });

  it('produces breakdownData for the table component', () => {
    const w = new Widget();
    w.metricType = 'timeseries';

    const data = {
      series: {
        'Series 1': {
          $overall: { '1000': 30 },
          US: { '1000': 20 },
          EU: { '1000': 10 },
        },
      },
    };

    const result = w.setData(data, fakePeriod);
    expect(result.breakdownData).toBeDefined();
    expect(result.breakdownData['Series 1']).toBeDefined();
    // $overall should be stripped from breakdown data
    expect(result.breakdownData['Series 1']['$overall']).toBeUndefined();
    expect(result.breakdownData['Series 1']['US']).toEqual({ '1000': 20 });
  });

  it('handles leaf-only series (no $overall, no breakdown)', () => {
    const w = new Widget();
    w.metricType = 'timeseries';

    const data = {
      series: {
        'Series 1': { '1000': 10, '2000': 20 },
      },
    };

    const result = w.setData(data, fakePeriod);
    expect(result.namesMap).toEqual(['Series 1']);
    expect(result.chart).toHaveLength(2);
  });
});

describe('Widget.transformFunnelSeriesFormat', () => {
  it('transforms funnel without breakdown', () => {
    const w = new Widget();
    w.metricType = 'funnel';

    const data = {
      series: {
        'Series 1': {
          stages: [
            { count: 100, type: 'LOCATION', value: ['/home'] },
            { count: 50, type: 'LOCATION', value: ['/checkout'] },
          ],
        },
      },
    };

    const result = w.setData(data, fakePeriod);
    expect(result.funnel).toBeDefined();
    expect(result.funnel.stages).toHaveLength(2);
    expect(result.funnel.stages[0].count).toBe(100);
    expect(result.funnel.stages[1].count).toBe(50);
    expect(result.funnel.totalConversions).toBe(50);
    expect(result.funnel.lostConversions).toBe(50);
  });

  it('transforms funnel with breakdown ($overall + breakdown keys)', () => {
    const w = new Widget();
    w.metricType = 'funnel';

    const data = {
      series: {
        'Series 1': {
          $overall: {
            stages: [
              { count: 200, type: 'LOCATION', value: ['/home'] },
              { count: 100, type: 'LOCATION', value: ['/checkout'] },
            ],
          },
          US: {
            stages: [
              { count: 150, type: 'LOCATION', value: ['/home'] },
              { count: 80, type: 'LOCATION', value: ['/checkout'] },
            ],
          },
          EU: {
            stages: [
              { count: 50, type: 'LOCATION', value: ['/home'] },
              { count: 20, type: 'LOCATION', value: ['/checkout'] },
            ],
          },
        },
      },
    };

    const result = w.setData(data, fakePeriod);
    expect(result.funnel.stages).toHaveLength(2);
    expect(result.funnel.stages[0].count).toBe(200);
    expect(result.funnelBreakdown).toBeDefined();
    expect(Object.keys(result.funnelBreakdown)).toContain('US');
    expect(Object.keys(result.funnelBreakdown)).toContain('EU');
    // sorted by first stage count desc
    const bdKeys = Object.keys(result.funnelBreakdown);
    expect(bdKeys[0]).toBe('US');
  });

  it('returns empty funnel for empty series', () => {
    const w = new Widget();
    w.metricType = 'funnel';

    const result = w.setData({ series: {} }, fakePeriod);
    expect(result.funnel).toBeDefined();
    expect(result.funnel.stages).toEqual([]);
  });
});

describe('Widget.transformTableSeriesFormat', () => {
  it('transforms flat table data (no breakdown)', () => {
    const w = new Widget();
    w.metricType = 'table';
    w.metricOf = 'sessionCount';

    const data = {
      series: {
        'Series 1': {
          total: 500,
          count: 100,
          values: [
            { name: '/home', total: 60 },
            { name: '/about', total: 40 },
          ],
        },
      },
    };

    const result = w.setData(data, fakePeriod);
    expect(result.values).toHaveLength(2);
    expect(result.total).toBe(500);
    expect(result.hasBreakdown).toBe(false);
  });

  it('transforms table data with breakdown', () => {
    const w = new Widget();
    w.metricType = 'table';
    w.metricOf = 'sessionCount';

    const data = {
      series: {
        'Series 1': {
          $overall: {
            total: 500,
            count: 100,
            values: [
              { name: '/home', total: 60 },
              { name: '/about', total: 40 },
            ],
          },
          US: {
            values: [{ name: '/home', total: 40 }],
          },
        },
      },
    };

    const result = w.setData(data, fakePeriod);
    expect(result.values).toHaveLength(2);
    expect(result.total).toBe(500);
    expect(result.hasBreakdown).toBe(true);
  });

  it('returns empty values for empty series', () => {
    const w = new Widget();
    w.metricType = 'table';

    const result = w.setData({ series: {} }, fakePeriod);
    expect(result.values).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.hasBreakdown).toBe(false);
  });
});

describe('Widget.collectBreakdownRows (via table transform)', () => {
  it('collects nested breakdown rows sorted by total', () => {
    const w = new Widget();
    w.metricType = 'table';
    w.metricOf = 'sessionCount';

    const data = {
      series: {
        'Series 1': {
          $overall: {
            total: 200,
            count: 50,
            values: [{ name: '/home', total: 100 }],
          },
          US: {
            $overall: {
              values: [{ name: '/home', total: 70 }],
            },
            'New York': {
              values: [{ name: '/home', total: 40 }],
            },
            'LA': {
              values: [{ name: '/home', total: 30 }],
            },
          },
          EU: {
            values: [{ name: '/home', total: 30 }],
          },
        },
      },
    };

    const result = w.setData(data, fakePeriod);
    const homeRow = result.values[0];
    expect(homeRow.breakdownRows).toBeDefined();
    // US total=70, EU total=30 → US first
    expect(homeRow.breakdownRows[0].key).toBe('US');
    expect(homeRow.breakdownRows[0].total).toBe(70);
    // US has nested children
    expect(homeRow.breakdownRows[0].children).toHaveLength(2);
    expect(homeRow.breakdownRows[0].children[0].key).toBe('New York');
    expect(homeRow.breakdownRows[1].key).toBe('EU');
    expect(homeRow.breakdownRows[1].children).toEqual([]);
  });
});

describe('Widget.setData legacy format', () => {
  it('parses legacy timeseries with chart property', () => {
    const w = new Widget();
    w.metricType = 'timeseries';

    const data = {
      chart: [
        { timestamp: 1000, 'Series 1': 10 },
        { timestamp: 2000, 'Series 1': 20 },
      ],
      value: 42,
      unit: 'ms',
    };

    const result = w.setData(data, fakePeriod);
    expect(result.chart).toHaveLength(2);
    expect(result.namesMap).toEqual(['Series 1']);
    expect(result.value).toBe(42);
    expect(result.unit).toBe('ms');
  });

  it('parses legacy timeseries array (no chart property)', () => {
    const w = new Widget();
    w.metricType = 'timeseries';

    const data = [
      { timestamp: 1000, 'Series A': 5 },
      { timestamp: 2000, 'Series A': 15 },
    ];

    const result = w.setData(data, fakePeriod);
    expect(result.chart).toHaveLength(2);
    expect(result.namesMap).toEqual(['Series A']);
  });

  it('deduplicates namesMap for legacy format', () => {
    const w = new Widget();
    w.metricType = 'timeseries';

    const data = [
      { timestamp: 1000, A: 1, B: 2 },
      { timestamp: 2000, A: 3, B: 4 },
    ];

    const result = w.setData(data, fakePeriod);
    expect(result.namesMap).toEqual(['A', 'B']);
  });

  it('prefixes keys with "Previous" for comparison in legacy format', () => {
    const w = new Widget();
    w.metricType = 'timeseries';

    const data = [
      { timestamp: 1000, 'Series 1': 10 },
      { timestamp: 2000, 'Series 1': 20 },
    ];

    const result = w.setData(data, fakePeriod, true);
    expect(result.chart[0]).toHaveProperty('Previous Series 1');
    expect(result.chart[0]).not.toHaveProperty('Series 1');
  });

  it('parses legacy funnel', () => {
    const w = new Widget();
    w.metricType = 'funnel';

    const data = {
      stages: [
        { count: 100, type: 'LOCATION', value: ['/home'] },
        { count: 40, type: 'LOCATION', value: ['/buy'] },
      ],
    };

    const result = w.setData(data, fakePeriod);
    expect(result.funnel.stages).toHaveLength(2);
    expect(result.funnel.totalConversions).toBe(40);
  });

  it('parses legacy table', () => {
    const w = new Widget();
    w.metricType = 'table';
    w.metricOf = 'sessionCount';

    const data = {
      total: 300,
      count: 80,
      values: [
        { name: '/page1', total: 50 },
        { name: '/page2', total: 30 },
      ],
    };

    const result = w.setData(data, fakePeriod);
    expect(result.values).toHaveLength(2);
    expect(result.total).toBe(300);
  });

  it('parses insights data', () => {
    const w = new Widget();
    w.metricType = 'insights';

    const data = [
      {
        category: 'errors',
        name: 'JS Error',
        ratio: 0.5,
        oldValue: 10,
        value: 20,
        change: 10,
        isNew: false,
      },
      {
        category: 'performance',
        name: 'Slow Page',
        ratio: 0.3,
        oldValue: 5,
        value: 3,
        change: -2,
        isNew: false,
      },
      {
        category: 'stability',
        name: 'No Change',
        ratio: 0.1,
        oldValue: 10,
        value: 10,
        change: 0,
        isNew: false,
      },
    ];

    const result = w.setData(data, fakePeriod);
    // change === 0 is filtered out
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0]).toBeInstanceOf(InsightIssue);
  });
});

describe('Widget.fromJson / toJson', () => {
  it('round-trips basic properties', () => {
    const w = new Widget();
    w.fromJson({
      metricId: 'abc-123',
      widgetId: 'w-1',
      name: 'My Widget',
      metricType: 'timeseries',
      metricOf: 'sessionCount',
      metricFormat: 'sessionCount',
      viewType: 'lineChart',
      series: [],
      breakdowns: ['userCountry', 'userCity'],
      sortBy: 'total',
      sortOrder: 'asc',
    });

    expect(w.metricId).toBe('abc-123');
    expect(w.name).toBe('My Widget');
    expect(w.breakdowns).toEqual(['userCountry', 'userCity']);
    expect(w.sortBy).toBe('total');
    expect(w.sortOrder).toBe('asc');

    const json = w.toJson();
    expect(json.metricId).toBe('abc-123');
    expect(json.name).toBe('My Widget');
    expect(json.breakdowns).toEqual(['userCountry', 'userCity']);
    expect(json.sortBy).toBe('total');
    expect(json.sortOrder).toBe('asc');
  });

  it('defaults breakdowns to empty array', () => {
    const w = new Widget();
    w.fromJson({ metricType: 'timeseries', series: [] });
    expect(w.breakdowns).toEqual([]);
  });

  it('defaults sortOrder to desc', () => {
    const w = new Widget();
    w.fromJson({ metricType: 'timeseries', series: [] });
    expect(w.sortOrder).toBe('desc');
  });

  it('creates default series when none provided', () => {
    const w = new Widget();
    w.fromJson({ metricType: 'timeseries', series: [] });
    expect(w.series).toHaveLength(1);
  });

  it('sets compareTo from json', () => {
    const w = new Widget();
    w.fromJson({
      metricType: 'timeseries',
      series: [],
      compareTo: ['2025-01-01', '2025-01-07'],
    });
    expect(w.compareTo).toEqual(['2025-01-01', '2025-01-07']);
  });

  it('defaults compareTo to null', () => {
    const w = new Widget();
    w.fromJson({ metricType: 'timeseries', series: [] });
    expect(w.compareTo).toBeNull();
  });
});

describe('Widget breakdown management', () => {
  it('addBreakdown appends and marks changed', () => {
    const w = new Widget();
    w.addBreakdown({ name: 'userCountry' });
    expect(w.breakdowns).toEqual(['userCountry']);
    expect(w.hasChanged).toBe(true);
  });

  it('updateBreakdown replaces at index', () => {
    const w = new Widget();
    w.breakdowns = ['userCountry', 'userCity'];
    w.updateBreakdown(1, { name: 'userBrowser' });
    expect(w.breakdowns).toEqual(['userCountry', 'userBrowser']);
  });

  it('removeBreakdown removes at index', () => {
    const w = new Widget();
    w.breakdowns = ['a', 'b', 'c'];
    w.removeBreakdown(1);
    expect(w.breakdowns).toEqual(['a', 'c']);
  });

  it('moveBreakdown reorders correctly', () => {
    const w = new Widget();
    w.breakdowns = ['a', 'b', 'c'];
    w.moveBreakdown(0, 2);
    expect(w.breakdowns).toEqual(['b', 'c', 'a']);
  });
});

describe('InsightIssue', () => {
  it('rounds value and oldValue', () => {
    const issue = new InsightIssue('errors', 'test', 0.5, 10.7, 20.3, 5);
    expect(issue.value).toBe(20);
    expect(issue.oldValue).toBe(11);
  });

  it('sets isIncreased correctly', () => {
    const increased = new InsightIssue('errors', 'up', 0.5, 0, 10, 5);
    expect(increased.isIncreased).toBe(true);

    const decreased = new InsightIssue('errors', 'down', 0.5, 10, 5, -3);
    expect(decreased.isIncreased).toBe(false);
  });

  it('sets icon from category', () => {
    const issue = new InsightIssue('memory', 'leak', 0.1, 0, 0, 0);
    expect(issue.icon).toBe('ic-memory');
  });
});
