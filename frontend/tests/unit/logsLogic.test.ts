import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { Settings } from 'luxon';

import {
  NO_SERVICE,
  bodyOf,
  clockLabel,
  describeText,
  drillCards,
  exportFileName,
  exportLines,
  facetChoices,
  isFacetKey,
  keepsValue,
  levelOf,
  levelOfText,
  lineFields,
  lineHeadFacts,
  lineStamp,
  lineText,
  logFilter,
  logZone,
  readBody,
  rulesToFilter,
  sameLogDay,
  sameRules,
  textSearchLimit,
  textTerms,
  valueLabel,
  windowBounds,
} from '../../app/components/Observability/logs-logic';
import {
  ruleParts,
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

describe('the message search', () => {
  const t = ((k: string) => k) as any;
  const message = (...value: string[]) => ({
    name: 'message',
    operator: 'contains',
    value,
  });

  test('quotes make a phrase, a lone quote is a character', () => {
    expect(textTerms('payment  "gateway timeout" x')).toEqual([
      { text: 'payment', phrase: false },
      { text: 'gateway timeout', phrase: true },
      { text: 'x', phrase: false },
    ]);
    expect(textTerms('pay"ment ""')).toEqual([
      { text: 'pay"ment', phrase: false },
    ]);
  });

  test('every word of every search is sent, a phrase as its words', () => {
    expect(
      rulesToFilter([
        message('loaded cart'),
        message('"gateway timeout"', 'refund'),
      ]).query,
    ).toBe('loaded cart gateway timeout refund');
  });

  test('the chip says what the API matches', () => {
    expect(describeText(t, ['payment failed'])).toBe('payment and failed');
    expect(describeText(t, ['"gateway timeout"'])).toBe('gateway and timeout');
    expect(describeText(t, ['payment', 'refund'])).toBe('payment and refund');
    const rule = viewOf(
      { ...logFilter('message', 'Message'), value: ['payment failed'] },
      '0',
    );
    expect(valueText(t, rule)).toBe('payment and failed');
    expect(ruleParts(t, rule)).toEqual({
      name: 'Message',
      rest: 'contains payment and failed',
    });
  });

  test('limits are the API query length, in bytes, and its filter count', () => {
    expect(textSearchLimit([], 'payment')).toBeNull();
    expect(textSearchLimit([message('a'.repeat(495))], 'b'.repeat(4))).toBe(
      null,
    );
    expect(textSearchLimit([message('a'.repeat(495))], 'b'.repeat(5))).toBe(
      'length',
    );
    expect(textSearchLimit([], 'ж'.repeat(251))).toBe('length');
    const twenty = Array.from({ length: 20 }, () => message('x'));
    expect(textSearchLimit(twenty, 'y')).toBe('rules');
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

describe('the Logs clock', () => {
  // 2023-11-14T22:13:20.123Z
  const at = 1700000000123;
  let locale: string;
  beforeAll(() => {
    locale = Settings.defaultLocale;
    Settings.defaultLocale = 'en-US';
  });
  afterAll(() => {
    Settings.defaultLocale = locale;
  });

  test('reads the Preferences zone, the computer for the end user', () => {
    expect(
      logZone({ shownTimezone: 'local', timezone: { value: 'UTC+05:30' } }),
    ).toBe('UTC+05:30');
    expect(
      logZone({ shownTimezone: 'user', timezone: { value: 'UTC+05:30' } }),
    ).toBe('local');
    expect(logZone({ shownTimezone: 'local', timezone: null })).toBe('local');
  });

  test('stamps a line on that zone', () => {
    expect(lineStamp(at, false, 'America/Sao_Paulo')).toBe('19:13:20.123');
    expect(lineStamp(at, false, 'UTC-03')).toBe('19:13:20.123');
    expect(lineStamp(at, true, 'Asia/Kolkata')).toBe('Nov 15 03:43:20.123');
    expect(lineStamp(at, true, 'UTC+05:30')).toBe('Nov 15 03:43:20.123');
  });

  test('labels the chart and the window on that zone', () => {
    expect(clockLabel(at, false, 'America/Sao_Paulo')).toBe('19:13');
    expect(clockLabel(at, true, 'Asia/Kolkata', true)).toBe('Nov 15, 03:43:20');
    const nov9 = Date.UTC(2026, 10, 9, 3);
    expect(clockLabel(nov9, true, 'UTC-03')).toBe('Nov 9, 00:00');
    expect(clockLabel(nov9, true, 'UTC')).toBe('Nov 9, 03:00');
  });

  test("a day is that zone's day", () => {
    const a = Date.UTC(2023, 10, 14, 23);
    const b = Date.UTC(2023, 10, 15, 1);
    expect(sameLogDay(a, b, 'UTC')).toBe(false);
    expect(sameLogDay(a, b, 'America/Sao_Paulo')).toBe(true);
    expect(sameLogDay(a, b, 'Asia/Kolkata')).toBe(true);
    expect(sameLogDay(Date.UTC(2023, 10, 14, 18), a, 'Asia/Kolkata')).toBe(
      false,
    );
  });

  test('names the export file on that zone', () => {
    expect(exportFileName(at, at + 3_600_000, 'csv', 'UTC-03')).toBe(
      'logs_2023-11-14_1913_to_2023-11-14_2013.csv',
    );
    expect(exportFileName(at, at, 'json', 'Asia/Kolkata')).toBe(
      'logs_2023-11-15_0343_to_2023-11-15_0343.ndjson',
    );
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
      'timestamp_utc,Level,Pod,Route,Message',
      "2023-11-14T22:13:20.123Z,Warning,api-1,/a,'=cmd|calc",
      '2023-11-14T22:13:20.123Z,Info,api-1,,"ok, done"',
    ]);
  });

  test('JSON keeps the raw fields', () => {
    const [row] = exportLines(t, [l('=x', 'WARN', {})], 'json', [
      'level',
    ]).split('\n');
    expect(JSON.parse(row)).toMatchObject({
      timestamp_utc: '2023-11-14T22:13:20.123Z',
      Body: '=x',
      SeverityText: 'WARN',
    });
  });
});

describe('JSON bodies', () => {
  const line = (body: string, severityText = '', severityNumber = 0) =>
    ({
      id: body,
      timestamp: '1700000000123456789',
      severityText,
      severityNumber,
      serviceName: 'api',
      body,
      logAttributes: {},
      resourceAttributes: {},
    }) as any;

  test('a JSON body with msg or message reads as its sentence', () => {
    expect(
      readBody(
        '{"level": "info", "msg": "job completed in 2851ms", "duration_ms": 2851}',
      ),
    ).toEqual({
      text: 'job completed in 2851ms',
      rest: 'duration_ms=2851',
      json: {
        level: 'info',
        msg: 'job completed in 2851ms',
        duration_ms: 2851,
      },
      level: 'info',
    });
    const b = readBody(
      '  {"time":1,"message":"paid","order":"o_1","ok":true,"user":{"id":7},"tags":null}',
    );
    expect(b?.text).toBe('paid');
    expect(b?.rest).toBe('order=o_1 ok=true user={"id":7} tags=null');
    expect(b?.level).toBeUndefined();
    expect(readBody('{"msg":"a","message":"b"}')?.text).toBe('a');
  });

  test('any other body reads as written', () => {
    for (const body of [
      'plain text',
      '',
      '{"level":"info","event":"started"}',
      '{"msg": 42}',
      '{"msg": "cut',
      '["msg"]',
      'msg {"msg":"x"}',
      '{"error":{"message":"nested"}}',
    ])
      expect(readBody(body)).toBeNull();
    expect(lineText(line('plain text'))).toBe('plain text');
    expect(lineText(line('{"msg":"hi","a":1}'))).toBe('hi');
  });

  test('the body level fills an empty severity only', () => {
    expect(levelOf(line('{"level":"warning","msg":"x"}'))).toBe('warn');
    expect(levelOf(line('{"level":"ERROR","msg":"x"}'))).toBe('error');
    expect(levelOf(line('{"level":"warn","msg":"x"}', 'INFO'))).toBe('info');
    expect(levelOf(line('{"level":"error","msg":"x"}', '', 9))).toBe('info');
    expect(levelOf(line('{"level":30,"msg":"x"}'))).toBe('info');
    expect(levelOf(line('{"level":"error"}'))).toBe('info');
  });

  test('a line is parsed once', () => {
    const l = line('{"msg":"once"}');
    const parse = jest.spyOn(JSON, 'parse');
    expect(bodyOf(l)).toBe(bodyOf(l));
    levelOf(l);
    lineText(l);
    expect(parse).toHaveBeenCalledTimes(1);
    parse.mockRestore();
  });

  test('exports read the sentence, JSON keeps the body parsed', () => {
    const t = ((k: string) => k) as any;
    const lines = [line('{"level":"info","msg":"paid, ok","n":2}'), line('x')];
    expect(exportLines(t, lines, 'csv', []).split('\n')).toEqual([
      'timestamp_utc,Message',
      '2023-11-14T22:13:20.123Z,"paid, ok"',
      '2023-11-14T22:13:20.123Z,x',
    ]);
    const [a, b] = exportLines(t, lines, 'json', [])
      .split('\n')
      .map((r) => JSON.parse(r));
    expect(a).toMatchObject({
      Body: '{"level":"info","msg":"paid, ok","n":2}',
      body: { level: 'info', msg: 'paid, ok', n: 2 },
    });
    expect(b.Body).toBe('x');
    expect('body' in b).toBe(false);
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

  test('each typed search is a message rule of its own', () => {
    store.searchText('  payment ');
    store.searchText('"gateway timeout"');
    expect(store.ruleList).toEqual([
      { name: 'message', operator: 'contains', value: ['payment'] },
      { name: 'message', operator: 'contains', value: ['"gateway timeout"'] },
    ]);
    expect(store.restCollapsed).toBe(false);
    store.searchText('x'.repeat(600));
    store.searchText('   ');
    expect(store.ruleList).toHaveLength(2);
  });

  test('a damaged views value loads as no views', () => {
    localStorage.setItem('__or_logs_views:2:7', '{"id":"v1"}');
    store.loadViews(2, '7');
    expect(store.views).toEqual([]);
    expect(store.view).toBeNull();
  });
});
