import { describe, expect, jest, test } from '@jest/globals';

import {
  keyLabel,
  lineFields,
  sessionOf,
  valueOfLog,
} from '../../app/components/Observability/logs-logic';
import OtelLogsStore from '../../app/mstore/otelLogsStore';
import { otelLogsService } from '../../app/services';
import type { OtelLog } from '../../app/services/OtelLogsService';

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

const line = (
  id: string,
  logAttributes: Record<string, string> = {},
): OtelLog => ({
  id,
  timestamp: '1700000000000000000',
  severityText: 'ERROR',
  severityNumber: 17,
  serviceName: 'checkout-api',
  body: 'payment provider timed out',
  traceId: '',
  spanId: '',
  logAttributes,
  resourceAttributes: { 'service.name': 'checkout-api' },
  scopeName: '',
  scopeAttributes: {},
});

const withSession = line('l1', {
  'openreplay.session.id': '7712093846571234',
  'openreplay.other': 'x',
  'http.route': '/pay',
});

describe('a line written in a session', () => {
  test('sessionOf reads openreplay.session.id', () => {
    expect(sessionOf(withSession)).toBe('7712093846571234');
    expect(sessionOf(line('l2'))).toBeUndefined();
    expect(sessionOf(line('l3', { 'openreplay.session.id': '' }))).toBe(
      undefined,
    );
  });

  test('the Session column reads it', () => {
    const t = ((k: string) => k) as any;
    expect(keyLabel(t, 'session')).toBe('Session');
    expect(valueOfLog(withSession, 'session')).toBe('7712093846571234');
    expect(valueOfLog(line('l2'), 'session')).toBeUndefined();
  });

  test('the session id is not an attribute row; other internal keys stay unfilterable', () => {
    const rows = lineFields(withSession).log;
    expect(rows.map((r) => r.name)).toEqual(['http.route', 'openreplay.other']);
    expect(rows.find((r) => r.name === 'openreplay.other')?.key).toBeNull();
  });
});

describe('the way back from the replay', () => {
  const answer = (logs: OtelLog[]) => {
    svc.search.mockResolvedValueOnce({ logs, nextCursor: null });
    svc.histogram.mockResolvedValue({ step: 60, buckets: [] });
    svc.facets.mockResolvedValue(null);
  };

  test('a kept line stays open once a refetch drops it from the list', async () => {
    const store = new OtelLogsStore();
    answer([withSession]);
    await store.run();

    store.openLog(withSession);
    answer([]);
    await store.run();
    expect(store.openLine).toBeNull();

    answer([withSession]);
    await store.run();
    store.openLog(withSession, true);
    answer([]);
    await store.run();
    expect(store.openLine?.id).toBe('l1');
  });
});
