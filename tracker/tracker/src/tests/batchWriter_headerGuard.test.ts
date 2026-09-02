// @ts-nocheck
/**
 * Every body handed to the sender must lead with a BatchMetadata: ingestion only
 * learns the wire version from it, so a body without one desyncs the reader and
 * the whole record is dropped — with a 200 back, so the client never knows.
 * Rather than lose the batch, BatchWriter rebuilds the header. #4836
 */
import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals'

jest.mock('../common/messages.gen', () => {
  const Type = {
    Timestamp: 0, CreateDocument: 7, CreateElementNode: 8, SetNodeAttribute: 12,
    MouseMove: 20, ConsoleLog: 22, CustomEvent: 27, SetNodeAttributeURLBased: 60,
    SetCSSDataURLBased: 61, BatchMetadata: 81, InputChange: 112, TabData: 118,
  }
  return {
    __esModule: true, default: null, Type,
    ASSET_MESSAGES: new Set([60, 61, 71, 73]),
    DEVTOOLS_MESSAGES: new Set([22]),
    ANALYTICS_MESSAGES: new Set([27, 112]),
  }
})

import BatchWriter from '../webworker/BatchWriter.js'

const T = {
  Timestamp: 0, MouseMove: 20, ConsoleLog: 22, CustomEvent: 27,
  SetCSSDataURLBased: 61, BatchMetadata: 81, InputChange: 112, TabData: 118,
} as const
const ORLOADED = [T.SetNodeAttribute ?? 12, 0, 'orloaded', 'true']

const VERSION_PLAYER_V2 = 2
const VERSION_ASSETS = 3

function readUint(b, p) {
  let v = 0, s = 0, i = p
  while (i < b.length) { const x = b[i++]; v += (x & 0x7f) * Math.pow(2, s); if ((x & 0x80) === 0) return [v, i]; s += 7 }
  return [null, i]
}
/** Walks a body the way backend/pkg/messages/reader.go Parse() does. */
function readLikeIngest(b, label) {
  let p = 0, index = 0, version = 0
  while (p < b.length) {
    const [t, np] = readUint(b, p); if (t === null) break
    p = np; index++
    if (version > 0 && t !== T.BatchMetadata) {
      if (p + 3 > b.length) throw new Error(`${label}: read message size err @${index}`)
      const size = b[p] | (b[p + 1] << 8) | (b[p + 2] << 16); p += 3
      if (b.length - p < size) throw new Error(`${label}: can't read message body @${index}`)
      p += size; continue
    }
    if (t !== T.BatchMetadata) throw new Error(`${label}: leading type ${t}, not BatchMetadata`)
    if (index > 1) throw new Error(`${label}: batch meta not at the start of batch @${index}`)
    let v, pn, fi, ts, ul
    ;[v, p] = readUint(b, p); ;[pn, p] = readUint(b, p); ;[fi, p] = readUint(b, p)
    ;[ts, p] = readUint(b, p); ;[ul, p] = readUint(b, p); p += ul
    version = v
    if (version < 1 || version > 5) throw new Error(`${label}: unsupported version ${version}`)
  }
  return version
}
function assertReadable(captured, ctx) {
  captured.forEach((c, i) => {
    const label = `${ctx} #${i}(${c.dataType})`
    if (c.dataType === 'visual') {
      expect(typeof c.split).toBe('number')
      expect(c.split).toBeGreaterThan(0)
      expect(c.split).toBeLessThan(c.batch.length)
      readLikeIngest(c.batch.subarray(0, c.split), label + '/player')
      readLikeIngest(c.batch.subarray(c.split), label + '/assets')
    } else {
      readLikeIngest(c.batch, label)
    }
  })
}

function makeWriter(opts: { localDebug?: boolean } = {}) {
  const captured: any[] = []
  const writer = new BatchWriter(
    /* pageNo */ 4, /* timestamp */ 1_700_000_000_000, /* url */ 'http://app.test/page',
    (batch, skipCompression, dataType = 'player', split) =>
      captured.push({ batch, skipCompression: !!skipCompression, dataType, split }),
    /* tabId */ 'tab-9', () => {}, opts.localDebug ?? false,
  )
  writer.setBeaconSizeLimit(1e6)
  writer.setProtocolVersion(2)
  return { writer, captured }
}

/** A builder stand-in whose flush() yields bytes with no leading metadata. */
function headerlessBuilder(dataType: string, version: number, body: Uint8Array) {
  return {
    version, dataType,
    push: () => true,
    size: () => body.length,
    hasContent: () => true,
    flush: () => body,
    reset: () => {},
  }
}

// [Timestamp][size=1][0] — a valid message, but no BatchMetadata ahead of it.
const HEADERLESS = new Uint8Array([T.Timestamp, 1, 0, 0, 0])

let warn: any
beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => {}) })
afterEach(() => { warn.mockRestore() })

describe('BatchMetadata is always first', () => {
  test('normal path is untouched: one visual with a byte-exact split', () => {
    const { writer, captured } = makeWriter()
    ;[
      [T.Timestamp, 1_700_000_000_000], [T.TabData, 'tab-9'],
      [T.MouseMove, 1, 2],
      [T.SetCSSDataURLBased, 3, '.a{color:red}', 'http://app.test/'],
      ORLOADED,
    ].forEach((m) => writer.writeMessage(m as any))

    expect(captured).toHaveLength(1)
    expect(captured[0].dataType).toBe('visual')
    assertReadable(captured, 'normal')
    expect(warn).not.toHaveBeenCalled()
  })

  test('a headerless player half is repaired, and the megabatch is still paired', () => {
    const { writer, captured } = makeWriter()
    writer.writeMessage([T.SetCSSDataURLBased, 3, '.a{color:red}', 'http://app.test/'] as any)
    ;(writer as any).playerBuilder = headerlessBuilder('player', VERSION_PLAYER_V2, HEADERLESS)
    writer.writeMessage(ORLOADED as any)

    expect(captured).toHaveLength(1)
    expect(captured[0].dataType).toBe('visual') // still one request, not two
    assertReadable(captured, 'repaired-player')
    // The rebuilt header carries the player stream's own version.
    expect(readLikeIngest(captured[0].batch.subarray(0, captured[0].split), 'v')).toBe(VERSION_PLAYER_V2)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('header rebuilt'))
  })

  test('a headerless asset half is repaired with the assets version', () => {
    const { writer, captured } = makeWriter()
    writer.writeMessage([T.MouseMove, 1, 2] as any)
    ;(writer as any).assetBuilder = headerlessBuilder('assets', VERSION_ASSETS, HEADERLESS)
    writer.writeMessage(ORLOADED as any)

    expect(captured).toHaveLength(1)
    expect(captured[0].dataType).toBe('visual')
    assertReadable(captured, 'repaired-assets')
    expect(readLikeIngest(captured[0].batch.subarray(captured[0].split), 'v')).toBe(VERSION_ASSETS)
  })

  test('a headerless devtools/analytics batch is repaired, not dropped', () => {
    for (const [type, dataType] of [[T.ConsoleLog, 'devtools'], [T.CustomEvent, 'analytics']] as const) {
      const { writer, captured } = makeWriter()
      writer.writeMessage([T.MouseMove, 1, 2] as any)
      writer.writeMessage(ORLOADED as any)
      const before = captured.length
      const key = dataType === 'devtools' ? 'devtoolsBuilder' : 'analyticsBuilder'
      ;(writer as any)[key] = headerlessBuilder(dataType, dataType === 'devtools' ? 4 : 5, HEADERLESS)
      writer.finaliseBatch()
      expect(captured.length).toBeGreaterThan(before)
      expect(captured[captured.length - 1].dataType).toBe(dataType)
      assertReadable(captured, dataType)
    }
  })

  test('a bogus split is corrected to the real seam, megabatch kept', () => {
    const { writer, captured } = makeWriter()
    const half = (() => {
      const { writer: w, captured: c } = makeWriter()
      w.writeMessage([T.MouseMove, 1, 2] as any)
      w.writeMessage(ORLOADED as any)
      return c[0].batch
    })()
    const joined = new Uint8Array(half.length * 2)
    joined.set(half, 0)
    joined.set(half, half.length)
    ;(writer as any).emitBatch(joined, 'visual', false, half.length + 3) // off by 3

    expect(captured).toHaveLength(1)
    expect(captured[0].dataType).toBe('visual')
    expect(captured[0].split).toBe(half.length) // walked back to the true seam
    assertReadable(captured, 'bad-split')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('corrected to'))
  })

  test('a split with no recoverable seam is skipped rather than corrupted', () => {
    const { writer, captured } = makeWriter()
    const single = (() => {
      const { writer: w, captured: c } = makeWriter()
      w.writeMessage([T.MouseMove, 1, 2] as any)
      w.writeMessage(ORLOADED as any)
      return c[0].batch
    })()
    // One batch, so there is no second BatchMetadata to split on.
    ;(writer as any).emitBatch(single, 'visual', false, 4)
    expect(captured).toHaveLength(0)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no boundary found'))
  })

  test('localDebug deep walk reports a body it cannot parse', () => {
    const { writer } = makeWriter({ localDebug: true })
    const good = (() => {
      const { writer: w, captured: c } = makeWriter()
      w.writeMessage([T.MouseMove, 1, 2] as any)
      w.writeMessage(ORLOADED as any)
      return c[0].batch
    })()
    // Truncate the last message's payload so the size prefix overruns the body.
    ;(writer as any).emitBatch(good.subarray(0, good.length - 2), 'player', false)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('malformed player batch'))
  })

  test('every stream still round-trips through ingestion after repairs', () => {
    const { writer, captured } = makeWriter()
    ;[
      [T.Timestamp, 1_700_000_000_000], [T.TabData, 'tab-9'],
      [T.MouseMove, 1, 2],
      [T.InputChange, 42, 'abc', false, 'Name', 5, 3],
      [T.ConsoleLog, 'info', 'hello'],
      [T.SetCSSDataURLBased, 3, '.a{color:red}', 'http://app.test/'],
      ORLOADED,
      [T.MouseMove, 3, 4],
    ].forEach((m) => writer.writeMessage(m as any))
    writer.finaliseBatch()
    expect(captured.length).toBeGreaterThan(1)
    assertReadable(captured, 'mixed')
  })
})
