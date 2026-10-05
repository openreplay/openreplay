import { describe, test, expect, jest, afterEach } from '@jest/globals';
import MFileReader from '../../../player/src/web/messages/MFileReader';
import { MType, VALID_TP_SET } from '../../../player/src/web/messages/raw.gen';

function encodeUint(value: number): Uint8Array {
  const bytes: number[] = [];
  let v = value;
  do {
    let byte = v & 0x7f;
    v >>>= 7;
    if (v) byte |= 0x80;
    bytes.push(byte);
  } while (v);
  return Uint8Array.from(bytes);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('MFileReader', () => {
  test('checkForIndexes detects missing indexes and skips header', () => {
    const data = new Uint8Array(9).fill(0xff);
    const reader = new MFileReader(data);
    reader.checkForIndexes();
    expect(reader['noIndexes']).toBe(true);
    expect(reader['p']).toBe(8);
    reader.checkForIndexes();
    expect(reader['p']).toBe(8);
  });

  test('readNext returns timestamp message and sets startTime', () => {
    const data = concat(encodeUint(MType.Timestamp), encodeUint(2000));
    const reader = new MFileReader(data);
    reader['noIndexes'] = true;
    const msg = reader.readNext();
    expect(msg).toEqual({ tp: 9999, tabId: '', time: 0 });
    expect(reader['startTime']).toBe(2000);
  });

  test('an unreadable message only loses the rest of its file', () => {
    const BAD_TP = 240;
    expect(VALID_TP_SET.has(BAD_TP)).toBe(false);
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    const reader = new MFileReader(new Uint8Array(0), 0, { error: jest.fn() } as any);
    reader['noIndexes'] = true;
    reader.append(
      concat(
        encodeUint(MType.RemoveNode),
        encodeUint(1),
        encodeUint(BAD_TP),
        encodeUint(MType.RemoveNode),
        encodeUint(2),
      ),
    );
    expect(reader.readNext()).toMatchObject({ tp: MType.RemoveNode, id: 1 });
    expect(reader.readNext()).toBeNull();
    expect(reader.error).toBe(true);

    reader.append(concat(encodeUint(MType.RemoveNode), encodeUint(3)));
    expect(reader.error).toBe(false);
    expect(reader.readNext()).toMatchObject({ tp: MType.RemoveNode, id: 3 });
    expect(reader.readNext()).toBeNull();
  });
});
