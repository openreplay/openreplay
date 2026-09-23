import { describe, expect, test, jest } from '@jest/globals'
import { TextEncoder as NodeTextEncoder } from 'util'
import PrimitiveEncoder from './PrimitiveEncoder.js'

function bytesOf(write: (e: PrimitiveEncoder) => boolean, size = 64): number[] {
  const e = new PrimitiveEncoder(size)
  expect(write(e)).toBe(true)
  e.checkpoint()
  return Array.from(e.flush())
}

describe('PrimitiveEncoder', () => {
  test('flush() returns only checkpointed bytes, then starts over', () => {
    const enc = new PrimitiveEncoder(10)
    enc.uint(1)
    enc.checkpoint()
    enc.uint(2) // not checkpointed: a partial write in progress
    expect(Array.from(enc.flush())).toEqual([1])
    expect(enc.isEmpty).toBe(true)
    expect(enc.getCurrentCheckpoint()).toBe(0)
    enc.uint(3)
    enc.checkpoint()
    expect(Array.from(enc.flush())).toEqual([3])
  })

  test('boolean() writes one 0/1 byte', () => {
    expect(bytesOf((e) => e.boolean(true) && e.boolean(false))).toEqual([1, 0])
  })

  describe('uint() varint', () => {
    test.each([
      [0, [0x00]],
      [127, [0x7f]],
      [128, [0x80, 0x01]],
      [300, [0xac, 0x02]],
      [16_384, [0x80, 0x80, 0x01]],
      [2 ** 32, [0x80, 0x80, 0x80, 0x80, 0x10]],
      [Number.MAX_SAFE_INTEGER, [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x0f]],
    ])('%d', (value, expected) => {
      expect(bytesOf((e) => e.uint(value))).toEqual(expected)
    })

    test('negative and unsafe values clamp to 0', () => {
      expect(bytesOf((e) => e.uint(-5) && e.uint(Number.MAX_SAFE_INTEGER + 1) && e.uint(Infinity))).toEqual([0, 0, 0])
    })
  })

  test('int() zigzag-encodes and rounds', () => {
    expect(bytesOf((e) => e.int(0) && e.int(-1) && e.int(1) && e.int(-64) && e.int(64) && e.int(-2.6))).toEqual([
      0, 1, 2, 127, 0x80, 0x01, 5,
    ])
  })

  test('buffer oveflow with string()', () => {
    const N = 10
    const enc = new PrimitiveEncoder(N)
    const wasWritten = enc.string('long string'.repeat(N))
    expect(wasWritten).toBe(false)
  })
  test('buffer oveflow with uint()', () => {
    const enc = new PrimitiveEncoder(1)
    const wasWritten = enc.uint(Number.MAX_SAFE_INTEGER)
    expect(wasWritten).toBe(false)
  })
  test('buffer oveflow with boolean()', () => {
    const enc = new PrimitiveEncoder(1)
    let wasWritten = enc.boolean(true)
    expect(wasWritten).toBe(true)
    wasWritten = enc.boolean(true)
    expect(wasWritten).toBe(false)
  })

  describe('string() UTF-8', () => {
    const samples = ['', 'ascii', 'é ß', '€ 中文', '😀 𝄞', 'a😀b€c']
    const fallbackEncoder = () => {
      let Enc: typeof PrimitiveEncoder
      const saved = (globalThis as any).TextEncoder
      delete (globalThis as any).TextEncoder
      jest.isolateModules(() => {
        Enc = require('./PrimitiveEncoder.js').default
      })
      ;(globalThis as any).TextEncoder = saved
      return Enc!
    }
    const nativeEncoder = () => {
      let Enc: typeof PrimitiveEncoder
      const saved = (globalThis as any).TextEncoder
      ;(globalThis as any).TextEncoder = NodeTextEncoder
      jest.isolateModules(() => {
        Enc = require('./PrimitiveEncoder.js').default
      })
      ;(globalThis as any).TextEncoder = saved
      return Enc!
    }

    test.each([
      ['fallback', fallbackEncoder],
      ['TextEncoder', nativeEncoder],
    ])('%s: length-prefixed, byte-exact with Node utf8', (_, load) => {
      const Enc = load()
      for (const str of samples) {
        const e = new Enc(64)
        expect(e.string(str)).toBe(true)
        e.checkpoint()
        const utf8 = Array.from(Buffer.from(str, 'utf8'))
        expect(Array.from(e.flush())).toEqual([utf8.length, ...utf8])
      }
    })

    test.each([
      ['fallback', fallbackEncoder],
      ['TextEncoder', nativeEncoder],
    ])('%s: lone surrogates become U+FFFD', (_, load) => {
      const e = new (load())(64)
      expect(e.string('a\ud800b\udc00')).toBe(true)
      e.checkpoint()
      // Matches TextEncoder: an unpaired high or low surrogate is replaced, the next code unit kept.
      expect(Array.from(e.flush())).toEqual([8, 0x61, 0xef, 0xbf, 0xbd, 0x62, 0xef, 0xbf, 0xbd])
    })
  })

  describe('rewind()', () => {
    test('rolls back offset and checkpoint to a saved state', () => {
      const e = new PrimitiveEncoder(64)
      e.uint(1)
      e.uint(2)
      e.checkpoint()
      const savedOffset = e.getCurrentOffset()
      const savedCheckpoint = e.getCurrentCheckpoint()

      e.uint(3)
      e.uint(4)
      e.checkpoint()
      expect(e.getCurrentOffset()).toBeGreaterThan(savedOffset)

      e.rewind(savedOffset, savedCheckpoint)
      expect(e.getCurrentOffset()).toBe(savedOffset)
      expect(e.getCurrentCheckpoint()).toBe(savedCheckpoint)

      const out = e.flush()
      expect(Array.from(out)).toEqual([1, 2])
    })

    test('refuses to advance forward (no-op on bad input)', () => {
      const e = new PrimitiveEncoder(64)
      e.uint(7)
      const offset = e.getCurrentOffset()
      e.rewind(offset + 5, 100)
      expect(e.getCurrentOffset()).toBe(offset)
      expect(e.getCurrentCheckpoint()).toBe(0)
    })
  })
})
