// Decodes the batches the worker sent to the fake ingest and checks them against the
// tuples the page posted to the worker: covers the encoder, batching, routing and gzip.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { trackerPackage } from './paths.mjs'
import { messageNames } from './targets.mjs'

/** Field kinds per message type id and the v2 stream sets, from that tree's generated code. */
export function wireSchema(workspace) {
  const ids = Object.fromEntries(Object.entries(messageNames(workspace)).map(([id, name]) => [name, +id]))
  const pkg = trackerPackage(workspace)
  const enc = fs.readFileSync(path.join(pkg, 'src/webworker/MessageEncoder.gen.ts'), 'utf8')
  const fields = {}
  for (const [, name, body] of enc.matchAll(/case Messages\.Type\.(\w+):\s*\n\s*return\s+([^\n]*)/g)) {
    fields[ids[name]] = [...body.matchAll(/this\.(uint|int|string|boolean)\(msg\[\d+\]\)/g)].map((m) => m[1])
  }
  const gen = fs.readFileSync(path.join(pkg, 'src/common/messages.gen.ts'), 'utf8')
  const set = (name) => {
    const m = gen.match(new RegExp(`${name}[^=]*=\\s*new Set\\(\\[([\\d,\\s]*)\\]`))
    return new Set(m ? m[1].split(',').map(Number).filter((n) => !Number.isNaN(n)) : [])
  }
  const streams = { assets: set('ASSET_MESSAGES'), devtools: set('DEVTOOLS_MESSAGES'), analytics: set('ANALYTICS_MESSAGES') }
  return { ids, fields, streams }
}

const td = new TextDecoder()
const te = new TextEncoder()

/** One uncompressed batch -> message tuples. Throws on any framing fault. */
export function decodeBatch(buf, { ids, fields }) {
  let p = 0
  const need = (n) => {
    if (p + n > buf.length) throw new Error(`truncated at byte ${p}`)
  }
  const uint = () => {
    let v = 0
    let mul = 1
    let b
    do {
      need(1)
      b = buf[p++]
      v += (b & 0x7f) * mul
      mul *= 128
    } while (b & 0x80)
    return v
  }
  const read = {
    uint,
    int: () => {
      const z = uint()
      return z % 2 ? -(z + 1) / 2 : z / 2
    },
    string: () => {
      const n = uint()
      need(n)
      const s = td.decode(buf.subarray(p, p + n))
      p += n
      return s
    },
    boolean: () => {
      need(1)
      return buf[p++]
    },
  }
  const out = []
  while (p < buf.length) {
    const at = p
    const type = uint()
    const kinds = fields[type]
    if (!kinds) throw new Error(`unknown type ${type} at byte ${at}`)
    if (type === ids.BatchMetadata) {
      out.push([type, ...kinds.map((k) => read[k]())])
      continue
    }
    need(3)
    const size = buf[p] | (buf[p + 1] << 8) | (buf[p + 2] << 16)
    p += 3
    const start = p
    const msg = [type, ...kinds.map((k) => read[k]())]
    if (p - start !== size) throw new Error(`type ${type} at byte ${at}: size prefix ${size}, body ${p - start}`)
    out.push(msg)
  }
  return out
}

// What each primitive turns a JS value into on the wire
const NORMALIZE = {
  uint: (v) => {
    v = Number(v)
    return v >= 0 && v <= Number.MAX_SAFE_INTEGER ? Math.floor(v) : 0
  },
  int: (v) => {
    const r = Math.round(Number(v))
    const z = r >= 0 ? r * 2 : r * -2 - 1
    return z >= 0 && z <= Number.MAX_SAFE_INTEGER ? r : 0
  },
  string: (v) => td.decode(te.encode(v === undefined ? '' : String(v))),
  boolean: (v) => {
    const x = +v
    return Number.isFinite(x) ? ((Math.trunc(x) % 256) + 256) % 256 : 0
  },
}

// BatchMetadata.version per stream under protocol 2
const VERSIONS = { player: 2, assets: 3, devtools: 4, analytics: 5 }

/**
 * Decoded batches vs posted tuples, per stream (v1: one stream; v2: player, assets,
 * devtools, analytics, each in its own order). The first `flushed` tuples were posted
 * before a forced flush, so they must all be on the wire; later ones may be too.
 * Messages the worker adds or swallows on its own are left out on both sides:
 * Timestamp, TabData, BatchMetadata, IssueEvent (detectors), "orloaded".
 * Every batch must also lead with its own BatchMetadata (version matching its stream)
 * and hold only its stream's messages; a visual batch must split exactly between halves.
 */
export function compareWire(entries, tuples, flushed, schema, protocol = 1) {
  const { ids, fields, streams } = schema
  const own = new Set([ids.Timestamp, ids.TabData, ids.BatchMetadata, ids.IssueEvent])
  const streamOf = (type) =>
    protocol !== 2
      ? 'player'
      : streams.assets.has(type)
        ? 'assets'
        : streams.devtools.has(type)
          ? 'devtools'
          : streams.analytics.has(type)
            ? 'analytics'
            : 'player'
  const kinds = {}
  const got = []
  const fail = (error, extra = {}) => ({ ok: false, batches: entries.length, kinds, error, ...extra })

  for (const [n, e] of entries.entries()) {
    kinds[e.dataType] = (kinds[e.dataType] ?? 0) + 1
    const raw = e.body[0] === 0x1f && e.body[1] === 0x8b ? zlib.gunzipSync(e.body) : e.body
    let halves = [[raw, e.dataType]]
    if (e.split !== undefined) {
      if (e.dataType !== 'visual') return fail(`batch ${n}: split on a ${e.dataType} batch`)
      if (!(e.split > 0 && e.split < raw.length)) return fail(`batch ${n}: split ${e.split} outside ${raw.length} bytes`)
      halves = [
        [raw.subarray(0, e.split), 'player'],
        [raw.subarray(e.split), 'assets'],
      ]
    } else if (e.dataType === 'visual') {
      return fail(`batch ${n}: visual batch without split`)
    }
    for (const [buf, dataType] of halves) {
      let msgs
      try {
        msgs = decodeBatch(buf, schema)
      } catch (err) {
        return fail(`batch ${n} (${dataType}): ${err.message ?? err}`)
      }
      const where = `batch ${n} (${dataType}${halves.length > 1 ? ' half' : ''})`
      if (msgs[0]?.[0] !== ids.BatchMetadata) return fail(`${where}: does not lead with BatchMetadata`)
      if (msgs.slice(1).some((m) => m[0] === ids.BatchMetadata)) return fail(`${where}: second BatchMetadata inside`)
      const version = msgs[0][1]
      // under protocol 2 a v1 player batch can still go out before the auth response
      const v1 = version === 1 && dataType === 'player'
      if (protocol !== 2 ? !v1 : !v1 && version !== VERSIONS[dataType]) {
        return fail(`${where}: BatchMetadata version ${version}`)
      }
      if (!v1) {
        const stray = msgs.find((m) => !own.has(m[0]) && streamOf(m[0]) !== dataType)
        if (stray) return fail(`${where}: holds type ${stray[0]}`)
      }
      got.push(...msgs)
    }
  }

  const keep = (m) => m[0] >= 0 && !own.has(m[0]) && !(m[0] === ids.SetNodeAttribute && m[2] === 'orloaded')
  const normalize = (m) => [m[0], ...(fields[m[0]] ?? []).map((k, i) => NORMALIZE[k](m[i + 1]))]
  const byStream = (list) => {
    const out = {}
    for (const m of list) (out[streamOf(m[0])] ??= []).push(m)
    return out
  }
  const gotBy = byStream(got.filter((m) => !own.has(m[0])))
  const wantBy = byStream(tuples.filter(keep).map(normalize))
  const minBy = byStream(tuples.slice(0, flushed).filter(keep))
  const messages = Object.values(gotBy).reduce((n, l) => n + l.length, 0)
  for (const s of new Set([...Object.keys(gotBy), ...Object.keys(wantBy)])) {
    const g = gotBy[s] ?? []
    const w = wantBy[s] ?? []
    const min = minBy[s]?.length ?? 0
    for (let i = 0; i < Math.min(g.length, w.length); i++) {
      const a = JSON.stringify(g[i])
      const b = JSON.stringify(w[i])
      if (a !== b) return fail(`${s} message ${i}`, { messages, got: a.slice(0, 300), want: b.slice(0, 300) })
    }
    if (g.length < min || g.length > w.length) return fail(`${s}: decoded ${g.length} messages, expected ${min}..${w.length}`, { messages })
  }
  return { ok: true, batches: entries.length, messages, kinds }
}
