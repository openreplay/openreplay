// @ts-nocheck
import { describe, expect, test, beforeEach, jest } from '@jest/globals'

jest.mock('../common/messages.gen', () => {
  const Type = {
    Timestamp: 0,
    MouseMove: 20,
    ConsoleLog: 22,
    BatchMessageOffsets: 82,
    BatchMetadata: 86,
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

const MType = {
  Timestamp: 0,
  MouseMove: 20,
  ConsoleLog: 22,
  BatchMessageOffsets: 82,
  BatchMetadata: 86,
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

// Skip the BatchMetadata header (type varint + 7 fields, no size prefix):
// version, pageNo, firstIndex, firstTimestamp(int), location(string), lastTimestamp(int),
// batchMessageOffsetsSize(int). Returns the index right after it.
function skipMeta(out: Uint8Array): number {
  let i = 0
  let c: number
  ;[, c] = readVarint(out, i); i += c // type
  ;[, c] = readVarint(out, i); i += c // version
  ;[, c] = readVarint(out, i); i += c // pageNo
  ;[, c] = readVarint(out, i); i += c // firstIndex
  ;[, c] = readVarint(out, i); i += c // firstTimestamp (zigzag)
  const [urlLen, urlLenSize] = readVarint(out, i); i += urlLenSize + urlLen // location
  ;[, c] = readVarint(out, i); i += c // lastTimestamp (zigzag)
  ;[, c] = readVarint(out, i); i += c // batchMessageOffsetsSize (zigzag)
  return i
}

// Index of the first body message (synthetic Timestamp). The body starts right after the
// metadata; the offsets table is appended at the end of the batch.
function bodyStart(out: Uint8Array): number {
  return skipMeta(out)
}

// Decode the batchMessageOffsetsSize field (last BatchMetadata field, zigzag int).
function readOffsetsSize(out: Uint8Array): number {
  let i = 0
  let c: number
  ;[, c] = readVarint(out, i); i += c // type
  ;[, c] = readVarint(out, i); i += c // version
  ;[, c] = readVarint(out, i); i += c // pageNo
  ;[, c] = readVarint(out, i); i += c // firstIndex
  ;[, c] = readVarint(out, i); i += c // firstTimestamp
  const [urlLen, urlLenSize] = readVarint(out, i); i += urlLenSize + urlLen // location
  ;[, c] = readVarint(out, i); i += c // lastTimestamp
  const [zz] = readVarint(out, i) // batchMessageOffsetsSize (zigzag)
  return zz % 2 === 0 ? zz / 2 : -(zz + 1) / 2
}

// Decode the lastTimestamp field (6th BatchMetadata field, after location; zigzag int).
function readLastTimestamp(out: Uint8Array): number {
  let i = 0
  let c: number
  ;[, c] = readVarint(out, i); i += c // type
  ;[, c] = readVarint(out, i); i += c // version
  ;[, c] = readVarint(out, i); i += c // pageNo
  ;[, c] = readVarint(out, i); i += c // firstIndex
  ;[, c] = readVarint(out, i); i += c // firstTimestamp
  const [urlLen, urlLenSize] = readVarint(out, i); i += urlLenSize + urlLen // location
  const [zz] = readVarint(out, i) // lastTimestamp (zigzag)
  return zz % 2 === 0 ? zz / 2 : -(zz + 1) / 2
}

// Parse the BatchMessageOffsets map ([type 82][uint mapSize, then per type:
// uint type, uint count, count x uint offset], no size prefix). The table is appended at the
// end of the batch — locate it via EOF - batchMessageOffsetsSize. Returns type -> offsets[].
function parseOffsetsMap(out: Uint8Array): Map<number, number[]> {
  let i = out.length - readOffsetsSize(out)
  let c: number
  const [type] = readVarint(out, i)
  expect(type).toBe(MType.BatchMessageOffsets)
  ;[, c] = readVarint(out, i); i += c // type
  const map = new Map<number, number[]>()
  const [mapSize, ms] = readVarint(out, i); i += ms
  for (let e = 0; e < mapSize; e++) {
    const [mType, mt] = readVarint(out, i); i += mt
    const [count, cs] = readVarint(out, i); i += cs
    const offsets: number[] = []
    for (let k = 0; k < count; k++) {
      const [off, os] = readVarint(out, i); i += os
      offsets.push(off)
    }
    map.set(mType, offsets)
  }
  return map
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

    test('first byte of any non-empty batch is the BatchMetadata varint type (0x56)', () => {
      builder.push([MType.MouseMove, 100, 200], ctx())
      const out = builder.flush()
      expect(out).not.toBeNull()
      expect(out![0]).toBe(MType.BatchMetadata)
    })

    test('header carries Timestamp+TabData prelude after BatchMetadata + offsets map', () => {
      builder.push([MType.MouseMove, 100, 200], ctx({ timestamp: 12345, tabId: 'abc-tab' }))
      const out = builder.flush()!
      // Skip BatchMetadata + the BatchMessageOffsets map to reach the body.
      let i = bodyStart(out)

      // First body message is the Timestamp: type=0, then 3-byte size, then varint ts
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

    test('Timestamp pushed as the very first message does NOT count as content; flush returns null', () => {
      builder.push([MType.Timestamp, 5000], ctx())
      // Header was synthesized but no real (non-Timestamp) message — empty batch.
      expect(builder.flush()).toBeNull()
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

    test('reset() drops in-progress batch silently', () => {
      builder.push([MType.MouseMove, 1, 2], ctx())
      builder.reset()
      expect(builder.flush()).toBeNull()
    })

    test('hasContent() reflects whether a real message was pushed', () => {
      expect(builder.hasContent()).toBe(false)
      builder.push([MType.Timestamp, 5000], ctx())
      expect(builder.hasContent()).toBe(false) // Timestamp alone doesn't count
      builder.push([MType.MouseMove, 1, 2], ctx())
      expect(builder.hasContent()).toBe(true)
    })
  })

  describe('budget enforcement', () => {
    test('bufferSize bounds metadata + body; the offsets map is spliced on top', () => {
      const small = new BatchBuilder(500, 1, 'player')
      // Try to fill it with successively-pushed mouse moves
      let ok = true
      let i = 0
      while (ok) {
        ok = small.push([MType.MouseMove, i, i], ctx({ index: i }))
        i++
        if (i > 1000) break
      }
      const out = small.flush()
      expect(out).not.toBeNull()
      // The encoder bounds (placeholder metadata + body) to bufferSize. The flushed batch
      // adds the BatchMessageOffsets map on top — it is deliberately NOT counted against the
      // budget — plus a few bytes as the metadata int fields grow past their zero placeholders.
      const offsetsSize = readOffsetsSize(out!)
      expect(out!.length).toBeLessThanOrEqual(500 + offsetsSize + 16)
    })
  })

  describe('BatchMessageOffsets map', () => {
    test('every offset (relative mode) points at a message of its mapped type', () => {
      builder.push([MType.MouseMove, 1, 2], ctx({ index: 0, timestamp: 1000 }))
      builder.push([MType.ConsoleLog, 'info', 'a'], ctx({ index: 1, timestamp: 1000 }))
      builder.push([MType.MouseMove, 3, 4], ctx({ index: 2, timestamp: 1000 }))
      const out = builder.flush()!

      const map = parseOffsetsMap(out)
      const base = bodyStart(out) // relative offsets count from the first body byte

      // Each recorded offset must land on a message whose varint type equals the map key.
      for (const [type, offsets] of map) {
        for (const off of offsets) {
          expect(readVarint(out, base + off)[0]).toBe(type)
        }
      }

      // Body = synth Timestamp, synth TabData, MouseMove, ConsoleLog, MouseMove.
      expect(map.get(MType.Timestamp)).toEqual([0]) // first message, at offset 0
      expect(map.get(MType.TabData)?.length).toBe(1)
      expect(map.get(MType.MouseMove)?.length).toBe(2)
      expect(map.get(MType.ConsoleLog)?.length).toBe(1)
    })

    test('asset batches still carry BatchMetadata (with lastTimestamp) but no map', () => {
      const assets = new BatchBuilder(200000, 3, 'assets')
      assets.push([MType.MouseMove, 1, 2], ctx({ timestamp: 7777 }))
      const out = assets.flush()!

      // BatchMetadata is always emitted — even for assets, where there is no offsets map.
      expect(out[0]).toBe(MType.BatchMetadata)
      expect(readOffsetsSize(out)).toBe(0)
      // lastTimestamp is included regardless of dataType.
      expect(readLastTimestamp(out)).toBe(7777)
      // With no map, the first body message sits immediately after BatchMetadata.
      expect(out[skipMeta(out)]).toBe(MType.Timestamp)
    })
  })

  describe('intra-batch Timestamp synthesis', () => {
    test('non-Timestamp message at a new ts auto-injects a Timestamp before it', () => {
      builder.push([MType.MouseMove, 1, 2], ctx({ index: 0, timestamp: 1000 }))
      builder.push([MType.MouseMove, 3, 4], ctx({ index: 1, timestamp: 2000 }))
      const out = builder.flush()!

      // Walk past header (BatchMetadata + offsets map + synth Timestamp + synth TabData),
      // then past first MouseMove, then verify the next message is a Timestamp(2000).
      let i = bodyStart(out), consumed: number

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

      // Count the number of Timestamp messages in the body (after BatchMeta + offsets map).
      // We expect: header synth Timestamp(1000), header synth TabData, MouseMove, explicit Timestamp(2000), MouseMove.
      // No additional auto-synth before the second MouseMove because lastPushedTs was updated to 2000 by the explicit Timestamp.
      let i = bodyStart(out)

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

      let i = bodyStart(out), consumed: number
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
