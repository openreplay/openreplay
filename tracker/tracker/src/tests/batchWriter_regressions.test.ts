// @ts-nocheck
// Every batch leads with its own BatchMetadata and [Timestamp, TabData] prelude,
// on the oversized one-shot and the dropped-message paths too.
import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals'

// Minimal mock. Keep ASSET/DEVTOOLS/ANALYTICS sets empty so every message
// flows through the regular writeWithSize path regardless of protocolVersion.
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

import BatchWriter from '../webworker/BatchWriter.js'
import { expectNoRepair, parseBatch } from './batchTestKit.js'

const MType = {
  Timestamp: 0,
  MouseMove: 20,
  ConsoleLog: 22,
  BatchMetadata: 81,
  TabData: 118,
} as const

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

describe('BatchWriter: header on every emit path', () => {
  let onBatch: jest.Mock
  let onOfflineEnd: jest.Mock
  let warn: any

  beforeEach(() => {
    onBatch = jest.fn()
    onOfflineEnd = jest.fn()
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    try {
      expectNoRepair(warn)
    } finally {
      warn.mockRestore()
    }
  })

  const PRELUDE = [MType.Timestamp, MType.TabData]

  test('oversized msg (soft < size < hard) goes out as its own batch with a full header', () => {
    const writer = createWriter(onBatch, onOfflineEnd)
    writer.writeMessage([MType.MouseMove, 1, 2])
    writer.writeMessage([MType.ConsoleLog, 'info', 'x'.repeat(250_000)])

    expect(onBatch).toHaveBeenCalledTimes(2)
    const [first, second] = onBatch.mock.calls.map((c) => parseBatch(c[0]))
    expect(first.types).toEqual([...PRELUDE, MType.MouseMove])
    expect(second.types).toEqual([...PRELUDE, MType.ConsoleLog])
    expect(second.firstIndex).toBe(1)
  })

  test('a message over the hard cap is dropped; the batches after it keep their header', () => {
    const writer = createWriter(onBatch, onOfflineEnd)
    writer.setBeaconSizeLimit(100)
    const huge = [MType.ConsoleLog, 'info', 'x'.repeat(300_000)]

    for (let n = 0; n < 5; n++) {
      writer.writeMessage([MType.MouseMove, n, n])
      writer.writeMessage(huge)
      writer.writeMessage([MType.Timestamp, 5000 + n])
      writer.writeMessage([MType.MouseMove, n + 1, n + 2])
      writer.finaliseBatch()
    }

    expect(warn).toHaveBeenCalledWith('OpenReplay: beacon size overflow. Skipping large message.', huge)
    // Per round: the pre-overflow flush, then the post-drop batch.
    expect(onBatch).toHaveBeenCalledTimes(10)
    const parsed = onBatch.mock.calls.map((c) => parseBatch(c[0]))
    parsed.forEach((p, i) => {
      expect(p.metas).toBe(1)
      expect(p.types.slice(0, 2)).toEqual(PRELUDE)
      expect(p.types.slice(2)).toEqual(i % 2 === 0 ? [MType.MouseMove] : [MType.Timestamp, MType.MouseMove])
    })
  })

  test('normal + oversized + trailing batches all carry the full prelude', () => {
    const writer = createWriter(onBatch, onOfflineEnd)
    writer.writeMessage([MType.MouseMove, 1, 2])
    writer.writeMessage([MType.MouseMove, 3, 4])
    writer.finaliseBatch()
    writer.writeMessage([MType.MouseMove, 5, 6])
    writer.writeMessage([MType.ConsoleLog, 'info', 'x'.repeat(250_000)])
    writer.writeMessage([MType.MouseMove, 7, 8])
    writer.finaliseBatch()

    expect(onBatch.mock.calls.map((c) => parseBatch(c[0]).types)).toEqual([
      [...PRELUDE, MType.MouseMove, MType.MouseMove],
      [...PRELUDE, MType.MouseMove],
      [...PRELUDE, MType.ConsoleLog],
      [...PRELUDE, MType.MouseMove],
    ])
  })
})
