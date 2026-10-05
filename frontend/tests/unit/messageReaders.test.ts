import { describe, expect, test, jest, afterEach } from '@jest/globals';
import {
  resolveURL,
  resolveCSS,
  rewritePseudoclasses,
} from '../../../player/src/web/messages/rewriter/urlResolve';
import TrackerReader from '../../../player/src/web/messages/TrackerReader';
import MFileReader from '../../../player/src/web/messages/MFileReader';
import MobFileParser from '../../../player/src/web/messages/MobFileParser';
import JSONRawMessageReader from '../../../player/src/web/messages/JSONRawMessageReader';
import PrimitiveReader from '../../../player/src/web/messages/PrimitiveReader';
import {
  detectProtoFormat,
  stripHeader,
} from '../../../player/src/web/messages/protoFormat';
import { loadFiles, NO_URLS } from '../../../player/src/web/network/loadFiles';
import { MType } from '../../../player/src/web/messages/raw.gen';

function uint(value: number): number[] {
  const bytes: number[] = [];
  let v = value;
  do {
    let byte = v % 128;
    v = Math.floor(v / 128);
    if (v) byte |= 0x80;
    bytes.push(byte);
  } while (v);
  return bytes;
}
const str = (s: string) => {
  const utf8 = [...Buffer.from(s, 'utf8')];
  return [...uint(utf8.length), ...utf8];
};
const size3 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff];
/** v2 message: tp varint + 3-byte LE size + body */
const sized = (tp: number, body: number[]) => [...uint(tp), ...size3(body.length), ...body];
const bytes = (...parts: number[][]) => Uint8Array.from(parts.flat());
const V2_HEADER = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfe];
const V1_HEADER = new Array(8).fill(0xff);

const timestamp = (ts: number) => sized(MType.Timestamp, uint(ts));
const removeNode = (id: number) => sized(MType.RemoveNode, uint(id));
const tabData = (tab: string) => sized(MType.TabData, str(tab));

describe('resolveURL', () => {
  test.each(['http://', 'https://', '//', 'http://exa mple.com', 'http://[::1'])(
    'returns unparseable %p unchanged instead of throwing',
    (url) => {
      expect(resolveURL('https://site.com/a/', url)).toBe(url);
    },
  );

  test('returns the value when the base itself is invalid', () => {
    expect(resolveURL('/relative-base/', 'img.png')).toBe('img.png');
  });

  test('passes data:, blob: and fragment values through untouched', () => {
    const data = 'data:image/svg+xml;utf8,<svg>é</svg>';
    expect(resolveURL('https://site.com/', data)).toBe(data);
    expect(resolveURL('https://site.com/', '#icon')).toBe('#icon');
    expect(resolveURL('https://site.com/', 'blob:https://site.com/x')).toBe(
      'blob:https://site.com/x',
    );
  });

  test('still resolves relative urls', () => {
    expect(resolveURL('https://site.com/a/b.html', '../c.png')).toBe(
      'https://site.com/c.png',
    );
  });
});

describe('rewritePseudoclasses', () => {
  test('keeps media feature (hover:hover) valid', () => {
    expect(
      rewritePseudoclasses('@media (hover:hover){.a:hover{color:red}}'),
    ).toBe('@media (hover:hover){.a.-openreplay-hover{color:red}}');
  });

  test('keeps @import media queries intact', () => {
    const css = '@import url("x.css") (hover:hover);';
    expect(rewritePseudoclasses(css)).toBe(css);
  });

  test('does not touch escaped colons inside class names', () => {
    expect(rewritePseudoclasses('.dark\\:hover\\:bg-x:hover{x:y}')).toBe(
      '.dark\\:hover\\:bg-x.-openreplay-hover{x:y}',
    );
  });

  test('rewrites focus as before', () => {
    expect(rewritePseudoclasses('input:focus{}')).toBe(
      'input.-openreplay-focus{}',
    );
  });

  test('resolveCSS survives a bad url()', () => {
    expect(resolveCSS('https://site.com/', '.a{background:url(http://)}')).toBe(
      '.a{background:url(http://)}',
    );
  });
});

describe('PrimitiveReader', () => {
  test('append drops consumed bytes', () => {
    const r = new PrimitiveReader(Uint8Array.from([1, 2, 3]));
    r.readUint();
    r.readUint();
    r.append(Uint8Array.from([4]));
    expect(r.getBufferSize()).toBe(2);
    expect(r.readUint()).toBe(3);
    expect(r.readUint()).toBe(4);
  });

  test('decodes ascii and multibyte strings', () => {
    const long = 'x'.repeat(40) + 'ü';
    const r = new PrimitiveReader(bytes(str('DIV'), str('ünï'), str(long)));
    expect(r.readString()).toBe('DIV');
    expect(r.readString()).toBe('ünï');
    expect(r.readString()).toBe(long);
  });
});

describe('TrackerReader', () => {
  test('stamps time and tab onto messages', () => {
    const r = new TrackerReader(1000);
    r.append(bytes(timestamp(1500), tabData('t1'), removeNode(1)));
    expect(r.readBatch()).toEqual([
      { tp: 9999, time: 500 },
      { tp: MType.RemoveNode, id: 1, time: 500, tabId: 't1' },
    ]);
  });

  test('a bad href does not abort the batch', () => {
    const r = new TrackerReader(1000);
    const href = sized(MType.SetNodeAttributeURLBased, [
      ...uint(3),
      ...str('href'),
      ...str('http://'),
      ...str('https://site.com/'),
    ]);
    r.append(bytes(timestamp(1000), href, removeNode(4)));
    const msgs = r.readBatch();
    expect(msgs).toHaveLength(3);
    expect(msgs[1]).toMatchObject({ tp: MType.SetNodeAttribute, value: 'http://' });
  });
});

describe('protoFormat', () => {
  test('reads the header version', () => {
    expect(detectProtoFormat(bytes(V2_HEADER))).toBe(2);
    expect(detectProtoFormat(bytes(V1_HEADER))).toBe(1);
  });

  test('headerless files are typed by tracker version', () => {
    expect(detectProtoFormat(Uint8Array.from([0]), '16.2.1')).toBe(1);
    expect(detectProtoFormat(Uint8Array.from([0]), '18.0.0')).toBe(3);
  });

  test('stripHeader returns a view', () => {
    const data = bytes(V2_HEADER, [1, 2]);
    const stripped = stripHeader(data);
    expect(Array.from(stripped)).toEqual([1, 2]);
    expect(stripped.buffer).toBe(data.buffer);
  });
});

describe('MFileReader', () => {
  const v1Msg = (index: number, body: number[]) => [
    ...[index, 0, 0, 0, 0, 0, 0, 0],
    ...body,
  ];

  test('keeps the index of a message cut at a file boundary', () => {
    const data = bytes(
      V1_HEADER,
      v1Msg(1, [MType.Timestamp, ...uint(2000)]),
      v1Msg(2, [MType.RemoveNode, ...uint(300)]),
      v1Msg(3, [MType.RemoveNode, ...uint(301)]),
    );
    const cut = data.length - 2;
    const reader = new MFileReader(new Uint8Array(0), 1000);
    reader.append(data.subarray(0, cut));
    reader.checkForIndexes();
    const got: any[] = [];
    for (let m = reader.readNext(); m; m = reader.readNext()) got.push(m);
    reader.append(data.subarray(cut));
    for (let m = reader.readNext(); m; m = reader.readNext()) got.push(m);
    expect(reader.error).toBe(false);
    expect(got.map((m) => [m.tp, m.id, m._index])).toEqual([
      [9999, undefined, undefined],
      [MType.RemoveNode, 300, 2],
      [MType.RemoveNode, 301, 3],
    ]);
  });

  test('skips messages with an index lower than the last one', () => {
    const reader = new MFileReader(new Uint8Array(0), 1000);
    reader.append(
      bytes(
        V1_HEADER,
        v1Msg(5, [MType.RemoveNode, ...uint(1)]),
        v1Msg(4, [MType.RemoveNode, ...uint(2)]),
        v1Msg(6, [MType.RemoveNode, ...uint(3)]),
      ),
    );
    reader.checkForIndexes();
    const ids: number[] = [];
    for (let m = reader.readNext(); m; m = reader.readNext()) ids.push((m as any).id);
    expect(ids).toEqual([1, 3]);
  });
});

describe('MobFileParser', () => {
  test('mobile files use absolute message timestamps', () => {
    const p = new MobFileParser(1000, { mobile: true });
    const msgs = p.parse(
      bytes(V1_HEADER, [MType.MobileEvent, ...uint(1600), ...uint(0), ...str('n'), ...str('p')]),
    );
    expect(msgs[0]).toMatchObject({ tp: MType.MobileEvent, time: 600 });
  });

  test('mobile files are read as v1 even with a v2 header', () => {
    const p = new MobFileParser(1000, { mobile: true });
    const msgs = p.parse(
      bytes(V2_HEADER, [MType.MobileEvent, ...uint(1600), ...uint(0), ...str('n'), ...str('p')]),
    );
    expect(msgs[0]).toMatchObject({ tp: MType.MobileEvent, time: 600 });
  });
});

describe('JSONRawMessageReader', () => {
  test('reads across appends without losing unread messages', () => {
    const r = new JSONRawMessageReader();
    r.append([[11, 1] as any, [11, 2] as any]);
    expect(r.readMessage()).toMatchObject({ tp: MType.RemoveNode, id: 1 });
    r.append([[11, 3] as any]);
    expect(r.readMessage()).toMatchObject({ id: 2 });
    expect(r.readMessage()).toMatchObject({ id: 3 });
    expect(r.readMessage()).toBeNull();
  });
});

describe('loadFiles', () => {
  const realFetch = window.fetch;
  afterEach(() => {
    window.fetch = realFetch;
    jest.useRealTimers();
  });

  const ok = () =>
    ({ status: 200, url: 'u', arrayBuffer: async () => new ArrayBuffer(1) }) as Response;

  test('rejects lists without usable urls', async () => {
    await expect(loadFiles([undefined as any], jest.fn())).rejects.toBe(NO_URLS);
    await expect(loadFiles([], jest.fn())).rejects.toBe(NO_URLS);
  });

  test('retries network failures', async () => {
    jest.useFakeTimers();
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(ok());
    window.fetch = fetchMock;
    const onData = jest.fn();
    const loading = loadFiles(['u1'], onData);
    await jest.advanceTimersByTimeAsync(300);
    await loading;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onData).toHaveBeenCalledTimes(1);
  });

  test.each([503, 408, 429])('retries a transient %i status', async (status) => {
    jest.useFakeTimers();
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce({ status, url: 'u' } as Response)
      .mockResolvedValueOnce(ok());
    window.fetch = fetchMock;
    const onData = jest.fn();
    const loading = loadFiles(['u1'], onData);
    await jest.advanceTimersByTimeAsync(300);
    await loading;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onData).toHaveBeenCalledTimes(1);
  });

  test('does not retry 4xx', async () => {
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValue({ status: 403, url: 'u' } as Response);
    window.fetch = fetchMock;
    await expect(loadFiles(['u1'], jest.fn())).rejects.toMatch('403');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('passes the abort signal and stops when aborted during a retry backoff', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(ok());
    window.fetch = fetchMock;
    const loading = expect(
      loadFiles(['u1'], jest.fn(), false, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    await jest.advanceTimersByTimeAsync(100);
    controller.abort();
    await loading;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal);
  });
});
