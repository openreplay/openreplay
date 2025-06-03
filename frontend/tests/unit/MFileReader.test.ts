import { describe, test, expect } from '@jest/globals';
import MFileReader from '../../app/player/web/messages/MFileReader';
import { MType } from '../../app/player/web/messages/raw.gen';

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
});
