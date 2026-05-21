// @ts-nocheck
/**
 * End-to-end coverage of BatchWriter: feeds it ~50–60 mixed-type messages,
 * inspects the resulting onBatch dispatches, and verifies that
 *   1. messages are routed to their correct stream and emitted as proper batches
 *   2. every batch carries [BatchMetadata, Timestamp, TabData] at byte 0
 *   3. soft (200kB) and hard (beaconSizeLimit) budgets are enforced
 */
import { describe, expect, test, jest } from '@jest/globals'

jest.mock('../common/messages.gen', () => {
  const Type = {
    Timestamp: 0,
    SetViewportSize: 5,
    MouseMove: 20,
    ConsoleLog: 22,                  // devtools
    CustomEvent: 27,                 // analytics
    SetPageVisibility: 55,
    SetNodeAttributeURLBased: 60,    // assets
    SetCSSDataURLBased: 61,          // assets
    AdoptedSSReplaceURLBased: 71,    // assets
    AdoptedSSInsertRuleURLBased: 73, // assets
    BatchMetadata: 81,
    TabData: 118,
    SetPageLocation: 122,
  }
  return {
    __esModule: true,
    default: null,
    Type,
    ASSET_MESSAGES: new Set([60, 61, 71, 73]),
    DEVTOOLS_MESSAGES: new Set([22]),
    ANALYTICS_MESSAGES: new Set([27]),
  }
})

import BatchWriter from '../webworker/BatchWriter.js'

const T = {
  Timestamp: 0,
  MouseMove: 20,
  ConsoleLog: 22,
  CustomEvent: 27,
  SetNodeAttributeURLBased: 60,
  SetCSSDataURLBased: 61,
  BatchMetadata: 81,
  TabData: 118,
} as const

const VERSION_PLAYER_V2 = 2
const VERSION_ASSETS = 3
const VERSION_DEVTOOLS = 4
const VERSION_ANALYTICS = 5

// ── varint helpers ─────────────────────────────────────────────────────────
function readUVarint(bytes: Uint8Array, start = 0): [number, number] {
  let val = 0
  let shift = 0
  let i = start
  while (i < bytes.length) {
    const b = bytes[i++]
    val += (b & 0x7f) * Math.pow(2, shift)
    if ((b & 0x80) === 0) return [val, i - start]
    shift += 7
  }
  throw new Error('truncated varint')
}

function readZigZagInt(bytes: Uint8Array, start = 0): [number, number] {
  const [u, n] = readUVarint(bytes, start)
  // Decoder is irrelevant — we just need to skip the right number of bytes.
  return [u % 2 === 0 ? u / 2 : -(u + 1) / 2, n]
}

interface ParsedHeader {
  version: number
  pageNo: number
  firstIndex: number
  timestamp: number
  urlLen: number
  bodyOffset: number
}

function parseBatchHeader(batch: Uint8Array): ParsedHeader {
  let i = 0
  const [type, t1] = readUVarint(batch, i); i += t1
  if (type !== T.BatchMetadata) throw new Error(`expected BatchMetadata at byte 0, got ${type}`)
  const [version, t2] = readUVarint(batch, i); i += t2
  const [pageNo, t3] = readUVarint(batch, i); i += t3
  const [firstIndex, t4] = readUVarint(batch, i); i += t4
  const [timestamp, t5] = readZigZagInt(batch, i); i += t5
  const [urlLen, t6] = readUVarint(batch, i); i += t6
  i += urlLen // skip url bytes — we don't need to decode them in tests
  return { version, pageNo, firstIndex, timestamp, urlLen, bodyOffset: i }
}

interface ParsedMessage {
  type: number
  size: number
  payloadOffset: number
}

/** Walks the body (after the BatchMetadata fields) and returns each
 *  [type][size:3LE][payload] segment. */
function parseBody(batch: Uint8Array, startOffset: number): ParsedMessage[] {
  const out: ParsedMessage[] = []
  let i = startOffset
  while (i < batch.length) {
    const [type, tlen] = readUVarint(batch, i); i += tlen
    const size = batch[i] | (batch[i + 1] << 8) | (batch[i + 2] << 16); i += 3
    out.push({ type, size, payloadOffset: i })
    i += size
  }
  return out
}

/** Asserts every batch starts with [BatchMetadata, Timestamp, TabData]. */
function assertPrelude(batch: Uint8Array): ParsedHeader {
  const header = parseBatchHeader(batch)
  const body = parseBody(batch, header.bodyOffset)
  expect(body[0]?.type).toBe(T.Timestamp)
  expect(body[1]?.type).toBe(T.TabData)
  return header
}

// ── Test harness ───────────────────────────────────────────────────────────
interface CapturedBatch {
  batch: Uint8Array
  skipCompression: boolean
  dataType: 'player' | 'assets' | 'devtools' | 'analytics'
}

let onBatch: jest.Mock
let onOfflineEnd: jest.Mock
let captured: CapturedBatch[]

function makeWriter(opts: { protocolVersion?: number; beaconSizeLimit?: number } = {}) {
  captured = []
  onBatch = jest.fn((batch: Uint8Array, skipCompression: boolean | undefined, dataType: any) => {
    captured.push({ batch, skipCompression: !!skipCompression, dataType })
  })
  onOfflineEnd = jest.fn()
  const writer = new BatchWriter(
    /* pageNo */ 7,
    /* timestamp */ 1_000_000,
    /* url */ 'http://example.com/start',
    onBatch,
    /* tabId */ 'tab-XYZ',
    onOfflineEnd,
  )
  if (opts.protocolVersion) writer.setProtocolVersion(opts.protocolVersion)
  if (opts.beaconSizeLimit !== undefined) writer.setBeaconSizeLimit(opts.beaconSizeLimit)
  return writer
}

function batchesByType(type: CapturedBatch['dataType']): CapturedBatch[] {
  return captured.filter((c) => c.dataType === type)
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('BatchWriter e2e', () => {
  test('mixed 56-message stream routes correctly across all 4 streams (protocol v2)', () => {
    const writer = makeWriter({ protocolVersion: 2 })

    // Build a deterministic mixed stream interleaved across all 4 types.
    // We drive Timestamps the way _nCommit would: prepend per "tick".
    let tick = 0
    const nextTs = () => 1_000_000 + (tick += 50)

    const pushTick = () => {
      writer.writeMessage([T.Timestamp, nextTs()])
      writer.writeMessage([T.TabData, 'tab-XYZ'])
    }

    pushTick()
    // 20 player messages
    for (let i = 0; i < 20; i++) {
      writer.writeMessage([T.MouseMove, i * 10, i * 5])
    }
    pushTick()
    // 10 asset messages
    for (let i = 0; i < 10; i++) {
      writer.writeMessage([T.SetNodeAttributeURLBased, i, 'src', `img-${i}.png`, 'http://cdn.example.com'])
    }
    // 10 devtools messages (ConsoleLog)
    for (let i = 0; i < 10; i++) {
      writer.writeMessage([T.ConsoleLog, 'info', `log line ${i}`])
    }
    pushTick()
    // 10 analytics messages
    for (let i = 0; i < 10; i++) {
      writer.writeMessage([T.CustomEvent, `event-${i}`, '{}'])
    }
    // 4 more player messages so we end on player too
    for (let i = 0; i < 4; i++) {
      writer.writeMessage([T.MouseMove, 999, i])
    }

    writer.finaliseBatch()

    // 4 onBatch calls — one per stream type
    expect(onBatch).toHaveBeenCalledTimes(4)
    expect(batchesByType('player')).toHaveLength(1)
    expect(batchesByType('assets')).toHaveLength(1)
    expect(batchesByType('devtools')).toHaveLength(1)
    expect(batchesByType('analytics')).toHaveLength(1)

    // ── invariants for every emitted batch ─────────────────────────────────
    for (const c of captured) {
      const header = assertPrelude(c.batch)
      // page number propagated
      expect(header.pageNo).toBe(7)
      // url length matches the literal string we configured
      expect(header.urlLen).toBe('http://example.com/start'.length)
    }

    // ── per-stream version and routing ─────────────────────────────────────
    expect(parseBatchHeader(batchesByType('player')[0].batch).version).toBe(VERSION_PLAYER_V2)
    expect(parseBatchHeader(batchesByType('assets')[0].batch).version).toBe(VERSION_ASSETS)
    expect(parseBatchHeader(batchesByType('devtools')[0].batch).version).toBe(VERSION_DEVTOOLS)
    expect(parseBatchHeader(batchesByType('analytics')[0].batch).version).toBe(VERSION_ANALYTICS)

    // ── content routing ────────────────────────────────────────────────────
    const playerBody = parseBody(
      batchesByType('player')[0].batch,
      parseBatchHeader(batchesByType('player')[0].batch).bodyOffset,
    )
    const assetBody = parseBody(
      batchesByType('assets')[0].batch,
      parseBatchHeader(batchesByType('assets')[0].batch).bodyOffset,
    )
    const devtoolsBody = parseBody(
      batchesByType('devtools')[0].batch,
      parseBatchHeader(batchesByType('devtools')[0].batch).bodyOffset,
    )
    const analyticsBody = parseBody(
      batchesByType('analytics')[0].batch,
      parseBatchHeader(batchesByType('analytics')[0].batch).bodyOffset,
    )

    // Player batch contains MouseMove + caller-pushed Timestamp/TabData; no asset/devtools/analytics types.
    const playerTypes = new Set(playerBody.map((m) => m.type))
    expect(playerTypes.has(T.MouseMove)).toBe(true)
    expect(playerTypes.has(T.SetNodeAttributeURLBased)).toBe(false)
    expect(playerTypes.has(T.ConsoleLog)).toBe(false)
    expect(playerTypes.has(T.CustomEvent)).toBe(false)

    // Asset batch contains SetNodeAttributeURLBased only (plus prelude Timestamps).
    const assetNonTs = assetBody.filter((m) => m.type !== T.Timestamp && m.type !== T.TabData)
    expect(assetNonTs.length).toBe(10)
    expect(assetNonTs.every((m) => m.type === T.SetNodeAttributeURLBased)).toBe(true)

    // Devtools batch contains ConsoleLog only.
    const devtoolsNonTs = devtoolsBody.filter((m) => m.type !== T.Timestamp && m.type !== T.TabData)
    expect(devtoolsNonTs.length).toBe(10)
    expect(devtoolsNonTs.every((m) => m.type === T.ConsoleLog)).toBe(true)

    // Analytics batch contains CustomEvent only.
    const analyticsNonTs = analyticsBody.filter((m) => m.type !== T.Timestamp && m.type !== T.TabData)
    expect(analyticsNonTs.length).toBe(10)
    expect(analyticsNonTs.every((m) => m.type === T.CustomEvent)).toBe(true)

    // ── budget: every batch under the soft trigger ─────────────────────────
    for (const c of captured) {
      expect(c.batch.length).toBeLessThanOrEqual(200_000)
    }
  })

  test('soft budget (200kB) auto-splits the player stream into multiple batches', () => {
    // Use protocol v1 so ConsoleLog routes to the player stream (in v2 it'd
    // be a separate devtools batch, defeating the point of the test).
    const writer = makeWriter()
    writer.writeMessage([T.Timestamp, 1_000_100])
    writer.writeMessage([T.TabData, 'tab-XYZ'])
    const fat = 'x'.repeat(5000) // ~5kB each; 60 of them ≈ 300kB → must split
    for (let i = 0; i < 60; i++) {
      writer.writeMessage([T.ConsoleLog, 'info', fat])
    }
    writer.finaliseBatch()

    const players = batchesByType('player')
    expect(players.length).toBeGreaterThan(1) // at least one auto-flush

    // Every batch under soft cap, every batch starts with full prelude.
    for (const c of players) {
      expect(c.batch.length).toBeLessThanOrEqual(200_000)
      const header = assertPrelude(c.batch)
      expect(header.version).toBe(1)
    }

    // firstIndex of batch n+1 > firstIndex of batch n (monotonic).
    const firstIndices = players.map((c) => parseBatchHeader(c.batch).firstIndex)
    for (let i = 1; i < firstIndices.length; i++) {
      expect(firstIndices[i]).toBeGreaterThan(firstIndices[i - 1])
    }
  })

  test('oversized single message goes through the one-shot oversized path', () => {
    const writer = makeWriter() // beaconSizeLimit defaults to 1MB
    writer.writeMessage([T.Timestamp, 1_000_000])
    writer.writeMessage([T.MouseMove, 1, 1])
    // Fits the 200kB soft buffer? Make it fit beaconSizeLimit (1MB) but exceed soft (200kB).
    const big = 'x'.repeat(250_000)
    writer.writeMessage([T.ConsoleLog, 'big', big])
    writer.finaliseBatch()

    // Expect 2 player batches: the small pre-overflow flush, then the oversized one.
    const players = batchesByType('player')
    expect(players.length).toBe(2)

    for (const c of players) {
      assertPrelude(c.batch)
    }

    // The oversized batch is larger than the soft cap.
    const oversized = players.find((c) => c.batch.length > 200_000)
    expect(oversized).toBeDefined()
    // ...but still under the hard cap.
    expect(oversized!.batch.length).toBeLessThanOrEqual(1_000_000)
  })

  test('hard cap (beaconSizeLimit) drops a too-large message with a warning', () => {
    // Message must exceed both the soft buffer (200kB) AND the hard cap so that
    // every retry path fails. Using beaconSizeLimit < 200kB doesn't actually
    // clamp anything because the regular builder is sized at beaconSize.
    const writer = makeWriter({ beaconSizeLimit: 250_000 })
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    writer.writeMessage([T.Timestamp, 1_000_000])
    // 300kB string → exceeds 200kB soft AND 250kB hard cap.
    writer.writeMessage([T.ConsoleLog, 'huge', 'x'.repeat(300_000)])
    writer.finaliseBatch()

    expect(warnSpy).toHaveBeenCalled()
    expect(batchesByType('player').length).toBe(0)
    warnSpy.mockRestore()
  })

  test('mixed soft + hard scenario across 50 messages emits only well-formed batches', () => {
    const writer = makeWriter({ protocolVersion: 2 })

    // Drive 50 messages with realistic shape: ticks, mouse moves, occasional fat ConsoleLog,
    // and asset messages sprinkled in.
    let tick = 1_000_000
    const tickFwd = () => { tick += 100 }

    writer.writeMessage([T.Timestamp, tick])
    writer.writeMessage([T.TabData, 'tab-XYZ'])

    for (let i = 0; i < 50; i++) {
      tickFwd()
      writer.writeMessage([T.Timestamp, tick])
      if (i % 7 === 0) {
        // Fat devtools log (~5kB)
        writer.writeMessage([T.ConsoleLog, 'info', 'y'.repeat(5_000)])
      } else if (i % 5 === 0) {
        // Asset
        writer.writeMessage([T.SetNodeAttributeURLBased, i, 'src', `r-${i}.png`, 'http://cdn'])
      } else if (i % 3 === 0) {
        // Analytics
        writer.writeMessage([T.CustomEvent, `evt-${i}`, '{}'])
      } else {
        writer.writeMessage([T.MouseMove, i, i + 1])
      }
    }

    writer.finaliseBatch()

    // Sanity: at least one batch per non-player stream that we exercised
    expect(batchesByType('player').length).toBeGreaterThanOrEqual(1)
    expect(batchesByType('assets').length).toBeGreaterThanOrEqual(1)
    expect(batchesByType('devtools').length).toBeGreaterThanOrEqual(1)
    expect(batchesByType('analytics').length).toBeGreaterThanOrEqual(1)

    // Every emitted batch is structurally valid.
    for (const c of captured) {
      expect(c.batch[0]).toBe(T.BatchMetadata)
      const header = assertPrelude(c.batch)
      expect([VERSION_PLAYER_V2, VERSION_ASSETS, VERSION_DEVTOOLS, VERSION_ANALYTICS]).toContain(header.version)
      expect(header.pageNo).toBe(7)
      // Hard cap (default 1MB) is never exceeded
      expect(c.batch.length).toBeLessThanOrEqual(1_000_000)
    }

    // Per-stream ordering: within each stream, batch firstIndex is monotonic.
    // (Cross-stream emit order is dictated by finaliseBatch's stream-iteration
    // order, not by firstIndex — they're independent counters into the same
    // global nextIndex sequence.)
    for (const dt of ['player', 'assets', 'devtools', 'analytics'] as const) {
      const indices = batchesByType(dt).map((c) => parseBatchHeader(c.batch).firstIndex)
      for (let i = 1; i < indices.length; i++) {
        expect(indices[i]).toBeGreaterThan(indices[i - 1])
      }
    }
  })
})
