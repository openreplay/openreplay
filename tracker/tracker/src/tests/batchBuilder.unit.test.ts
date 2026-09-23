// @ts-nocheck
import { describe, expect, test, beforeEach, jest } from '@jest/globals'

jest.mock('../common/messages.gen', () => {
  const Type = {
    Timestamp: 0,
    MouseMove: 20,
    ConsoleLog: 22,
    BatchMetadata: 81,
    TabData: 118,
    SetPageLocation: 122,
  }
  return {
    __esModule: true,
    default: null,
    Type,
    ASSET_MESSAGES: new Set(),
    DEVTOOLS_MESSAGES: new Set(),
    ANALYTICS_MESSAGES: new Set(),
  }
})

import BatchBuilder from '../webworker/BatchBuilder.js'
import { parseBatch } from './batchTestKit.js'

const MType = {
  Timestamp: 0,
  MouseMove: 20,
  ConsoleLog: 22,
  BatchMetadata: 81,
  TabData: 118,
  SetPageLocation: 122,
} as const

function readVarint(bytes: Uint8Array, start = 0): [number, number] {
  let val = 0
  let shift = 0
  let i = start
  while (i < bytes.length) {
    const b = bytes[i++]
    val += (b & 0x7f) * Math.pow(2, shift)
    if ((b & 0x80) === 0) return [val, i - start]
    shift += 7
  }
  return [val, i - start]
}

function ctx(overrides: Partial<{ pageNo: number; index: number; timestamp: number; url: string; tabId: string }> = {}) {
  return {
    pageNo: 1,
    index: 0,
    timestamp: 1000,
    url: 'http://test.com',
    tabId: 'tab-1',
    ...overrides,
  }
}

describe('BatchBuilder', () => {
  let builder: BatchBuilder
  beforeEach(() => {
    builder = new BatchBuilder(200000, 1, 'player')
  })

  describe('output shape', () => {
    test('flush() returns null on a fresh builder with no pushes', () => {
      expect(builder.flush()).toBeNull()
    })

    test('flush() returns null when only Timestamp messages were pushed', () => {
      expect(builder.push([MType.Timestamp, 5000], ctx({ index: 0 }))).toBe(true)
      expect(builder.push([MType.Timestamp, 6000], ctx({ index: 1 }))).toBe(true)
      expect(builder.flush()).toBeNull()
    })

    test('first byte of any non-empty batch is the BatchMetadata varint type (0x51)', () => {
      builder.push([MType.MouseMove, 100, 200], ctx())
      const out = builder.flush()
      expect(out).not.toBeNull()
      expect(out![0]).toBe(MType.BatchMetadata)
    })

    test('header carries Timestamp+TabData prelude immediately after BatchMetadata', () => {
      builder.push([MType.MouseMove, 100, 200], ctx({ timestamp: 12345, tabId: 'abc-tab' }))
      const out = builder.flush()!
      // Skip BatchMetadata: type(varint) + version(uint) + pageNo(uint) + firstIndex(uint) + ts(int) + url(string)
      let i = 0
      let consumed: number
      ;[, consumed] = readVarint(out, i); i += consumed // type=81
      ;[, consumed] = readVarint(out, i); i += consumed // version
      ;[, consumed] = readVarint(out, i); i += consumed // pageNo
      ;[, consumed] = readVarint(out, i); i += consumed // firstIndex
      ;[, consumed] = readVarint(out, i); i += consumed // timestamp (zigzag int)
      const [urlLen, urlLenSize] = readVarint(out, i); i += urlLenSize + urlLen

      // After BatchMetadata fields, expect Timestamp message: type=0, then 3-byte size, then varint ts
      expect(out[i]).toBe(MType.Timestamp)
      // The next byte after Timestamp's [type+3-byte size] should be the ts varint
      // Then we should find a TabData message right after.
      i += 1 + 3 // type + size prefix
      const [tsValue, tsSize] = readVarint(out, i)
      expect(tsValue).toBe(12345)
      i += tsSize

      expect(out[i]).toBe(MType.TabData)
    })

    test('BatchMetadata firstIndex equals ctx.index of the first push', () => {
      builder.push([MType.MouseMove, 1, 2], ctx({ index: 42 }))
      const out = builder.flush()!
      // Read past type=81, version, pageNo to firstIndex
      let i = 0
      let consumed: number
      ;[, consumed] = readVarint(out, i); i += consumed
      ;[, consumed] = readVarint(out, i); i += consumed
      ;[, consumed] = readVarint(out, i); i += consumed
      const [firstIdx] = readVarint(out, i)
      expect(firstIdx).toBe(42)
    })
  })

  describe('atomic push', () => {
    test('push returns false for a message larger than buffer; builder stays usable', () => {
      const small = new BatchBuilder(200, 1, 'player')
      const huge = 'x'.repeat(500)
      const accepted = small.push([MType.ConsoleLog, 'info', huge], ctx())
      expect(accepted).toBe(false)

      // A subsequent push of a small message succeeds.
      const ok = small.push([MType.MouseMove, 10, 20], ctx())
      expect(ok).toBe(true)
      const out = small.flush()
      expect(out).not.toBeNull()
      expect(out![0]).toBe(MType.BatchMetadata)
    })

    test('after a failed first push, ctx of the next push wins (snap is not stuck)', () => {
      const small = new BatchBuilder(200, 1, 'player')
      const huge = 'x'.repeat(500)
      // First push fails — snap must NOT be locked to ctx of the failed push.
      small.push([MType.ConsoleLog, 'info', huge], ctx({ index: 7, timestamp: 999 }))
      // Second push succeeds with a different ctx.
      small.push([MType.MouseMove, 10, 20], ctx({ index: 50, timestamp: 2222 }))
      const out = small.flush()!
      // Read firstIndex from BatchMetadata
      let i = 0
      let consumed: number
      ;[, consumed] = readVarint(out, i); i += consumed // type
      ;[, consumed] = readVarint(out, i); i += consumed // version
      ;[, consumed] = readVarint(out, i); i += consumed // pageNo
      const [firstIdx] = readVarint(out, i)
      expect(firstIdx).toBe(50)
    })

    test('push that fails mid-batch only rolls back its own bytes; prior messages remain', () => {
      builder.push([MType.MouseMove, 1, 2], ctx({ index: 0 }))
      builder.push([MType.MouseMove, 3, 4], ctx({ index: 1 }))
      // Try to push a message that's bigger than remaining capacity (200KB - what's been written)
      const huge = 'x'.repeat(250000)
      const accepted = builder.push([MType.ConsoleLog, 'info', huge], ctx({ index: 2 }))
      expect(accepted).toBe(false)
      // Existing batch flushes intact
      const out = builder.flush()!
      expect(out[0]).toBe(MType.BatchMetadata)
      // Builder is reset — second flush returns null
      expect(builder.flush()).toBeNull()
    })
  })

  describe('reset / lifecycle', () => {
    test('flush() resets the builder; next push starts a brand new batch', () => {
      builder.push([MType.MouseMove, 1, 2], ctx({ index: 5, timestamp: 100 }))
      const first = builder.flush()!

      builder.push([MType.MouseMove, 3, 4], ctx({ index: 9, timestamp: 200 }))
      const second = builder.flush()!

      expect(first[0]).toBe(MType.BatchMetadata)
      expect(second[0]).toBe(MType.BatchMetadata)

      // firstIndex should reflect each batch's own snapshot.
      const idx = (b: Uint8Array): number => {
        let i = 0, consumed: number
        ;[, consumed] = readVarint(b, i); i += consumed
        ;[, consumed] = readVarint(b, i); i += consumed
        ;[, consumed] = readVarint(b, i); i += consumed
        return readVarint(b, i)[0]
      }
      expect(idx(first)).toBe(5)
      expect(idx(second)).toBe(9)
    })
  })

  describe('budget enforcement', () => {
    test('hard cap: push refuses once the next message would not fit, output stays whole', () => {
      const small = new BatchBuilder(500, 1, 'player')
      let accepted = 0
      while (accepted < 1000 && small.push([MType.MouseMove, 1000 + accepted, 1000], ctx({ index: accepted }))) {
        accepted++
      }
      expect(accepted).toBeGreaterThan(0)
      expect(accepted).toBeLessThan(1000)
      expect(small.size()).toBeLessThanOrEqual(500)
      // One more MouseMove (8 bytes: type + 3-byte size + two 2-byte varints) would overflow.
      expect(small.size() + 8).toBeGreaterThan(500)

      const out = small.flush()!
      const parsed = parseBatch(out) // throws on a truncated trailing message
      expect(parsed.types.filter((t) => t === MType.MouseMove)).toHaveLength(accepted)
    })

    test('a per-push limit caps below bufferSize for that push only', () => {
      builder.push([MType.MouseMove, 1, 2], ctx())
      const used = builder.size()
      expect(builder.push([MType.ConsoleLog, 'info', 'x'.repeat(100)], ctx({ index: 1 }), used + 50)).toBe(false)
      expect(builder.size()).toBe(used)
      expect(builder.push([MType.ConsoleLog, 'info', 'x'.repeat(100)], ctx({ index: 1 }))).toBe(true)
      expect(parseBatch(builder.flush()!).types).toEqual([MType.Timestamp, MType.TabData, MType.MouseMove, MType.ConsoleLog])
    })

    test('a per-push limit also covers the header of a fresh batch', () => {
      expect(builder.push([MType.MouseMove, 1, 2], ctx(), 10)).toBe(false)
      expect(builder.size()).toBe(0)
      expect(builder.flush()).toBeNull()
    })
  })

  describe('intra-batch Timestamp synthesis', () => {
    test('non-Timestamp message at a new ts auto-injects a Timestamp before it', () => {
      builder.push([MType.MouseMove, 1, 2], ctx({ index: 0, timestamp: 1000 }))
      builder.push([MType.MouseMove, 3, 4], ctx({ index: 1, timestamp: 2000 }))
      const out = builder.flush()!

      // Walk past header (BatchMetadata fields + synth Timestamp + synth TabData),
      // then past first MouseMove, then verify the next message is a Timestamp(2000).
      let i = 0, consumed: number
      ;[, consumed] = readVarint(out, i); i += consumed // BatchMeta type
      ;[, consumed] = readVarint(out, i); i += consumed // version
      ;[, consumed] = readVarint(out, i); i += consumed // pageNo
      ;[, consumed] = readVarint(out, i); i += consumed // firstIndex
      ;[, consumed] = readVarint(out, i); i += consumed // ts (zigzag)
      const [urlLen, urlLenSize] = readVarint(out, i); i += urlLenSize + urlLen

      // synth Timestamp
      expect(out[i]).toBe(MType.Timestamp); i += 1 + 3
      ;[, consumed] = readVarint(out, i); i += consumed
      // synth TabData
      expect(out[i]).toBe(MType.TabData); i += 1 + 3
      const [tabLen, tabLenSize] = readVarint(out, i); i += tabLenSize + tabLen
      // first MouseMove (msg type=20, size:3, fields)
      expect(out[i]).toBe(MType.MouseMove); i += 1 + 3
      ;[, consumed] = readVarint(out, i); i += consumed
      ;[, consumed] = readVarint(out, i); i += consumed

      // Auto-synth'd Timestamp(2000) must be next
      expect(out[i]).toBe(MType.Timestamp); i += 1 + 3
      const [tsValue] = readVarint(out, i)
      expect(tsValue).toBe(2000)
    })

    test('explicit Timestamp message is NOT followed by an auto-synthed Timestamp duplicate', () => {
      // Caller-driven Timestamp pushes (player-style) should not trigger duplicate synthesis.
      builder.push([MType.MouseMove, 1, 2], ctx({ index: 0, timestamp: 1000 }))
      builder.push([MType.Timestamp, 2000], ctx({ index: 1, timestamp: 2000 }))
      builder.push([MType.MouseMove, 3, 4], ctx({ index: 2, timestamp: 2000 }))
      const out = builder.flush()!

      // Count the number of Timestamp messages in the body (after BatchMeta + synth Timestamp + synth TabData).
      // We expect: header synth Timestamp(1000), header synth TabData, MouseMove, explicit Timestamp(2000), MouseMove.
      // No additional auto-synth before the second MouseMove because lastPushedTs was updated to 2000 by the explicit Timestamp.
      let i = 0, consumed: number
      // skip BatchMeta
      ;[, consumed] = readVarint(out, i); i += consumed
      ;[, consumed] = readVarint(out, i); i += consumed
      ;[, consumed] = readVarint(out, i); i += consumed
      ;[, consumed] = readVarint(out, i); i += consumed
      ;[, consumed] = readVarint(out, i); i += consumed
      const [urlLen, urlLenSize] = readVarint(out, i); i += urlLenSize + urlLen

      // Walk subsequent [type][size:3][fields] messages and count Timestamps.
      let timestampCount = 0
      while (i < out.length) {
        const type = out[i]; i += 1
        // 3-byte LE size
        const size = out[i] | (out[i+1] << 8) | (out[i+2] << 16); i += 3
        if (type === MType.Timestamp) timestampCount++
        i += size
      }
      // Expect: synth Timestamp from header + explicit Timestamp(2000) from the push = 2.
      // If there were duplication, this would be 3 or more.
      expect(timestampCount).toBe(2)
    })

    test('first push captures lastPushedTs from its own ctx (no synth before first real msg)', () => {
      // First push at ts=5000 should have NO auto-synth before MouseMove
      // (the header already encodes ts=5000 and synthesizes a Timestamp(5000) message).
      builder.push([MType.MouseMove, 1, 2], ctx({ index: 0, timestamp: 5000 }))
      const out = builder.flush()!

      let i = 0, consumed: number
      ;[, consumed] = readVarint(out, i); i += consumed
      ;[, consumed] = readVarint(out, i); i += consumed
      ;[, consumed] = readVarint(out, i); i += consumed
      ;[, consumed] = readVarint(out, i); i += consumed
      ;[, consumed] = readVarint(out, i); i += consumed
      const [urlLen, urlLenSize] = readVarint(out, i); i += urlLenSize + urlLen
      // synth Timestamp + TabData from header
      expect(out[i]).toBe(MType.Timestamp); i += 1 + 3
      ;[, consumed] = readVarint(out, i); i += consumed
      expect(out[i]).toBe(MType.TabData); i += 1 + 3
      const [tabLen, tabLenSize] = readVarint(out, i); i += tabLenSize + tabLen
      // Next must be the MouseMove directly — not another Timestamp.
      expect(out[i]).toBe(MType.MouseMove)
    })
  })
})
