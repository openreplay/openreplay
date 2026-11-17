import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import OtelLogsStore from '../../app/mstore/otelLogsStore';
import { otelSeverityLevel } from '../../app/services/OtelLogsService';

const mockSearch = jest.fn<any>();
const mockHistogram = jest.fn<any>();
const mockFacets = jest.fn<any>();
const mockCreateKey = jest.fn<any>();

jest.mock('../../app/services', () => ({
  otelLogsService: {
    search: (...args: any[]) => mockSearch(...args),
    histogram: (...args: any[]) => mockHistogram(...args),
    facets: (...args: any[]) => mockFacets(...args),
  },
  ingestKeysService: {
    create: (...args: any[]) => mockCreateKey(...args),
  },
}));

const log = (body: string) => ({ body, timestamp: 1, severityNumber: 9 });

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('OtelLogsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHistogram.mockResolvedValue({ step: 60, buckets: [] });
    mockFacets.mockResolvedValue({ services: [], severities: [] });
  });

  it('anchors relative ranges to now and pages with the applied filter', async () => {
    const store = new OtelLogsStore();
    store.setRange({ durationMs: 60_000 });
    store.setSeverities(['error']);
    mockSearch.mockResolvedValueOnce({ logs: [log('a')], nextCursor: 'c1' });

    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    await store.fetch();
    now.mockReturnValue(5_000_000);

    expect(mockSearch.mock.calls[0][0]).toMatchObject({
      startTime: 940_000,
      endTime: 1_000_000,
      severities: ['error'],
      limit: 100,
    });
    expect(store.logs).toHaveLength(1);

    store.setSeverities(['info']);
    mockSearch.mockResolvedValueOnce({ logs: [log('b')], nextCursor: null });
    await store.loadMore();

    expect(mockSearch.mock.calls[1][0]).toMatchObject({
      startTime: 940_000,
      endTime: 1_000_000,
      severities: ['error'],
      cursor: 'c1',
    });
    expect(store.logs.map((l) => l.body)).toEqual(['a', 'b']);
    expect(store.nextCursor).toBeNull();
    now.mockRestore();
  });

  it('drops results of a superseded fetch', async () => {
    const store = new OtelLogsStore();
    const first = deferred<any>();
    mockSearch.mockReturnValueOnce(first.promise);
    mockSearch.mockResolvedValueOnce({ logs: [log('new')], nextCursor: null });

    const p1 = store.fetch();
    const firstSignal = mockSearch.mock.calls[0][1] as AbortSignal;
    await store.fetch();
    first.resolve({ logs: [log('old')], nextCursor: 'x' });
    await p1;

    expect(firstSignal.aborted).toBe(true);
    expect(store.logs.map((l) => l.body)).toEqual(['new']);
    expect(store.nextCursor).toBeNull();
    expect(store.loading).toBe(false);
  });

  it('surfaces API errors but not aborts', async () => {
    const store = new OtelLogsStore();
    mockSearch.mockRejectedValueOnce(new Error('query timed out'));
    await store.fetch();
    expect(store.error).toBe('query timed out');

    const abort = new Error('aborted');
    abort.name = 'AbortError';
    mockSearch.mockRejectedValueOnce(abort);
    await store.fetch();
    expect(store.error).toBeNull();
  });

  it('keeps the created key secret out of the stored list', async () => {
    const store = new OtelLogsStore();
    mockCreateKey.mockResolvedValueOnce({
      keyId: 3,
      key: 'secret',
      prefix: 'secretpr',
    });
    const created = await store.createIngestKey('  backend  ');

    expect(mockCreateKey).toHaveBeenCalledWith('backend');
    expect(created.key).toBe('secret');
    expect(store.ingestKeys[0].key).toBeUndefined();
  });
});

describe('otelSeverityLevel', () => {
  it.each([
    [0, 'unspecified'],
    [1, 'trace'],
    [8, 'debug'],
    [9, 'info'],
    [13, 'warn'],
    [17, 'error'],
    [24, 'fatal'],
  ])('%i -> %s', (n, level) => {
    expect(otelSeverityLevel(n)).toBe(level);
  });
});
