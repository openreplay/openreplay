import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import {
  NO_SERVICE,
  drillCards,
  exportLines,
  facetChoices,
  isFacetKey,
  keepsValue,
  levelOfText,
  lineFields,
  lineHeadFacts,
  logFilter,
  rulesToFilter,
  sameRules,
  valueLabel,
  windowBounds,
} from '../../app/components/Observability/logs-logic';
import {
  valueText,
  viewOf,
} from '../../app/components/shared/FilterEditor/catalogue';
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

  test('the empty service is sent as the API names it', () => {
    expect(
      rulesToFilter([
        { name: 'service', operator: 'is', value: [NO_SERVICE, 'web'] },
        { name: 'service', operator: 'isNot', value: [NO_SERVICE] },
        { name: 'service', operator: 'contains', value: [NO_SERVICE] },
      ]),
    ).toEqual({
      query: '',
      services: ['', 'web'],
      severities: [],
      attributes: [
        { scope: 'resource', key: 'service.name', op: 'isNot', values: [''] },
        { scope: 'resource', key: 'service.name', op: 'exists', values: [] },
        {
          scope: 'resource',
          key: 'service.name',
          op: 'contains',
          values: [NO_SERVICE],
        },
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

  test('the empty service is a value like any other', () => {
    const f = keepsValue('service', [
      { name: 'service', operator: 'is', value: [NO_SERVICE] },
    ]);
    expect(['web', NO_SERVICE].filter(f!)).toEqual([NO_SERVICE]);
  });
});

describe('the empty service', () => {
  const t = ((k: string) => (k === '(no service)' ? 'none' : k)) as any;

  test('reads as "(no service)" in cells and chips', () => {
    expect(valueLabel(t, 'service', '')).toBe('none');
    expect(valueLabel(t, 'service', NO_SERVICE)).toBe('none');
    expect(valueLabel(t, 'service', 'web')).toBe('web');
    expect(valueLabel(t, 'attr.x', '')).toBe('');
    const rule = {
      ...logFilter('service', 'Service'),
      value: [NO_SERVICE, 'web'],
    };
    expect(valueText(t, viewOf(rule, '0'))).toBe('none, web');
  });

  test('the drawer offers it to filter by', () => {
    const line = (serviceName: string, res: Record<string, string>) =>
      ({ serviceName, logAttributes: {}, resourceAttributes: res }) as any;
    const service = (l: any) =>
      lineFields(l).resource.filter((f) => f.key === 'service');
    expect(service(line('', { 'host.name': 'h' }))).toEqual([
      {
        name: 'service.name',
        value: NO_SERVICE,
        key: 'service',
        multiline: false,
      },
    ]);
    expect(service(line('', { 'service.name': '' }))[0].value).toBe(NO_SERVICE);
    expect(service(line('web', { 'service.name': 'web' }))[0].value).toBe(
      'web',
    );
    expect(service(line('web', {}))).toEqual([]);
  });
});

describe('facet keys', () => {
  test('ids, the message and the level are never facets', () => {
    expect(
      [
        'request.id',
        'trace_id',
        'requestId',
        'traceID',
        'http.request.header.x-request-id',
        'user.id',
        'id',
        'msg',
        'level',
        'severity',
        'exception.stacktrace',
        'openreplay.session.id',
      ].filter(isFacetKey),
    ).toEqual([]);
    expect(
      [
        'http.route',
        'http.response.status_code',
        'deployment.environment.name',
        'paid',
        'valid',
        'message.kind',
        'log.level',
      ].filter(isFacetKey),
    ).toEqual([
      'http.route',
      'http.response.status_code',
      'deployment.environment.name',
      'paid',
      'valid',
      'message.kind',
      'log.level',
    ]);
  });

  test('Choose facets offers the service, then the keys that make one', () => {
    const t = ((k: string) => k) as any;
    expect(
      facetChoices(t, {
        services: [],
        severities: [],
        attributeKeys: {
          log: [
            { key: 'request.id', count: 9 },
            { key: 'msg', count: 9 },
            { key: 'http.route', count: 9 },
          ],
          resource: [
            { key: 'service.name', count: 9 },
            { key: 'service.instance.id', count: 9 },
            { key: 'k8s.pod.name', count: 9 },
          ],
        },
        sampled: false,
      }),
    ).toEqual([
      { key: 'service', label: 'Service' },
      { key: 'res.k8s.pod.name', label: 'Pod' },
      { key: 'attr.http.route', label: 'Route' },
    ]);
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

test('drillCards: service and level first, non-facet keys out, by presence', () => {
  const cards = drillCards(
    {
      services: [],
      severities: [],
      attributeKeys: {
        log: [
          { key: 'http.route', count: 40 },
          { key: 'openreplay.session.id', count: 90 },
          { key: 'exception.stacktrace', count: 5 },
          { key: 'request.id', count: 100 },
          { key: 'msg', count: 100 },
          { key: 'level', count: 100 },
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

describe('lineHeadFacts', () => {
  const t = ((k: string) => k) as any;
  const line = (
    logAttributes: Record<string, string>,
    resourceAttributes: Record<string, string> = {},
  ) =>
    ({
      id: '1',
      timestamp: '0',
      severityText: 'INFO',
      severityNumber: 9,
      serviceName: 'api',
      body: '',
      traceId: '',
      spanId: '',
      logAttributes,
      resourceAttributes,
      scopeName: '',
      scopeAttributes: {},
    }) as any;
  const cells = (l: any) =>
    lineHeadFacts(t, l)
      .flat()
      .map((f) => (f.empty ? '-' : `${f.value}${f.tone ? `:${f.tone}` : ''}`));

  test('semconv on a kubernetes line', () => {
    expect(
      cells(
        line(
          {
            'http.request.method': 'GET',
            'http.route': '/users/:id',
            'http.response.status_code': '503',
            duration_ms: '1500',
          },
          {
            'k8s.pod.name': 'api-1',
            'deployment.environment.name': 'prod',
            'k8s.namespace.name': 'shop',
          },
        ),
      ),
    ).toEqual([
      'api-1',
      'prod',
      'shop',
      'GET /users/:id',
      '503:danger',
      '1.5 s:warning',
    ]);
  });

  test('pre-1.21 semconv', () => {
    expect(
      cells(
        line({
          'http.method': 'POST',
          'http.target': '/cart?x=1',
          'http.status_code': '404',
        }),
      ),
    ).toEqual(['-', '-', '-', 'POST /cart?x=1', '404:warning', '-']);
  });

  test('pino-http and express-winston bodies', () => {
    expect(
      cells(
        line({
          'req.method': 'GET',
          'req.url': '/a',
          'res.statusCode': '200',
          responseTime: '12',
        }),
      ).slice(3),
    ).toEqual(['GET /a', '200', '12 ms']);
    expect(
      cells(
        line({
          'meta.req.method': 'PUT',
          'meta.req.url': '/b',
          'meta.res.statusCode': '500',
          'meta.responseTime': '15000',
        }),
      ).slice(3),
    ).toEqual(['PUT /b', '500:danger', '15 s:warning']);
  });

  test('a line with nothing keeps every cell', () => {
    expect(cells(line({}))).toEqual(['-', '-', '-', '-', '-', '-']);
  });

  test('each fact filters by the key its value came from', () => {
    const keys = (l: any) =>
      lineHeadFacts(t, l)
        .flat()
        .map((f) => f.key ?? null);
    expect(
      keys(
        line(
          {
            'http.request.method': 'GET',
            'http.route': '/users/:id',
            'http.response.status_code': '503',
            duration_ms: '1500',
          },
          {
            'k8s.pod.name': 'api-1',
            'deployment.environment.name': 'prod',
            'k8s.namespace.name': 'shop',
          },
        ),
      ),
    ).toEqual([
      'res.k8s.pod.name',
      'res.deployment.environment.name',
      'res.k8s.namespace.name',
      'attr.http.route',
      'attr.http.response.status_code',
      null,
    ]);
    expect(
      keys(
        line(
          { 'http.method': 'POST', 'req.url': '/a', 'res.statusCode': '200' },
          { 'deployment.environment': 'staging' },
        ),
      ),
    ).toEqual([
      null,
      'res.deployment.environment',
      null,
      'attr.req.url',
      'attr.res.statusCode',
      null,
    ]);
  });
});

describe('exportLines', () => {
  const t = ((k: string) => k) as any;
  const l = (body: string, level: string, attrs: Record<string, string>) =>
    ({
      id: body,
      timestamp: '1700000000123456789',
      severityText: level,
      severityNumber: 0,
      serviceName: 'api',
      body,
      logAttributes: attrs,
      resourceAttributes: { 'k8s.pod.name': 'api-1' },
    }) as any;

  test('CSV reads as the table: its names, its levels, no formulas', () => {
    const csv = exportLines(
      t,
      [
        l('=cmd|calc', 'WARN', { 'http.route': '/a' }),
        l('ok, done', 'info', {}),
      ],
      'csv',
      ['level', 'res.k8s.pod.name', 'attr.http.route'],
    );
    expect(csv.split('\n')).toEqual([
      'Time,Level,Pod,Route,Message',
      "2023-11-14T22:13:20.123Z,Warning,api-1,/a,'=cmd|calc",
      '2023-11-14T22:13:20.123Z,Info,api-1,,"ok, done"',
    ]);
  });

  test('JSON keeps the raw fields', () => {
    const [row] = exportLines(t, [l('=x', 'WARN', {})], 'json', [
      'level',
    ]).split('\n');
    expect(JSON.parse(row)).toMatchObject({
      Body: '=x',
      SeverityText: 'WARN',
    });
  });
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

  test('the empty service ticks on the rail and narrows the list', async () => {
    svc.search.mockClear();
    svc.search.mockResolvedValue({ logs: [], nextCursor: null });
    svc.histogram.mockResolvedValue({ step: 60, buckets: [] });
    svc.facets.mockResolvedValue({
      services: [
        { value: 'web', count: 3 },
        { value: '', count: 2 },
      ],
      severities: [],
      attributeKeys: { log: [], resource: [] },
      sampled: false,
    });
    await store.run();
    const { values } = store.facetValuesOf('service');
    expect(values.map((v) => v.value)).toEqual(['web', NO_SERVICE]);
    store.toggleValue('service', values[1].value);
    expect(store.valuesOn('service')).toEqual([NO_SERVICE]);
    await store.run();
    expect((svc.search.mock.lastCall![0] as any).services).toEqual(['']);
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

  test('a damaged views value loads as no views', () => {
    localStorage.setItem('__or_logs_views:2:7', '{"id":"v1"}');
    store.loadViews(2, '7');
    expect(store.views).toEqual([]);
    expect(store.view).toBeNull();
  });
});
