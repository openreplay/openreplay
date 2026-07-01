// @ts-nocheck
/**
 * Reproduces the theory that BatchWriter can emit batches whose first byte is 0x00
 * (or otherwise not BatchMetadata/0x51) because of a stale `prepared=true` flag
 * that makes `this.prepare()` a no-op on a freshly-swapped encoder.
 *
 * The suspect block is BatchWriter.writeMessage lines ~178-188:
 *
 *   this.encoder = new MessageEncoder(this.beaconSizeLimit) // swap
 *   this.prepare()                                          // <- no-op: prepared is already true
 *   if (!this.writeWithSize(message)) {
 *     console.warn(...)                                     // warn path: leaves prepared=true, encoder fresh
 *   } else {
 *     this.finaliseBatch()                                  // success path: flushes a batch with NO BatchMetadata
 *   }
 *   this.encoder = new MessageEncoder(this.beaconSize)      // swap again, prepared may still be stale
 */
import { describe, expect, test, jest, beforeEach } from '@jest/globals'

// Minimal mock. Keep ASSET/DEVTOOLS/ANALYTICS sets empty so every message
// flows through the regular writeWithSize path regardless of protocolVersion.
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

import BatchWriter from '../webworker/BatchWriter.js'

const MType = {
  Timestamp: 0,
  MouseMove: 20,
  ConsoleLog: 22,
  BatchMessageOffsets: 82,
  BatchMetadata: 86,
  TabData: 118,
} as const

// Decode a single varint at offset; returns [value, bytesConsumed].
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

// Summarise what the server-side parser would see as the first "message type" of the batch.
function firstMessageType(batch: Uint8Array): number {
  return readVarint(batch, 0)[0]
}

// Walk past BatchMetadata fields and verify the next two messages are Timestamp + TabData.
// The body starts right after the metadata; the offsets table is appended at the batch end.
function expectPrelude(batch: Uint8Array): void {
  let i = 0
  let consumed: number
  ;[, consumed] = readVarint(batch, i); i += consumed // type=BatchMetadata
  ;[, consumed] = readVarint(batch, i); i += consumed // version
  ;[, consumed] = readVarint(batch, i); i += consumed // pageNo
  ;[, consumed] = readVarint(batch, i); i += consumed // firstIndex
  ;[, consumed] = readVarint(batch, i); i += consumed // firstTimestamp (zigzag int)
  const [urlLen, urlLenSize] = readVarint(batch, i); i += urlLenSize + urlLen
  ;[, consumed] = readVarint(batch, i); i += consumed // lastTimestamp (zigzag int)
  ;[, consumed] = readVarint(batch, i); i += consumed // batchMessageOffsetsSize (zigzag int)
  expect(batch[i]).toBe(MType.Timestamp) // synth Timestamp message
  // skip type(1) + size(3) + ts varint
  i += 1 + 3
  const [, tsSize] = readVarint(batch, i); i += tsSize
  expect(batch[i]).toBe(MType.TabData) // synth TabData message
}

function createWriter(onBatch: jest.Mock, onOfflineEnd: jest.Mock) {
  return new BatchWriter(
    /* pageNo */ 1,
    /* timestamp */ 1000,
    /* url */ 'http://test.com',
    /* onBatch */ onBatch,
    /* tabId */ 'tab-1',
    /* onOfflineEnd */ onOfflineEnd,
  )
}

describe('BatchWriter — leading-byte-0x00 / missing-BatchMetadata repro', () => {
  let onBatch: jest.Mock
  let onOfflineEnd: jest.Mock

  beforeEach(() => {
    onBatch = jest.fn()
    onOfflineEnd = jest.fn()
  })

  // --- Control: prove we know what a "good" batch looks like -------------

  test('sanity: a normal batch starts with BatchMetadata (0x51)', () => {
    const writer = createWriter(onBatch, onOfflineEnd)
    writer.writeMessage([MType.MouseMove, 100, 200])
    writer.finaliseBatch()

    expect(onBatch).toHaveBeenCalledTimes(1)
    const batch: Uint8Array = onBatch.mock.calls[0][0]
    expect(batch[0]).toBe(MType.BatchMetadata) // 81 / 0x51
    expect(firstMessageType(batch)).toBe(MType.BatchMetadata)
  })

  // --- Regression 1: the "success" branch of the buffer-too-small path -----
  //
  // Message is > beaconSize (200kB) but fits in beaconSizeLimit (1MB default).
  // Before the fix, the big encoder's flushed batch lacked BatchMetadata
  // (first byte was 0x16 = ConsoleLog). After the fix, prepare() now writes
  // BatchMetadata to the new encoder and the batch starts with 0x51.

  test('regression (success branch): oversized msg emits a batch WITH BatchMetadata', () => {
    const writer = createWriter(onBatch, onOfflineEnd)

    writer.writeMessage([MType.MouseMove, 1, 2])

    const payload = 'x'.repeat(250_000)
    writer.writeMessage([MType.ConsoleLog, 'info', payload])

    expect(onBatch.mock.calls.length).toBeGreaterThanOrEqual(2)

    const firstBatch: Uint8Array = onBatch.mock.calls[0][0]
    const secondBatch: Uint8Array = onBatch.mock.calls[1][0]

    expect(firstBatch[0]).toBe(MType.BatchMetadata)

    console.log(
      '[regression-1] second batch size:', secondBatch.length,
      'first byte:', `0x${secondBatch[0].toString(16).padStart(2, '0')}`,
      '(decoded type:', firstMessageType(secondBatch) + ')',
    )
    expect(secondBatch[0]).toBe(MType.BatchMetadata)
    expect(firstMessageType(secondBatch)).toBe(MType.BatchMetadata)
  })

  // --- Regression 2: the "warn" branch must not leak a stale prepared flag --
  //
  // Message is > beaconSizeLimit, so the big encoder ALSO can't hold it. Before
  // the fix, prepared stayed true across the final encoder swap, so the next
  // batch began at offset 0 of a fresh encoder with no BatchMetadata — and if
  // the first message written to it was a Timestamp (type 0), the batch's
  // first byte was literally 0x00.
  //
  // After the fix, prepared is reset to false after each encoder swap so the
  // subsequent prepare() call actually writes BatchMetadata.

  test('regression (warn branch): post-warn batch starts with BatchMetadata, not 0x00', () => {
    const writer = createWriter(onBatch, onOfflineEnd)
    writer.setBeaconSizeLimit(100)

    writer.writeMessage([MType.MouseMove, 1, 2])
    const payload = 'x'.repeat(300_000)
    writer.writeMessage([MType.ConsoleLog, 'info', payload])

    onBatch.mockClear()

    writer.writeMessage([MType.Timestamp, 5000])
    writer.writeMessage([MType.MouseMove, 10, 20])
    writer.finaliseBatch()

    expect(onBatch).toHaveBeenCalledTimes(1)
    const batch: Uint8Array = onBatch.mock.calls[0][0]
    console.log(
      '[regression-2] batch size:', batch.length,
      'first bytes:', Array.from(batch.slice(0, 8)).map((b) => `0x${b.toString(16).padStart(2, '0')}`).join(' '),
    )

    expect(batch[0]).toBe(MType.BatchMetadata)
    expect(batch[0]).not.toBe(0x00)
    expect(firstMessageType(batch)).toBe(MType.BatchMetadata)
  })

  // --- Regression 3: same warn branch, first post-warn msg is non-Timestamp.

  test('regression (warn branch): post-warn batch has BatchMetadata header', () => {
    const writer = createWriter(onBatch, onOfflineEnd)
    writer.setBeaconSizeLimit(100)

    writer.writeMessage([MType.MouseMove, 1, 2])
    const payload = 'x'.repeat(300_000)
    writer.writeMessage([MType.ConsoleLog, 'info', payload])

    onBatch.mockClear()

    writer.writeMessage([MType.MouseMove, 10, 20])
    writer.finaliseBatch()

    expect(onBatch).toHaveBeenCalledTimes(1)
    const batch: Uint8Array = onBatch.mock.calls[0][0]
    console.log(
      '[regression-3] batch size:', batch.length,
      'first byte:', `0x${batch[0].toString(16).padStart(2, '0')}`,
      '(decoded type:', firstMessageType(batch) + ')',
    )
    expect(batch[0]).toBe(MType.BatchMetadata)
  })

  // --- Regression 4: two consecutive flushes after a warn both carry
  // BatchMetadata, not just the second one.

  test('regression (warn branch): both flushes after warn carry BatchMetadata', () => {
    const writer = createWriter(onBatch, onOfflineEnd)
    writer.setBeaconSizeLimit(100)

    writer.writeMessage([MType.MouseMove, 1, 2])
    writer.writeMessage([MType.ConsoleLog, 'info', 'x'.repeat(300_000)])

    onBatch.mockClear()

    writer.writeMessage([MType.MouseMove, 10, 20])
    writer.finaliseBatch()
    writer.writeMessage([MType.MouseMove, 30, 40])
    writer.finaliseBatch()

    expect(onBatch).toHaveBeenCalledTimes(2)
    const first: Uint8Array = onBatch.mock.calls[0][0]
    const second: Uint8Array = onBatch.mock.calls[1][0]
    console.log(
      '[regression-4] batch #1 first byte:', `0x${first[0].toString(16).padStart(2, '0')}`,
      '  batch #2 first byte:', `0x${second[0].toString(16).padStart(2, '0')}`,
    )

    expect(first[0]).toBe(MType.BatchMetadata)
    expect(second[0]).toBe(MType.BatchMetadata)
  })

  // --- Regression 5 (new design): every emitted batch carries the full
  // [BatchMetadata, Timestamp, TabData] prelude — including the warn-branch
  // and oversized-message paths.

  test('every batch (normal + warn branch + oversized) carries the full prelude', () => {
    const writer = createWriter(onBatch, onOfflineEnd)

    writer.writeMessage([MType.MouseMove, 1, 2])
    writer.writeMessage([MType.MouseMove, 3, 4])
    writer.finaliseBatch() // batch 0: normal

    writer.writeMessage([MType.MouseMove, 5, 6])
    // Force the soft-budget-overflow path with a large message that still fits beaconSizeLimit.
    writer.writeMessage([MType.ConsoleLog, 'info', 'x'.repeat(250_000)])
    // batches 1 + 2 emitted: pre-overflow flush + oversized one-shot

    writer.writeMessage([MType.MouseMove, 7, 8])
    writer.finaliseBatch() // batch 3

    expect(onBatch.mock.calls.length).toBeGreaterThanOrEqual(3)
    for (let i = 0; i < onBatch.mock.calls.length; i++) {
      const batch: Uint8Array = onBatch.mock.calls[i][0]
      expect(batch[0]).toBe(MType.BatchMetadata)
      expectPrelude(batch)
    }
  })

  // --- Regression 6: hammering the warn branch many times in a row never
  // produces a header-less batch.

  test('warn branch hammered repeatedly: every batch starts with BatchMetadata', () => {
    const writer = createWriter(onBatch, onOfflineEnd)
    writer.setBeaconSizeLimit(100) // forces every push to fall into warn branch

    for (let n = 0; n < 30; n++) {
      writer.writeMessage([MType.MouseMove, n, n])
      writer.writeMessage([MType.ConsoleLog, 'info', 'x'.repeat(300_000)])
      writer.writeMessage([MType.MouseMove, n + 1, n + 2])
      writer.finaliseBatch()
    }

    for (let i = 0; i < onBatch.mock.calls.length; i++) {
      const batch: Uint8Array = onBatch.mock.calls[i][0]
      expect(batch[0]).toBe(MType.BatchMetadata)
    }
  })
})
