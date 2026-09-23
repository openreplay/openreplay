// @ts-nocheck
// Shared helpers for the BatchWriter suites. Kept free of messages.gen imports so
// every suite can keep its own module mock.
import { expect } from '@jest/globals'

const BATCH_METADATA = 81
const TIMESTAMP = 0
const TAB_DATA = 118

const REPAIR_WARNINGS = ['no leading BatchMetadata', 'not a batch boundary']

/** BatchWriter silently repairs a batch its builder got wrong; a warning is the only trace. */
export function expectNoRepair(warn): void {
  const repairs = warn.mock.calls.filter(
    (args) => typeof args[0] === 'string' && REPAIR_WARNINGS.some((w) => args[0].includes(w)),
  )
  expect(repairs).toEqual([])
}

function readUint(b: Uint8Array, p: number): [number | null, number] {
  let v = 0
  let s = 0
  let i = p
  while (i < b.length) {
    const x = b[i++]
    v += (x & 0x7f) * Math.pow(2, s)
    if ((x & 0x80) === 0) return [v, i]
    s += 7
  }
  return [null, i]
}

export interface ParsedBatch {
  version: number
  pageNo: number
  firstIndex: number
  metas: number
  /** Types of every sized message after the BatchMetadata, in order. */
  types: number[]
}

/** Walks a body the way backend/pkg/messages/reader.go does; throws on anything it would reject. */
export function parseBatch(b: Uint8Array, label = 'batch'): ParsedBatch {
  let p = 0
  let index = 0
  const out: ParsedBatch = { version: 0, pageNo: 0, firstIndex: 0, metas: 0, types: [] }
  while (p < b.length) {
    const [t, np] = readUint(b, p)
    if (t === null) throw new Error(`${label}: truncated type @msg${index + 1}`)
    p = np
    index++
    if (t === BATCH_METADATA) {
      if (index > 1) throw new Error(`${label}: batch meta not at the start of batch @msg${index}`)
      out.metas++
      const f = []
      for (let i = 0; i < 5; i++) {
        const [v, q] = readUint(b, p)
        if (v === null) throw new Error(`${label}: truncated BatchMetadata`)
        f.push(v)
        p = q
      }
      p += f[4]
      if (p > b.length) throw new Error(`${label}: truncated BatchMetadata url`)
      ;[out.version, out.pageNo, out.firstIndex] = f
      if (out.version < 1 || out.version > 5) throw new Error(`${label}: unsupported version ${out.version}`)
      continue
    }
    if (out.version === 0) throw new Error(`${label}: leading type ${t}, not BatchMetadata`)
    if (p + 3 > b.length) throw new Error(`${label}: read message size err @msg${index}`)
    const size = b[p] | (b[p + 1] << 8) | (b[p + 2] << 16)
    p += 3
    if (b.length - p < size) throw new Error(`${label}: can't read message body @msg${index}`)
    p += size
    out.types.push(t)
  }
  return out
}

export interface Captured {
  batch: Uint8Array
  skipCompression: boolean
  dataType: string
  split?: number
}

/** Every emitted body, visual megabatches cut at their split, parsed. */
export function parseAll(captured: Captured[], ctx = ''): Array<ParsedBatch & { dataType: string }> {
  const out = []
  captured.forEach((c, i) => {
    const label = `${ctx} #${i}(${c.dataType},${c.batch.length}B,split=${c.split})`
    if (c.batch.length === 0) throw new Error(`${label}: zero-byte body`)
    if (c.dataType === 'visual') {
      if (typeof c.split !== 'number') throw new Error(`${label}: visual with no split`)
      if (c.split <= 0 || c.split >= c.batch.length) throw new Error(`${label}: split out of range`)
      out.push({ ...parseBatch(c.batch.subarray(0, c.split), label + '/player'), dataType: 'visual:player' })
      out.push({ ...parseBatch(c.batch.subarray(c.split), label + '/assets'), dataType: 'visual:assets' })
    } else {
      out.push({ ...parseBatch(c.batch, label), dataType: c.dataType })
    }
  })
  return out
}

/** Count of each message type, header/clock bookkeeping (Timestamp, TabData) excluded. */
export function contentTypes(types: number[]): Record<number, number> {
  const counts = {}
  for (const t of types) {
    if (t === TIMESTAMP || t === TAB_DATA || t === BATCH_METADATA) continue
    counts[t] = (counts[t] ?? 0) + 1
  }
  return counts
}
