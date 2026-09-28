import { Mirror } from './mirror.js'
import { expectedTree } from './expected.js'
import { scenarios, ops, lab } from './scenarios.js'
import { makeCurrent, makeNext, makeTrackerNext, Impl } from './impls.js'
import MessageEncoder from '../../../../tracker/src/webworker/MessageEncoder.gen.js'

// time spent inside MutationObserver callbacks, whoever owns them
const stats = { moTime: 0, moCalls: 0, moMax: 0 }
const NativeMO = window.MutationObserver
;(window as any).MutationObserver = class extends NativeMO {
  constructor(cb: MutationCallback) {
    super((recs, obs) => {
      const t = performance.now()
      try {
        cb(recs, obs)
      } finally {
        const d = performance.now() - t
        stats.moTime += d
        stats.moCalls++
        if (d > stats.moMax) stats.moMax = d
      }
    })
  }
}

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms))

function firstDiff(a: string, b: string) {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  if (i === a.length && i === b.length) return null
  return { at: i, got: a.slice(Math.max(0, i - 80), i + 120), want: b.slice(Math.max(0, i - 80), i + 120) }
}

async function bytes(msgs: any[]) {
  const enc = new MessageEncoder(256 * 1024 * 1024)
  let raw = 0
  const chunks: Uint8Array[] = []
  let start = 0
  for (const m of msgs) {
    enc.uint(m[0])
    enc.skip(3)
    const before = enc.getCurrentOffset()
    if (!enc.encode(m)) throw new Error('encode overflow')
    enc.checkpoint()
    raw += enc.getCurrentOffset() - before + 3 + 1
    if (enc.getCurrentOffset() - start > 200_000) {
      chunks.push(enc.flush())
      start = 0
    }
  }
  chunks.push(enc.flush())
  let gz = 0
  let total = 0
  for (const c of chunks) {
    total += c.byteLength
    const s = new Blob([c as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'))
    gz += (await new Response(s).arrayBuffer()).byteLength
  }
  return { raw: total, gz }
}

const H = {
  stats,
  scenarios,
  msgs: [] as any[],
  impl: null as (Impl & any) | null,
  mirror: new Mirror(),
  applied: 0,
  mirrorAll() {
    if (H.applied > H.msgs.length) {
      H.mirror = new Mirror()
      H.applied = 0
    }
    for (; H.applied < H.msgs.length; H.applied++) H.mirror.apply(H.msgs[H.applied])
    return H.mirror
  },
  verify(label: string) {
    const m = H.mirrorAll()
    const got = m.serialize()
    const want = expectedTree()
    const d = firstDiff(got, want)
    return { label, ok: !d && m.errors.length === 0, diff: d, errors: m.errors.slice(0, 8) }
  },
  async run(name: string, implName: string) {
    const sc = scenarios[name]
    if (!sc) throw new Error(`no scenario ${name}`)
    H.msgs = []
    H.mirror = new Mirror()
    H.applied = 0
    const send = (m: any) => H.msgs.push(m)
    if (sc.setup) await sc.setup()
    await tick(50)
    stats.moTime = 0
    stats.moCalls = 0
    stats.moMax = 0
    let impl: any = null
    if (implName === 'current') impl = makeCurrent(send)
    else if (implName === 'next') impl = makeNext(send, 'weakmap')
    else if (implName === 'next-symbol') impl = makeNext(send, 'symbol')
    else if (implName === 'current+gendict') impl = makeCurrent(send, true)
    else if (implName === 'next+gendict') impl = makeNext(send, 'symbol', true)
    else if (implName === 'tracker-next') impl = makeTrackerNext(send)
    H.impl = impl
    const t0 = performance.now()
    impl?.start()
    const snapshotMs = performance.now() - t0
    await tick(sc.settle ?? 0)
    await tick(0)
    const snapshotMsgs = H.msgs.length
    const verifies: any[] = []
    let firstFail: any = null
    if (impl && sc.kind === 'correct') {
      const v = H.verify('snapshot')
      verifies.push(v)
      if (!v.ok) firstFail = v
    }
    let stepErr: string | null = null
    const s0 = performance.now()
    for (let i = 0; i < sc.steps.length; i++) {
      const before = H.msgs.length
      try {
        await sc.steps[i]()
      } catch (e: any) {
        stepErr = `step ${i}: ${e?.message ?? e}`
        break
      }
      await tick(sc.settle ?? 0)
      if (impl && sc.verifyEach && !firstFail) {
        const v: any = H.verify(`step ${i}`)
        if (!v.ok) {
          v.ops = ops.slice()
          v.dlog = ((globalThis as any).__dlog ?? []).slice()
          v.stepMsgs = H.msgs.slice(before).map((m) => JSON.stringify(m)).slice(0, 80)
          firstFail = v
          verifies.push(v)
        }
      }
    }
    const stepsWall = performance.now() - s0
    if (impl && sc.kind === 'correct') {
      const v = H.verify('final')
      verifies.push(v)
      if (!v.ok && !firstFail) firstFail = v
    }
    const b = impl ? await bytes(H.msgs) : { raw: 0, gz: 0 }
    const counts: Record<number, number> = {}
    for (const m of H.msgs) counts[m[0]] = (counts[m[0]] ?? 0) + 1
    return {
      name,
      impl: implName,
      snapshotMs,
      snapshotMsgs,
      stepsWall,
      moTime: stats.moTime,
      moCalls: stats.moCalls,
      moMax: stats.moMax,
      msgs: H.msgs.length,
      bytes: b,
      counts,
      ok: firstFail === null && !stepErr,
      firstFail,
      stepErr,
      finalOk: verifies.length ? verifies[verifies.length - 1].ok : null,
    }
  },
  /** strong references the tracker keeps (current core only has this map) */
  trackedNodes() {
    const n = H.impl?.nodes
    return n ? n.getNodeCount() : null
  },
  async wideProbe(impl: string, n: number, kind: string) {
    const app = document.getElementById('app')!
    app.innerHTML = ''
    const l = document.createElement('div')
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i')
      if (kind === 'row') c.append(document.createElement('b'), 'txt')
      l.append(c)
    }
    app.append(l)
    H.msgs = []
    const send = (m: any) => H.msgs.push(m)
    const t = impl === 'current' ? makeCurrent(send) : makeNext(send, 'weakmap')
    t.start()
    const before = H.msgs.length
    let err = ''
    window.addEventListener('error', (e) => (err = String(e.message)), { once: true })
    l.append(document.createElement('u'))
    await tick(0)
    const created = H.msgs.slice(before).filter((m) => m[0] === 8).length
    // unrelated mutation afterwards, in a small container
    const b2 = H.msgs.length
    const small = document.createElement('p')
    app.append(small)
    await tick(0)
    small.append(document.createElement('em'))
    await tick(0)
    const later = H.msgs.slice(b2).filter((m) => m[0] === 8).length
    t.stop()
    return { n, created, later, err }
  },
  expected() {
    return expectedTree()
  },
  mirrorSer() {
    return H.mirrorAll().serialize()
  },
  dropMessages() {
    H.msgs = []
    H.mirror = new Mirror()
    H.applied = 0
  },
}

;(window as any).H = H
