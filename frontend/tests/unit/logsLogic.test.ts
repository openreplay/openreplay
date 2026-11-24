import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import {
  drillCards,
  keepsValue,
  levelOfText,
  logFilter,
  rulesToFilter,
  sameRules,
  windowBounds,
} from '../../app/components/Observability/logs-logic';
import OtelLogsStore from '../../app/mstore/otelLogsStore';
import { otelLogsService } from '../../app/services';

jest.mock('App/services', () => ({
  otelLogsService: {
    search: jest.fn(),
    histogram: jest.fn(),
    facets: jest.fn(),
    facetValues: jest.fn(),
  },
  ingestKeysService: {},
}));
jest.mock('@/ui/layout/rows-per-page', () => ({ getRowsPerPage: () => 50 }));

const svc = otelLogsService as unknown as Record<string, jest.Mock<any>>;

describe('rulesToFilter', () => {
  test('maps each key to its part of the API filter', () => {
    const parts = rulesToFilter([
      { name: 'message', operator: 'contains', value: ['payment', 'timeout'] },
      { name: 'level', operator: 'is', value: ['ERROR', 'warn'] },
      { name: 'service', operator: 'is', value: ['checkout-api'] },
      { name: 'service', operator: 'isNot', value: ['web'] },
      { name: 'attr.http.route', operator: 'contains', value: ['/pay'] },
      { name: 'res.k8s.pod.name', operator: 'isAny', value: [] },
      { name: 'attr.user.id', operator: 'is', value: [] },
      { name: 'attr.openreplay.session.id', operator: 'is', value: ['1'] },
    ]);
    expect(parts).toEqual({
      query: 'payment timeout',
      services: ['checkout-api'],
      severities: ['error', 'warn'],
      attributes: [
        {
          scope: 'resource',
          key: 'service.name',
          op: 'isNot',
          values: ['web'],
        },
        { scope: 'log', key: 'http.route', op: 'contains', values: ['/pay'] },
        { scope: 'resource', key: 'k8s.pod.name', op: 'exists', values: [] },
      ],
    });
  });

  test('caps attributes at the API limit', () => {
    const rules = Array.from({ length: 25 }, (_, i) => ({
      name: `attr.k${i}`,
      operator: 'is',
      value: ['v'],
    }));
    expect(rulesToFilter(rules).attributes).toHaveLength(20);
  });
});

describe('keepsValue', () => {
  const keeps = (key: string, rules: Parameters<typeof keepsValue>[1]) => {
    const f = keepsValue(key, rules);
    return f && ['a', 'b', 'c', 'A'].filter(f);
  };

  test('no rule on the key keeps every value', () => {
    expect(keeps('attr.x', [])).toEqual(['a', 'b', 'c', 'A']);
    expect(
      keeps('attr.x', [{ name: 'attr.y', operator: 'is', value: ['a'] }]),
    ).toEqual(['a', 'b', 'c', 'A']);
  });

  test('is keeps its values, isNot drops its own, matched exactly', () => {
    expect(
      keeps('attr.x', [{ name: 'attr.x', operator: 'is', value: ['a', 'b'] }]),
    ).toEqual(['a', 'b']);
    expect(
      keeps('attr.x', [{ name: 'attr.x', operator: 'isNot', value: ['a'] }]),
    ).toEqual(['b', 'c', 'A']);
  });

  test('service is-rules add up, attribute is-rules all apply', () => {
    const two = (name: string) => [
      { name, operator: 'is', value: ['a'] },
      { name, operator: 'is', value: ['b'] },
    ];
    expect(keeps('service', two('service'))).toEqual(['a', 'b']);
    expect(keeps('attr.x', two('attr.x'))).toEqual([]);
  });

  test('levels match whatever their case', () => {
    expect(
      keeps('level', [{ name: 'level', operator: 'is', value: ['a'] }]),
    ).toEqual(['a', 'A']);
  });

  test('exists keeps everything, contains cannot be replayed', () => {
    expect(
      keeps('attr.x', [{ name: 'attr.x', operator: 'isAny', value: [] }]),
    ).toEqual(['a', 'b', 'c', 'A']);
    expect(
      keepsValue('attr.x', [
        { name: 'attr.x', operator: 'contains', value: ['a'] },
      ]),
    ).toBeNull();
  });

  test('an empty rule counts for nothing', () => {
    expect(
      keeps('attr.x', [{ name: 'attr.x', operator: 'is', value: [' '] }]),
    ).toEqual(['a', 'b', 'c', 'A']);
  });
});

test('sameRules ignores order, and case only for levels', () => {
  expect(
    sameRules(
      [{ name: 'level', operator: 'is', value: ['Error', 'warn'] }],
      [{ name: 'level', operator: 'is', value: ['WARN', 'error'] }],
    ),
  ).toBe(true);
  expect(
    sameRules(
      [{ name: 'service', operator: 'is', value: ['API'] }],
      [{ name: 'service', operator: 'is', value: ['api'] }],
    ),
  ).toBe(false);
  expect(
    sameRules(
      [{ name: 'level', operator: 'is', value: ['error'] }],
      [{ name: 'level', operator: 'isNot', value: ['error'] }],
    ),
  ).toBe(false);
});

test('levelOfText folds severities into four', () => {
  expect(
    ['FATAL', 'Error', 'WARNING', 'info', 'TRACE', 'notice'].map(levelOfText),
  ).toEqual(['error', 'error', 'warn', 'info', 'debug', 'info']);
});

test('windowBounds anchors a preset at now', () => {
  expect(windowBounds({ preset: 'LOGS_15M' }, 1_000_000)).toEqual({
    from: 100_000,
    to: 1_000_000,
  });
});

test('drillCards: service and level first, internal keys out, by presence', () => {
  const cards = drillCards(
    {
      services: [],
      severities: [],
      attributeKeys: {
        log: [
          { key: 'http.route', count: 40 },
          { key: 'openreplay.session.id', count: 90 },
          { key: 'exception.stacktrace', count: 5 },
        ],
        resource: [
          { key: 'service.name', count: 100 },
          { key: 'k8s.pod.name', count: 100 },
        ],
      },
      sampled: false,
    },
    100,
  );
  expect(cards.map((c) => c.key)).toEqual([
    'res.k8s.pod.name',
    'service',
    'level',
    'attr.http.route',
  ]);
});

describe('OtelLogsStore page model', () => {
  let store: OtelLogsStore;
  beforeEach(() => {
    store = new OtelLogsStore();
    store.labelOf = (k) => k;
  });

  test('rail ticks write one `is` rule per key and drop it when empty', () => {
    store.toggleValue('service', 'web');
    store.toggleValue('service', 'auth');
    expect(store.ruleList).toEqual([
      { name: 'service', operator: 'is', value: ['web', 'auth'] },
    ]);
    expect(store.restCollapsed).toBe(true);
    store.toggleValue('service', 'web');
    store.toggleValue('service', 'auth');
    expect(store.ruleList).toEqual([]);
  });

  test('Filter by and Exclude of one value exclude each other', () => {
    store.setTerm('attr.http.route', '/pay', 'is', true);
    store.setTerm('attr.http.route', '/pay', 'isNot', true);
    expect(store.ruleList).toEqual([
      { name: 'attr.http.route', operator: 'isNot', value: ['/pay'] },
    ]);
    expect(store.termState('attr.http.route', '/pay')).toBe('out');
  });

  test('run sends the rules and fetches the first page', async () => {
    svc.search.mockResolvedValue({ logs: [], nextCursor: null });
    svc.histogram.mockResolvedValue({ step: 60, buckets: [] });
    svc.facets.mockResolvedValue({
      services: [],
      severities: [],
      attributeKeys: { log: [], resource: [] },
      sampled: false,
    });
    store.setRules([{ ...logFilter('level', 'Level'), value: ['error'] }]);
    await store.run(10_000_000);
    const body = svc.search.mock.calls[0][0] as any;
    expect(body.severities).toEqual(['error']);
    expect(body.endTime - body.startTime).toBe(60 * 60_000);
  });

  test('total is the histogram sum until the last page is in', async () => {
    const logs = Array.from({ length: 10 }, (_, i) => ({ id: `l${i}` }));
    svc.search.mockResolvedValueOnce({ logs, nextCursor: 'c' });
    svc.histogram.mockResolvedValue({
      step: 60,
      buckets: [
        { time: 0, total: 30, bySeverity: {} },
        { time: 60, total: 12, bySeverity: {} },
      ],
    });
    svc.facets.mockResolvedValue(null);
    await store.run();
    expect(store.total).toBe(42);
    svc.search.mockResolvedValueOnce({ logs, nextCursor: null });
    await store.ensure(20);
    expect(store.total).toBe(20);
  });

  test('views keep their rules per person and project', () => {
    store.loadViews(1, '7');
    store.toggleValue('service', 'web');
    store.saveView('Web');
    expect(store.view?.name).toBe('Web');
    expect(store.viewEdited).toBe(false);
    store.toggleValue('service', 'auth');
    expect(store.viewEdited).toBe(true);

    const other = new OtelLogsStore();
    other.loadViews(1, '7');
    expect(other.views.map((v) => v.name)).toEqual(['Web']);
    other.applyView(other.views[0].id);
    expect(other.ruleList).toEqual([
      { name: 'service', operator: 'is', value: ['web'] },
    ]);
  });
});
