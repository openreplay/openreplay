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

  describe('protocol v2: pair flush (player + assets as one "visual" emission)', () => {
    test('player + assets in one finalise emit as a single "visual" batch with split offset', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'class', 'value', 'http://base.com'])
      writer.finaliseBatch()

      expect(onBatch).toHaveBeenCalledTimes(1)
      const [batch, , dataType, split] = onBatch.mock.calls[0]
      expect(dataType).toBe('visual')
      // split points at the byte where the asset sub-batch begins inside the
      // concatenated payload. Must land on a BatchMetadata header.
      expect(typeof split).toBe('number')
      expect(split).toBeGreaterThan(0)
      expect(split).toBeLessThan(batch.length)
      expect(batch[0]).toBe(MType.BatchMetadata)             // player sub-batch
      expect(batch[split]).toBe(MType.BatchMetadata)         // asset sub-batch
    })

    test('asset-only finalise emits with native dataType=assets and no split', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'src', 'img.png', 'http://base.com'])
      writer.writeMessage([MType.SetCSSDataURLBased, 2, 'background', 'http://base.com'])
      writer.finaliseBatch()

      expect(onBatch).toHaveBeenCalledTimes(1)
      expect(onBatch.mock.calls[0][2]).toBe('assets')
      expect(onBatch.mock.calls[0][3]).toBeUndefined()
    })

    test('player-only finalise in v2 emits with native dataType=player and no split', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.finaliseBatch()

      expect(onBatch).toHaveBeenCalledTimes(1)
      expect(onBatch.mock.calls[0][2]).toBe('player')
      expect(onBatch.mock.calls[0][3]).toBeUndefined()
    })

    test('asset-only batch starts with BatchMetadata version=3', () => {
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

    // Soft-cap behaviour: pair budget is shared between player and assets and
    // the warmup cap (60kB) is in effect for the first 5s of a fresh writer.
    // When the shared cap trips, both builders flush together as one 'visual'.
    test('pair soft-cap flush concatenates player and assets into one "visual" batch', () => {
      const writer = createWriter({ protocolVersion: 2 })
      // Player msg sits in playerBuilder, hasn't been flushed yet.
      writer.writeMessage([MType.MouseMove, 100, 200])
      // Asset msg pushes shared pair total past the warmup soft cap (60kB).
      writer.writeMessage([MType.SetCSSDataURLBased, 1, 'x'.repeat(80_000), 'http://b.com'])
      // Next message must trigger a pair flush (combined > 60kB).
      writer.writeMessage([MType.MouseMove, 110, 210])

      expect(onBatch).toHaveBeenCalledTimes(1)
      const [batch, , dataType, split] = onBatch.mock.calls[0]
      expect(dataType).toBe('visual')
      expect(typeof split).toBe('number')
      expect(batch[0]).toBe(MType.BatchMetadata)
      expect(batch[split]).toBe(MType.BatchMetadata)
    })

    test('large asset (over soft cap) + pending player finalise as one "visual" batch with split', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.MouseMove, 100, 200])
      // Asset msg larger than the soft cap (60kB warmup) but small enough to fit
      // in the pair builder buffer so it bundles into one emission rather than
      // triggering the one-shot oversized path.
      writer.writeMessage([MType.SetCSSDataURLBased, 1, 'z'.repeat(150_000), 'http://b.com'])
      writer.finaliseBatch()

      expect(onBatch).toHaveBeenCalledTimes(1)
      const [batch, , dataType, split] = onBatch.mock.calls[0]
      expect(dataType).toBe('visual')
      expect(typeof split).toBe('number')
      expect(split).toBeGreaterThan(0)
      expect(split).toBeLessThan(batch.length)
      expect(batch[0]).toBe(MType.BatchMetadata)
      expect(batch[split]).toBe(MType.BatchMetadata)
    })

    test('oversized asset-only one-shot emits with native dataType=assets', () => {
      const writer = createWriter({ protocolVersion: 2 })
      // No player content — a 250kB asset exceeds the pair builder buffer
      // (200kB) and goes through the one-shot oversized path.
      writer.writeMessage([MType.SetCSSDataURLBased, 1, 'z'.repeat(250_000), 'http://b.com'])
      writer.finaliseBatch()

      expect(onBatch).toHaveBeenCalledTimes(1)
      expect(onBatch.mock.calls[0][2]).toBe('assets')
      expect(onBatch.mock.calls[0][3]).toBeUndefined()
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

    test('interleaved player and asset content across multiple finalizes (v2)', () => {
      const writer = createWriter({ protocolVersion: 2 })

      // First finalise: player + assets → "visual" batch with split.
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'src', 'a.png', 'http://b.com'])
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(1)
      expect(onBatch.mock.calls[0][2]).toBe('visual')
      expect(typeof onBatch.mock.calls[0][3]).toBe('number')

      // Second finalise: only player → native "player" label, no split.
      writer.writeMessage([MType.MouseMove, 120, 220])
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(2)
      expect(onBatch.mock.calls[1][2]).toBe('player')
      expect(onBatch.mock.calls[1][3]).toBeUndefined()

      // Third finalise: only assets → native "assets" label, no split.
      writer.writeMessage([MType.SetCSSDataURLBased, 2, 'bg', 'http://c.com'])
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(3)
      expect(onBatch.mock.calls[2][2]).toBe('assets')
      expect(onBatch.mock.calls[2][3]).toBeUndefined()
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

  // ── Pair shared soft cap & warmup→steady transition ──────────────────────
  // The pair has a smaller soft cap during a 5s warmup window (so keepalive:
  // true is usable for early-session batches) and raises to the steady cap
  // after. These tests pin the boundary numerically.
  describe('pair soft cap: warmup vs steady', () => {
    beforeEach(() => { jest.useFakeTimers() })
    afterEach(() => { jest.useRealTimers() })

    test('warmup soft cap triggers a pair flush around ~60kB of pending content', () => {
      const writer = createWriter({ protocolVersion: 2 })
      // First push lands ~70kB of asset bytes (above warmup cap, below steady).
      writer.writeMessage([MType.SetCSSDataURLBased, 1, 'x'.repeat(70_000), 'http://b.com'])
      // pairSize is now ~70kB but the soft-cap check runs *before* push, so
      // no flush has happened yet. A subsequent push observes pairSize >= 60kB
      // and triggers flushPair() before adding the new message.
      expect(onBatch).not.toHaveBeenCalled()
      writer.writeMessage([MType.MouseMove, 1, 1])
      expect(onBatch).toHaveBeenCalledTimes(1)
      // 70kB of single-stream asset → emits as 'assets', not 'visual'.
      expect(onBatch.mock.calls[0][2]).toBe('assets')
    })

    test('steady soft cap (after 5s) does NOT flush at ~70kB; finalise emits once', () => {
      const writer = createWriter({ protocolVersion: 2 })
      // Cross the 5s warmup boundary before any writes.
      jest.advanceTimersByTime(5500)

      writer.writeMessage([MType.SetCSSDataURLBased, 1, 'x'.repeat(70_000), 'http://b.com'])
      writer.writeMessage([MType.MouseMove, 1, 1])
      // 70kB is below steady cap (100kB) → no auto-flush.
      expect(onBatch).not.toHaveBeenCalled()
      writer.finaliseBatch()
      // Both streams have content → one 'visual' with split.
      expect(onBatch).toHaveBeenCalledTimes(1)
      expect(onBatch.mock.calls[0][2]).toBe('visual')
      expect(typeof onBatch.mock.calls[0][3]).toBe('number')
    })

    test('clean() before warmup expiry cancels the warmup timer (no late cap flip)', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.clean()
      // If the warmup timer wasn't cleared, advancing time could fire it and
      // mutate a now-cleaned writer's internal state. We only need to assert
      // that nothing throws and no spurious emissions occur.
      expect(() => jest.advanceTimersByTime(10_000)).not.toThrow()
      writer.finaliseBatch()
      expect(onBatch).not.toHaveBeenCalled()
    })
  })

  // ── split offset semantics ────────────────────────────────────────────────
  // When the pair carries both player and asset content, the emitted bytes
  // are exactly playerBytes followed by assetBytes, and split equals the
  // length of the player half. Server demux relies on this invariant.
  describe('split offset semantics (v2)', () => {
    test('split equals byte length of the player sub-batch (asset BatchMetadata at split)', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.MouseMove, 11, 22])
      writer.writeMessage([MType.MouseMove, 33, 44])
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'src', 'a.png', 'http://b.com'])
      writer.writeMessage([MType.SetCSSDataURLBased, 2, 'bg', 'http://b.com'])
      writer.finaliseBatch()

      expect(onBatch).toHaveBeenCalledTimes(1)
      const [batch, , dataType, split] = onBatch.mock.calls[0]
      expect(dataType).toBe('visual')
      expect(typeof split).toBe('number')
      // Player sub-batch is at [0, split); asset sub-batch is at [split, end).
      // Both must start with BatchMetadata.
      expect(batch[0]).toBe(MType.BatchMetadata)
      expect(batch[split]).toBe(MType.BatchMetadata)
      // Player BatchMetadata has version=2 (protocolVersion=2 player stream).
      expect(batch[1]).toBe(2)
      // Asset BatchMetadata has version=3 (ASSETS_VERSION).
      expect(batch[split + 1]).toBe(3)
    })

    test('a single-side flush has no split parameter', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.MouseMove, 11, 22])
      writer.finaliseBatch()
      expect(onBatch.mock.calls[0][3]).toBeUndefined()
    })
  })

  // ── v1 backward compat: pair logic does NOT fire ──────────────────────────
  // In v1, the asset builder is never written to; flushPair should just emit
  // playerBuilder content with the native 'player' dataType so the existing
  // backend path keeps working unchanged.
  describe('v1 backward compat: pair logic stays inert', () => {
    test('v1 finalise emits as "player" even with asset-typed messages routed to playerBuilder', () => {
      const writer = createWriter({ protocolVersion: 1 })
      writer.writeMessage([MType.MouseMove, 1, 1])
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'src', 'a.png', 'http://b.com'])
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(1)
      expect(onBatch.mock.calls[0][2]).toBe('player')
      expect(onBatch.mock.calls[0][3]).toBeUndefined()
    })
  })
})
