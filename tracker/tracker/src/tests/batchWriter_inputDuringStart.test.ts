// @ts-nocheck
/**
 * "Input during start": drive the writer with a realistic DOM snapshot stream
 * while input messages arrive at the same time, and check every body the way
 * backend/pkg/messages/reader.go does.
 */
import { describe, expect, test, jest } from '@jest/globals'

jest.mock('../common/messages.gen', () => {
  const Type = {
    Timestamp: 0, SetViewportSize: 5, SetViewportScroll: 6, CreateDocument: 7,
    CreateElementNode: 8, CreateTextNode: 9, MoveNode: 10, RemoveNode: 11,
    SetNodeAttribute: 12, SetNodeData: 14, SetNodeScroll: 16, SetInputTarget: 17,
    SetInputValue: 18, SetInputChecked: 19, MouseMove: 20, ConsoleLog: 22,
    CustomEvent: 27, StringDictGlobal: 34, SetNodeAttributeDictGlobal: 35,
    StringDict: 43, SetNodeAttributeDict: 52, SetPageVisibility: 55,
    SetNodeFocus: 58, SetNodeAttributeURLBased: 60, SetCSSDataURLBased: 61,
    MouseClick: 68, AdoptedSSReplaceURLBased: 71, AdoptedSSInsertRuleURLBased: 73,
    AdoptedSSAddOwner: 76, BatchMetadata: 81, ResourceTiming: 85, InputChange: 112,
    SelectionChange: 113, UnbindNodes: 115, TabData: 118, SetPageLocation: 122,
  }
  return {
    __esModule: true, default: null, Type,
    ASSET_MESSAGES: new Set([60, 61, 71, 73]),
    DEVTOOLS_MESSAGES: new Set([21, 22, 40, 41, 44, 45, 46, 47, 48, 79, 83, 84, 85, 87, 89, 116, 120, 121, 123]),
    ANALYTICS_MESSAGES: new Set([17, 23, 24, 27, 28, 29, 30, 42, 63, 64, 78, 112, 115, 124]),
  }
})

import BatchWriter from '../webworker/BatchWriter.js'

const T = {
  Timestamp: 0, SetViewportSize: 5, SetViewportScroll: 6, CreateDocument: 7,
  CreateElementNode: 8, CreateTextNode: 9, SetNodeAttribute: 12, SetNodeData: 14,
  SetInputTarget: 17, SetInputValue: 18, SetInputChecked: 19, MouseMove: 20,
  ConsoleLog: 22, StringDictGlobal: 34, SetNodeAttributeDictGlobal: 35,
  StringDict: 43, SetNodeAttributeDict: 52, SetNodeFocus: 58,
  SetNodeAttributeURLBased: 60, SetCSSDataURLBased: 61, AdoptedSSAddOwner: 76,
  BatchMetadata: 81, ResourceTiming: 85, InputChange: 112, SelectionChange: 113,
  UnbindNodes: 115, TabData: 118, SetPageLocation: 122,
} as const

const ORLOADED = [T.SetNodeAttribute, 0, 'orloaded', 'true']

// ── reader.go port ────────────────────────────────────────────────────────
function readUint(b, p) {
  let v = 0, s = 0, i = p
  while (i < b.length) { const x = b[i++]; v += (x & 0x7f) * Math.pow(2, s); if ((x & 0x80) === 0) return [v, i]; s += 7 }
  return [null, i]
}
function readLikeIngest(b, label) {
  let p = 0, index = 0, version = 0
  const seen = []
  while (p < b.length) {
    const [t, np] = readUint(b, p); if (t === null) break
    p = np; index++; seen.push(t)
    if (version > 0 && t !== T.BatchMetadata) {
      if (p + 3 > b.length) throw new Error(`${label}: read message size err @msg${index}`)
      const size = b[p] | (b[p + 1] << 8) | (b[p + 2] << 16); p += 3
      if (b.length - p < size) throw new Error(`${label}: can't read message body @msg${index}`)
      p += size; continue
    }
    if (t !== T.BatchMetadata) {
      throw new Error(`${label}: body starts with type ${t}, not BatchMetadata (desync)`)
    }
    if (index > 1) throw new Error(`${label}: batch meta not at the start of batch @msg${index}`)
    let v, pn, fi, ts, ul
    ;[v, p] = readUint(b, p); ;[pn, p] = readUint(b, p); ;[fi, p] = readUint(b, p)
    ;[ts, p] = readUint(b, p); ;[ul, p] = readUint(b, p); p += ul
    version = v
    if (version < 1 || version > 5) throw new Error(`${label}: unsupported version ${version}`)
  }
  return seen
}
function assertReadable(captured, ctx) {
  captured.forEach((c, i) => {
    const label = `${ctx} batch#${i}(${c.dataType},${c.batch.length}B,split=${c.split})`
    if (c.batch.length === 0) throw new Error(`${label}: zero-byte body`)
    if (c.dataType === 'visual') {
      if (typeof c.split !== 'number') throw new Error(`${label}: visual with no split`)
      if (c.split <= 0 || c.split >= c.batch.length) throw new Error(`${label}: split out of range`)
      readLikeIngest(c.batch.subarray(0, c.split), label + '/player')
      readLikeIngest(c.batch.subarray(c.split), label + '/assets')
    } else {
      readLikeIngest(c.batch, label)
    }
  })
}

// ── realistic streams ─────────────────────────────────────────────────────
/** What the initial tree walk emits, dictionaries and assets included. */
function domStream(nodes: number): any[] {
  const out: any[] = [
    [T.Timestamp, 1_700_000_000_000],
    [T.TabData, 'tab-1'],
    [T.SetPageLocation, 'http://app.test/', '', 0, 'App'],
    [T.SetViewportSize, 1440, 900],
    [T.CreateDocument],
  ]
  for (let i = 1; i <= nodes; i++) {
    out.push([T.CreateElementNode, i, i - 1, i % 5, 'div', false])
    if (i % 2 === 0) out.push([T.StringDictGlobal, 1000 + i, `class-value-${i}`])
    if (i % 2 === 0) out.push([T.SetNodeAttributeDictGlobal, i, 900 + i, 1000 + i])
    else out.push([T.SetNodeAttribute, i, 'class', `row r${i}`])
    if (i % 3 === 0) { out.push([T.CreateTextNode, 50_000 + i, i, 0]); out.push([T.SetNodeData, 50_000 + i, `row ${i}`]) }
    if (i % 6 === 0) out.push([T.SetCSSDataURLBased, i, `.r${i}{color:#333}`, 'http://app.test/'])
    if (i % 9 === 0) out.push([T.SetNodeAttributeURLBased, i, 'src', `i${i}.png`, 'http://app.test/'])
    if (i % 11 === 0) out.push([T.AdoptedSSAddOwner, i, i - 1])
    if (i % 13 === 0) out.push([T.ResourceTiming, 1, 2, 3, 4, 5, 6, `http://cdn/${i}.js`, 'script', true, 0])
  }
  return out
}

/** One keystroke in a text field: player + analytics messages together. */
function keystroke(ch: string, n = 42): any[] {
  return [
    [T.SetNodeFocus, n],
    [T.SetInputTarget, n, 'Name'],
    [T.SetInputValue, n, ch.repeat(3), 0],
    [T.InputChange, n, ch.repeat(3), false, 'Name', 12, 3],
    [T.SelectionChange, 0, 3, 'form > input'],
    [T.SetViewportScroll, 0, 24],
  ]
}

function makeWriter(pageNo = 2) {
  const captured: any[] = []
  const writer = new BatchWriter(
    pageNo, 1_700_000_000_000, 'http://app.test/',
    (batch, skipCompression, dataType = 'player', split) =>
      captured.push({ batch, skipCompression: !!skipCompression, dataType, split }),
    'tab-1', () => {},
  )
  return { writer, captured }
}

/** Feed arrays the way the worker's onmessage does. */
function feed(writer, arrays: any[][]) {
  for (const arr of arrays) for (const m of arr) writer.writeMessage(m as any)
}

describe('input arriving while the tracker is starting', () => {
  test('input spliced at every position of the snapshot array', () => {
    const dom = domStream(40)
    for (let at = 0; at <= dom.length; at++) {
      const { writer, captured } = makeWriter()
      writer.setBeaconSizeLimit(1e6)
      writer.setProtocolVersion(2)
      feed(writer, [[...dom.slice(0, at), ...keystroke('a'), ...dom.slice(at), ORLOADED]])
      writer.finaliseBatch()
      assertReadable(captured, `splice@${at}`)
    }
  })

  test('input as its own commit, at every gap between snapshot commits', () => {
    const dom = domStream(40)
    const chunk = Math.ceil(dom.length / 6)
    const commits: any[][] = []
    for (let i = 0; i < dom.length; i += chunk) commits.push(dom.slice(i, i + chunk))
    commits.push([ORLOADED])
    for (let gap = 0; gap <= commits.length; gap++) {
      const { writer, captured } = makeWriter()
      writer.setBeaconSizeLimit(1e6)
      writer.setProtocolVersion(2)
      const arrays = [...commits.slice(0, gap), keystroke('b'), ...commits.slice(gap)]
      feed(writer, arrays)
      writer.finaliseBatch()
      assertReadable(captured, `gap@${gap}`)
    }
  })

  test('auth (pv2) landing at every point in a stream that already carries input', () => {
    const dom = domStream(30)
    const stream = [...keystroke('c'), ...dom, ...keystroke('d'), ORLOADED, ...keystroke('e')]
    for (let authAt = 0; authAt <= stream.length; authAt++) {
      const { writer, captured } = makeWriter()
      for (let i = 0; i < stream.length; i++) {
        if (i === authAt) { writer.setBeaconSizeLimit(1e6); writer.setProtocolVersion(2) }
        writer.writeMessage(stream[i] as any)
      }
      if (authAt >= stream.length) { writer.setBeaconSizeLimit(1e6); writer.setProtocolVersion(2) }
      writer.finaliseBatch()
      assertReadable(captured, `auth@${authAt}`)
    }
  })

  test('input during init across beacon limits that force mid-snapshot flushes', () => {
    const dom = domStream(300)
    for (const limit of [4_000, 10_000, 32_000, 120_000, 400_000, 1e6]) {
      for (const at of [0, 1, Math.floor(dom.length / 3), Math.floor(dom.length / 2), dom.length - 1, dom.length]) {
        const { writer, captured } = makeWriter()
        writer.setBeaconSizeLimit(limit)
        writer.setProtocolVersion(2)
        feed(writer, [[...dom.slice(0, at), ...keystroke('f'), ...dom.slice(at), ORLOADED, ...keystroke('g')]])
        writer.finaliseBatch()
        assertReadable(captured, `limit=${limit} at=${at}`)
      }
    }
  })

  test('huge pasted input value during init (oversize on every stream)', () => {
    const dom = domStream(30)
    for (const size of [150_000, 260_000, 900_000, 1_200_000]) {
      const paste = 'p'.repeat(size)
      for (const limit of [8_000, 250_000, 1e6]) {
        const { writer, captured } = makeWriter()
        writer.setBeaconSizeLimit(limit)
        writer.setProtocolVersion(2)
        feed(writer, [[
          ...dom.slice(0, 20),
          [T.SetInputValue, 42, paste, 0],                                  // player
          [T.InputChange, 42, paste, false, 'Name', 12, 3],                 // analytics
          [T.SetInputTarget, 42, paste],                                    // analytics
          [T.ConsoleLog, 'warn', paste],                                    // devtools
          [T.SetCSSDataURLBased, 7, paste, 'http://app.test/'],             // assets
          ...dom.slice(20),
          ORLOADED,
        ]])
        writer.finaliseBatch()
        assertReadable(captured, `paste=${size} limit=${limit}`)
      }
    }
  })

  test('orloaded alone in its own commit, input immediately before and after', () => {
    const dom = domStream(30)
    const { writer, captured } = makeWriter()
    writer.setBeaconSizeLimit(1e6)
    writer.setProtocolVersion(2)
    feed(writer, [dom, keystroke('h'), [ORLOADED], keystroke('i')])
    writer.finaliseBatch()
    assertReadable(captured, 'signal-own-commit')
    expect(captured.some((c) => c.dataType === 'visual')).toBe(true)
  })

  test('finaliseBatch (autosend / closing) interleaved with input during init', () => {
    const dom = domStream(60)
    for (let at = 0; at < dom.length; at += 7) {
      for (const skip of [false, true]) {
        const { writer, captured } = makeWriter()
        writer.setBeaconSizeLimit(1e6)
        writer.setProtocolVersion(2)
        dom.slice(0, at).forEach((m) => writer.writeMessage(m as any))
        keystroke('j').forEach((m) => writer.writeMessage(m as any))
        writer.finaliseBatch(skip)             // 30s autosend or 'closing' mid-init
        keystroke('k').forEach((m) => writer.writeMessage(m as any))
        dom.slice(at).forEach((m) => writer.writeMessage(m as any))
        writer.writeMessage(ORLOADED as any)
        writer.finaliseBatch()
        assertReadable(captured, `finalise@${at} skip=${skip}`)
      }
    }
  })
})
