import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { SearchChangedError } from '../../app/components/Observability/logs-logic';
import OtelLogsStore from '../../app/mstore/otelLogsStore';
import {
  otelLogTimeMs,
  otelSeverityLevel,
} from '../../app/services/OtelLogsService';

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

const log = (body: string) => ({
  id: body,
  body,
  timestamp: '1700000000123456789',
  severityNumber: 9,
});

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

  it('an export after a failed page asks for it again', async () => {
    const store = new OtelLogsStore();
    mockSearch.mockResolvedValueOnce({ logs: [log('a')], nextCursor: 'c1' });
    await store.fetch();

    mockSearch.mockRejectedValueOnce(new Error('boom'));
    await expect(store.collectExport()).rejects.toThrow('boom');
    expect(store.pageError).toBe('boom');

    mockSearch.mockRejectedValueOnce(new Error('again'));
    await expect(store.collectExport()).rejects.toThrow('again');

    mockSearch.mockResolvedValueOnce({ logs: [log('b')], nextCursor: null });
    const lines = await store.collectExport();
    expect(lines.map((l) => l.body)).toEqual(['a', 'b']);
    // each try asked for the page that failed
    expect(
      mockSearch.mock.calls
        .slice(1)
        .map((c) => (c[0] as { cursor?: string }).cursor),
    ).toEqual(['c1', 'c1', 'c1']);
    expect(store.pageError).toBeNull();
    expect(store.exporting).toBe(false);
  });

  it('a failed refresh refuses to page or export what it held', async () => {
    const store = new OtelLogsStore();
    mockSearch.mockResolvedValueOnce({ logs: [log('a')], nextCursor: 'c1' });
    await store.fetch();

    mockSearch.mockRejectedValueOnce(new Error('refresh failed'));
    await store.fetch(true);
    expect(store.logs.map((l) => l.body)).toEqual(['a']);
    expect(store.listError).toBe('refresh failed');

    // the held cursor is from the window before: nothing asks with it
    await store.loadMore();
    await expect(store.collectExport()).rejects.toThrow('refresh failed');
    expect(mockSearch).toHaveBeenCalledTimes(2);
  });

  it('a failed histogram or facets request still pages and exports', async () => {
    const store = new OtelLogsStore();
    mockSearch.mockResolvedValueOnce({ logs: [log('a')], nextCursor: 'c1' });
    mockHistogram.mockRejectedValueOnce(new Error('histogram failed'));
    mockFacets.mockRejectedValueOnce(new Error('facets failed'));
    await store.fetch();
    expect(store.chartFailed).toBe(true);
    expect(store.facetsFailed).toBe(true);
    expect(store.searchFailed).toBe(false);
    // no count: the pager still reaches the next page
    expect(store.totalKnown).toBe(false);
    expect(store.pagerTotal).toBe(2);

    mockSearch.mockResolvedValueOnce({ logs: [log('b')], nextCursor: null });
    const lines = await store.collectExport();
    expect(lines.map((l) => l.body)).toEqual(['a', 'b']);
    expect(store.totalKnown).toBe(true);
  });

  it('each part reports its own failure', async () => {
    const store = new OtelLogsStore();
    mockHistogram.mockRejectedValueOnce(new Error('histogram failed'));
    const search = deferred<any>();
    mockSearch.mockReturnValueOnce(search.promise);
    const p = store.fetch();
    await Promise.resolve();
    search.resolve(Promise.reject(new Error('list failed')));
    await p;
    expect(store.searchFailed).toBe(true);
    expect(store.listError).toBe('list failed');
    expect(store.chartFailed).toBe(true);
    expect(store.facetsFailed).toBe(false);
  });

  it('a quiet refresh keeps a failed part until its own answer lands', async () => {
    const store = new OtelLogsStore();
    for (let i = 0; i < 4; i += 1)
      mockSearch.mockResolvedValueOnce({ logs: [log('a')], nextCursor: null });
    mockHistogram.mockRejectedValueOnce(new Error('histogram failed'));
    await store.fetch();
    expect(store.chartFailed).toBe(true);
    expect(store.histogram).toBeNull();

    const chart = deferred<any>();
    mockHistogram.mockReturnValueOnce(chart.promise);
    const p = store.fetch(true);
    // no flash of an empty chart while the tick is out
    expect(store.chartFailed).toBe(true);
    expect(store.histogramLoading).toBe(false);
    chart.resolve({ step: 60, buckets: [] });
    await p;
    expect(store.chartFailed).toBe(false);
    expect(store.histogram).toEqual({ step: 60, buckets: [] });

    mockHistogram.mockRejectedValueOnce(new Error('histogram failed'));
    await store.fetch(true);
    expect(store.chartFailed).toBe(true);
    // a search of its own starts every part afresh
    const again = deferred<any>();
    mockHistogram.mockReturnValueOnce(again.promise);
    const q = store.fetch();
    expect(store.chartFailed).toBe(false);
    expect(store.histogramLoading).toBe(true);
    again.resolve({ step: 60, buckets: [] });
    await q;
  });

  it('asks the chart or the facets again for the shown lines', async () => {
    const store = new OtelLogsStore();
    mockSearch.mockResolvedValueOnce({ logs: [log('a')], nextCursor: 'c1' });
    mockHistogram.mockRejectedValueOnce(new Error('histogram failed'));
    mockFacets.mockRejectedValueOnce(new Error('facets failed'));
    await store.fetch();
    const applied = store.appliedFilter;

    const chart = deferred<any>();
    mockHistogram.mockReturnValueOnce(chart.promise);
    store.retryPart('chart');
    expect(store.chartFailed).toBe(false);
    expect(store.histogramLoading).toBe(true);
    chart.resolve({ step: 60, buckets: [] });
    await new Promise((r) => setTimeout(r, 0));
    expect(store.histogramLoading).toBe(false);
    expect(store.histogram).toEqual({ step: 60, buckets: [] });
    expect(mockHistogram.mock.calls[1][0]).toBe(applied);

    mockFacets.mockRejectedValueOnce(new Error('facets failed'));
    store.retryPart('facets');
    expect(store.facetsLoading).toBe(true);
    await new Promise((r) => setTimeout(r, 0));
    expect(store.facetsFailed).toBe(true);
    expect(store.facetsLoading).toBe(false);
    // the lines were never touched
    expect(store.logs.map((l) => l.body)).toEqual(['a']);
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it('an empty window with no filters asks whether a line ever came', async () => {
    const store = new OtelLogsStore();
    const now = jest.spyOn(Date, 'now').mockReturnValue(40 * 86_400_000);
    mockSearch.mockResolvedValueOnce({ logs: [], nextCursor: null });
    const probe = deferred<any>();
    mockSearch.mockReturnValueOnce(probe.promise);
    const p = store.fetch();
    await new Promise((r) => setTimeout(r, 0));
    // the list is not answered until the probe is
    expect(store.loading).toBe(true);
    probe.resolve({ logs: [], nextCursor: null });
    await p;
    expect(store.loading).toBe(false);
    expect(store.neverSent).toBe(true);
    expect(mockSearch.mock.calls[1][0]).toEqual({
      startTime: 10 * 86_400_000,
      endTime: 40 * 86_400_000,
      limit: 1,
    });

    // a quiet tick still empty keeps it; one with lines drops it
    mockSearch.mockResolvedValueOnce({ logs: [], nextCursor: null });
    await store.fetch(true);
    expect(store.neverSent).toBe(true);
    expect(mockSearch).toHaveBeenCalledTimes(3);
    mockSearch.mockResolvedValueOnce({ logs: [log('a')], nextCursor: null });
    await store.fetch(true);
    expect(store.neverSent).toBe(false);
    now.mockRestore();
  });

  it('claims no first run with filters or without an answer', async () => {
    const store = new OtelLogsStore();
    store.setSeverities(['error']);
    mockSearch.mockResolvedValueOnce({ logs: [], nextCursor: null });
    await store.fetch();
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(store.neverSent).toBe(false);

    store.setSeverities([]);
    mockSearch.mockResolvedValueOnce({ logs: [], nextCursor: null });
    mockSearch.mockRejectedValueOnce(new Error('probe failed'));
    await store.fetch();
    expect(mockSearch).toHaveBeenCalledTimes(3);
    expect(store.neverSent).toBe(false);
    expect(store.searchFailed).toBe(false);
  });

  it('an export started mid-search waits for it', async () => {
    const store = new OtelLogsStore();
    const search = deferred<any>();
    mockSearch.mockReturnValueOnce(search.promise);
    const fetched = store.fetch();
    const exported = store.collectExport();
    search.resolve({ logs: [log('a')], nextCursor: 'c1' });
    mockSearch.mockResolvedValueOnce({ logs: [log('b')], nextCursor: null });
    await fetched;
    expect((await exported).map((l) => l.body)).toEqual(['a', 'b']);
  });

  it('a cancelled export asks for no page after the one out', async () => {
    const store = new OtelLogsStore();
    mockSearch.mockResolvedValueOnce({ logs: [log('a')], nextCursor: 'c1' });
    await store.fetch();

    const page = deferred<any>();
    mockSearch.mockReturnValueOnce(page.promise);
    const ctl = new AbortController();
    const exported = store.collectExport(ctl.signal);
    ctl.abort();
    page.resolve({ logs: [log('b')], nextCursor: 'c2' });
    await expect(exported).rejects.toMatchObject({ name: 'AbortError' });
    expect(mockSearch).toHaveBeenCalledTimes(2);
    expect(store.exporting).toBe(false);
  });

  it('a search changed mid-export says so', async () => {
    const store = new OtelLogsStore();
    mockSearch.mockResolvedValueOnce({ logs: [log('a')], nextCursor: 'c1' });
    await store.fetch();

    const page = deferred<any>();
    mockSearch.mockReturnValueOnce(page.promise);
    const exported = store.collectExport(new AbortController().signal);
    mockSearch.mockResolvedValueOnce({ logs: [log('x')], nextCursor: null });
    await store.fetch();
    page.resolve({ logs: [log('b')], nextCursor: null });
    await expect(exported).rejects.toBeInstanceOf(SearchChangedError);
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
    expect(store.listError).toBe('query timed out');

    const abort = new Error('aborted');
    abort.name = 'AbortError';
    mockSearch.mockRejectedValueOnce(abort);
    await store.fetch();
    expect(store.listError).toBeNull();
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

describe('otelLogTimeMs', () => {
  test('cuts nanoseconds to ms without float loss', () => {
    expect(otelLogTimeMs({ timestamp: '1700000000123456789' })).toBe(
      1700000000123,
    );
    expect(otelLogTimeMs({ timestamp: '999' })).toBe(0);
  });
});
