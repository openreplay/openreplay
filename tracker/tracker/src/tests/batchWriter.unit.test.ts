// @ts-nocheck
import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals'

// Mock the generated messages module since its .js is ESM-only
jest.mock('../common/messages.gen', () => {
  const Type = {
    Timestamp: 0,
    SetViewportSize: 5,
    MouseMove: 20,
    SetPageVisibility: 55,
    SetNodeAttributeURLBased: 60,
    SetCSSDataURLBased: 61,
    AdoptedSSReplaceURLBased: 71,
    AdoptedSSInsertRuleURLBased: 73,
    BatchMetadata: 81,
    TabData: 118,
    SetPageLocation: 122,
  }
  return {
    __esModule: true,
    default: null,
    Type,
    ASSET_MESSAGES: new Set([60, 61, 71, 73]),
    DEVTOOLS_MESSAGES: new Set([21, 22, 40, 41, 44, 45, 46, 47, 48, 79, 83, 84, 85, 87, 89, 116, 120, 121, 123]),
    ANALYTICS_MESSAGES: new Set([17, 23, 24, 27, 28, 29, 30, 42, 63, 64, 78, 112, 115, 124]),
  }
})

import BatchWriter from '../webworker/BatchWriter.js'
import * as Messages from '../common/messages.gen.js'
import Message from '../common/messages.gen.js'

const MType = {
  Timestamp: 0,
  BatchMetadata: 81,
  TabData: 118,
  MouseMove: 20,
  SetPageLocation: 122,
  SetNodeAttributeURLBased: 60,
  SetCSSDataURLBased: 61,
} as const

describe('BatchWriter', () => {
  let onBatch: jest.Mock
  let onOfflineEnd: jest.Mock
  let onLocalSave: jest.Mock

  beforeEach(() => {
    onBatch = jest.fn()
    onOfflineEnd = jest.fn()
    onLocalSave = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  function createWriter(opts: { protocolVersion?: number; localDebug?: boolean } = {}) {
    const writer = new BatchWriter(
      1,
      1000,
      'http://test.com',
      onBatch,
      'tab-1',
      onOfflineEnd,
      opts.localDebug ?? false,
      onLocalSave,
    )
    if (opts.protocolVersion) {
      writer.setProtocolVersion(opts.protocolVersion)
    }
    return writer
  }

  describe('construction and configuration', () => {
    test('constructor accepts the required arguments without throwing', () => {
      expect(() => createWriter()).not.toThrow()
    })

    test('setBeaconSizeLimit does not affect a normal-sized batch', () => {
      const writer = createWriter()
      writer.setBeaconSizeLimit(500000)
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(1)
    })
  })

  describe('emission policy', () => {
    test('finaliseBatch with no messages does nothing', () => {
      const writer = createWriter()
      writer.finaliseBatch()
      expect(onBatch).not.toHaveBeenCalled()
    })

    test('finaliseBatch after multiple calls with no messages still does nothing', () => {
      const writer = createWriter()
      writer.finaliseBatch()
      writer.finaliseBatch()
      writer.finaliseBatch()
      expect(onBatch).not.toHaveBeenCalled()
    })

    test('timestamp-only messages do not trigger a batch send', () => {
      const writer = createWriter()
      writer.writeMessage([MType.Timestamp, 2000])
      writer.finaliseBatch()
      expect(onBatch).not.toHaveBeenCalled()
    })
  })

  describe('single BatchMetadata per batch', () => {
    test('writing a real message and finalising produces exactly one batch', () => {
      const writer = createWriter()
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(1)
      const [batch, , dataType] = onBatch.mock.calls[0]
      expect(batch).toBeInstanceOf(Uint8Array)
      expect(dataType).toBe('player')
    })

    test('consecutive finaliseBatch after flush does not produce extra batches', () => {
      const writer = createWriter()
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.finaliseBatch()
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(1)
    })

    test('batch binary starts with BatchMetadata type marker', () => {
      const writer = createWriter()
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.finaliseBatch()
      const batch: Uint8Array = onBatch.mock.calls[0][0]
      expect(batch[0]).toBe(MType.BatchMetadata)
    })

    test('batch contains exactly one BatchMetadata (single onBatch call)', () => {
      const writer = createWriter()
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.writeMessage([MType.MouseMove, 110, 210])
      writer.writeMessage([MType.MouseMove, 120, 220])
      writer.finaliseBatch()

      const batch: Uint8Array = onBatch.mock.calls[0][0]
      expect(batch[0]).toBe(MType.BatchMetadata)
      expect(onBatch).toHaveBeenCalledTimes(1)
    })

    test('finaliseBatch emits the player batch via onBatch', () => {
      const writer = createWriter()
      writer.writeMessage([MType.MouseMove, 100, 200] as Message)
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(1)
      expect(onBatch.mock.calls[0][2]).toBe('player')
      const batch: Uint8Array = onBatch.mock.calls[0][0]
      expect(batch[0]).toBe(MType.BatchMetadata)
    })

    test('finaliseBatch does nothing when no messages written', () => {
      const writer = createWriter()
      writer.finaliseBatch()
      expect(onBatch).not.toHaveBeenCalled()
    })
  })

  describe('protocol v2: asset message separation', () => {
    test('asset messages produce a separate batch with dataType=assets', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'class', 'value', 'http://base.com'])
      writer.finaliseBatch()

      expect(onBatch).toHaveBeenCalledTimes(2)
      expect(onBatch.mock.calls[0][2]).toBe('player')
      expect(onBatch.mock.calls[1][2]).toBe('assets')
    })

    test('asset-only batch (no regular messages) sends only assets', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'src', 'img.png', 'http://base.com'])
      writer.writeMessage([MType.SetCSSDataURLBased, 2, 'background', 'http://base.com'])
      writer.finaliseBatch()

      expect(onBatch).toHaveBeenCalledTimes(1)
      expect(onBatch.mock.calls[0][2]).toBe('assets')
    })

    test('asset batch starts with BatchMetadata version=3', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'src', 'img.png', 'http://base.com'])
      writer.finaliseBatch()

      const assetBatch: Uint8Array = onBatch.mock.calls[0][0]
      expect(assetBatch[0]).toBe(MType.BatchMetadata)
      expect(assetBatch[1]).toBe(3)
    })

    test('regular batch has version=2 when protocolVersion=2', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.finaliseBatch()

      const batch: Uint8Array = onBatch.mock.calls[0][0]
      expect(batch[0]).toBe(MType.BatchMetadata)
      expect(batch[1]).toBe(2)
    })

    test('no regular messages + no asset messages = no batch', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.finaliseBatch()
      expect(onBatch).not.toHaveBeenCalled()
    })

    test('asset messages are cleared after finaliseBatch', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'src', 'img.png', 'http://base.com'])
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(1)

      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(1)
    })

    // Pair-flush ordering: when assetBuilder is about to emit (soft-cap or
    // oversized one-shot), playerBuilder must be flushed first so the DOM
    // tree always lands before the assets that reference it.
    test('asset soft-cap flush emits playerBuilder first', () => {
      const writer = createWriter({ protocolVersion: 2 })
      // Player msg sits in playerBuilder, hasn't been flushed yet.
      writer.writeMessage([MType.MouseMove, 100, 200])
      // First asset msg fits under the 200kB soft cap.
      writer.writeMessage([MType.SetCSSDataURLBased, 1, 'x'.repeat(150_000), 'http://b.com'])
      // Second asset msg pushes total past the soft cap and triggers a flush.
      writer.writeMessage([MType.SetCSSDataURLBased, 2, 'y'.repeat(80_000), 'http://b.com'])

      expect(onBatch).toHaveBeenCalledTimes(2)
      expect(onBatch.mock.calls[0][2]).toBe('player')
      expect(onBatch.mock.calls[1][2]).toBe('assets')

      writer.finaliseBatch()
      // Trailing asset (second large msg) lands on finalise.
      expect(onBatch).toHaveBeenCalledTimes(3)
      expect(onBatch.mock.calls[2][2]).toBe('assets')
    })

    test('oversized asset one-shot emits playerBuilder first', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.MouseMove, 100, 200])
      // Single asset msg larger than the soft cap (200kB) but under the hard
      // cap (1MB) — goes through the oversized one-shot path.
      writer.writeMessage([MType.SetCSSDataURLBased, 1, 'z'.repeat(250_000), 'http://b.com'])

      expect(onBatch).toHaveBeenCalledTimes(2)
      expect(onBatch.mock.calls[0][2]).toBe('player')
      expect(onBatch.mock.calls[1][2]).toBe('assets')
    })

    test('asset overflow with empty playerBuilder emits only the asset batch', () => {
      const writer = createWriter({ protocolVersion: 2 })
      // No player messages — playerBuilder is empty when assetBuilder overflows.
      writer.writeMessage([MType.SetCSSDataURLBased, 1, 'z'.repeat(250_000), 'http://b.com'])

      expect(onBatch).toHaveBeenCalledTimes(1)
      expect(onBatch.mock.calls[0][2]).toBe('assets')
    })
  })

  describe('protocol v1: asset messages are regular', () => {
    test('asset-type messages go into regular batch in v1', () => {
      const writer = createWriter({ protocolVersion: 1 })
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'src', 'img.png', 'http://base.com'])
      writer.finaliseBatch()

      expect(onBatch).toHaveBeenCalledTimes(1)
      expect(onBatch.mock.calls[0][2]).toBe('player')
    })
  })

  describe('multiple batches maintain correct state', () => {
    test('second batch after first finalize works correctly', () => {
      const writer = createWriter()
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.finaliseBatch()

      writer.writeMessage([MType.MouseMove, 110, 210])
      writer.finaliseBatch()

      expect(onBatch).toHaveBeenCalledTimes(2)
      for (let i = 0; i < 2; i++) {
        const batch: Uint8Array = onBatch.mock.calls[i][0]
        expect(batch[0]).toBe(MType.BatchMetadata)
        expect(onBatch.mock.calls[i][2]).toBe('player')
      }
    })

    test('interleaved regular and asset batches across multiple finalizes', () => {
      const writer = createWriter({ protocolVersion: 2 })

      // First batch: regular + assets
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'src', 'a.png', 'http://b.com'])
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(2)

      // Second batch: only regular
      writer.writeMessage([MType.MouseMove, 120, 220])
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(3)
      expect(onBatch.mock.calls[2][2]).toBe('player')

      // Third batch: only assets
      writer.writeMessage([MType.SetCSSDataURLBased, 2, 'bg', 'http://c.com'])
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(4)
      expect(onBatch.mock.calls[3][2]).toBe('assets')
    })
  })

  describe('clean()', () => {
    test('clean resets all state, next finalize produces nothing', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'src', 'a.png', 'http://b.com'])
      writer.clean()
      writer.finaliseBatch()
      expect(onBatch).not.toHaveBeenCalled()
    })

    test('clean discards in-progress regular content; subsequent finalise emits nothing', () => {
      const writer = createWriter()
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.clean()
      writer.finaliseBatch()
      expect(onBatch).not.toHaveBeenCalled()
    })
  })
})
