// node run.mjs [filter] [--impls=current,next] [--reps=3]
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('/Users/nikitamelnikov/Documents/work/work/openreplay/frontend/node_modules/playwright')

const dir = path.dirname(new URL(import.meta.url).pathname)
const args = process.argv.slice(2)
const filter = args.find((a) => !a.startsWith('--')) ?? ''
const opt = (k, d) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d
const impls = opt('impls', 'current,next').split(',')
const reps = Number(opt('reps', '1'))

const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div><script src="/page.js"></script></body></html>`
const server = http.createServer((req, res) => {
  if (req.url === '/replay.js' || req.url === '/replay.css') {
    res.setHeader('content-type', req.url.endsWith('.js') ? 'text/javascript' : 'text/css')
    return res.end(fs.readFileSync(path.join(dir, 'dist' + req.url)))
  }
  if (req.url === '/replay.html') {
    res.setHeader('content-type', 'text/html')
    return res.end('<!doctype html><html><head><link rel="stylesheet" href="/replay.css"></head><body><div id="host" style="width:1200px;height:800px;position:relative"></div><script src="/replay.js"></script></body></html>')
  }
  if (req.url === '/page.js') {
    res.setHeader('content-type', 'text/javascript')
    return res.end(fs.readFileSync(path.join(dir, 'dist/page.js')))
  }
  res.setHeader('content-type', 'text/html')
  res.end(html)
})
await new Promise((r) => server.listen(0, r))
const base = `http://127.0.0.1:${server.address().port}/`

const browser = await chromium.launch({ headless: true })
const out = []

async function one(name, impl) {
  const T0 = Date.now()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  await page.goto(base)
  const names = await page.evaluate(() => Object.keys(window.H.scenarios))
  if (!names.includes(name)) throw new Error('unknown ' + name)
  const kind = await page.evaluate((n) => window.H.scenarios[n].kind, name)
  page.on('pageerror', (e) => console.log('   pageerror', name, impl, String(e).slice(0, 300)))
  const r = await Promise.race([
    page.evaluate(([n, i]) => window.H.run(n, i), [name, impl]),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + name + ' ' + impl)), Number(opt('timeout', '90000'))).unref()),
  ]).catch((e) => ({ name, impl, ok: false, stepErr: String(e), bytes: { raw: 0, gz: 0 }, moTime: 0, snapshotMs: 0 }))
  if (process.env.TIMING) console.log('  t run', Date.now() - T0)
  if (kind === 'correct' && args.includes('--replay') && r.msgs) {
    const tuples = await page.evaluate(() => window.H.msgs)
    const want = await page.evaluate(() => window.H.expected())
    const mirror = await page.evaluate(() => window.H.mirrorSer())
    const rp = await ctx.newPage()
    rp.on('pageerror', (e) => console.log('   replay pageerror', String(e).slice(0, 200)))
    await rp.goto(base + 'replay.html')
    const got = await rp.evaluate((t) => window.replay(t), tuples)
    const origin = base.replace(/\/$/, '')
    const norm = (x) =>
      x
        .split(origin).join('')
        .replace(/style="([^"]*)"/g, (m, v) => `style="${v.replace(/\\"/g, "'").replace(/\s+/g, '').replace(/;$/, '')}"`)
        .replace(/<HTML style="color-scheme:normal">/, '<HTML>')
        .replace(/ autocomplete="[^"]*"/g, '')
    const diff = (a0, b0) => {
      const a = norm(a0)
      const b = norm(b0)
      let i = 0
      while (i < a.length && i < b.length && a[i] === b[i]) i++
      return i === a.length && i === b.length ? null : { got: a.slice(Math.max(0, i - 100), i + 150), want: b.slice(Math.max(0, i - 100), i + 150) }
    }
    r.player = { vsExpected: diff(got, want), vsMirror: diff(got, mirror) }
  }
  if (kind === 'memory') {
    await page.evaluate(() => window.H.dropMessages())
    await new Promise((r) => setTimeout(r, 300))
    for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage')
    const dom = await cdp.send('Memory.getDOMCounters')
    const heap = await cdp.send('Runtime.getHeapUsage')
    r.mem = { documents: dom.documents, nodes: dom.nodes, listeners: dom.jsEventListeners, heapMB: +(heap.usedSize / 1048576).toFixed(2) }
    r.tracked = await page.evaluate(() => window.H.trackedNodes())
    if (args.includes('--late')) {
      // current core frees detached nodes only on its 30s Maintainer pass
      await new Promise((r) => setTimeout(r, 36000))
      for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage')
      const d2 = await cdp.send('Memory.getDOMCounters')
      const h2 = await cdp.send('Runtime.getHeapUsage')
      r.memLate = { documents: d2.documents, nodes: d2.nodes, listeners: d2.jsEventListeners, heapMB: +(h2.usedSize / 1048576).toFixed(2) }
      r.trackedLate = await page.evaluate(() => window.H.trackedNodes())
    }
  }
  await ctx.close()
  return r
}

const all = await (async () => {
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await p.goto(base)
  const n = await p.evaluate(() => Object.entries(window.H.scenarios).map(([k, v]) => [k, v.kind]))
  await ctx.close()
  return n
})()

for (const [name, kind] of all) {
  if (filter && !name.includes(filter)) continue
  const list = kind === 'correct' ? impls.filter((i) => i !== 'none') : impls
  for (const impl of list) {
    const runs = []
    for (let k = 0; k < (kind === 'correct' ? 1 : reps); k++) runs.push(await one(name, impl))
    // keep the median run by tracker cost
    runs.sort((a, b) => a.moTime + a.snapshotMs - (b.moTime + b.snapshotMs))
    const r = runs[Math.floor(runs.length / 2)]
    out.push(r)
    const f = (x) => (typeof x === 'number' ? x.toFixed(1) : x)
    const line = [
      name.padEnd(22),
      impl.padEnd(12),
      kind === 'correct' ? (r.ok ? 'OK  ' : 'FAIL') : '    ',
      `snap ${f(r.snapshotMs)}ms`,
      `mo ${f(r.moTime)}ms/${r.moCalls} max ${f(r.moMax)}`,
      `msgs ${r.msgs}`,
      `bytes ${r.bytes.raw}/${r.bytes.gz}gz`,
      r.mem ? `mem docs=${r.mem.documents} nodes=${r.mem.nodes} lsn=${r.mem.listeners} heap=${r.mem.heapMB}MB tracked=${r.tracked}` : '',
      r.memLate ? `| +36s docs=${r.memLate.documents} nodes=${r.memLate.nodes} lsn=${r.memLate.listeners} heap=${r.memLate.heapMB}MB tracked=${r.trackedLate}` : '',
    ].join('  ')
    console.log(line)
    if (r.player) {
      console.log('    player-replay:', r.player.vsExpected ? 'DIFF vs expected' : 'matches expected', '|', r.player.vsMirror ? 'DIFF vs mirror' : 'matches mirror')
      if (r.player.vsExpected && process.env.PD) console.log('      got :', r.player.vsExpected.got, '\n      want:', r.player.vsExpected.want)
    }
    if (!r.ok && kind === 'correct') {
      console.log('   ', r.stepErr ?? '', JSON.stringify(r.firstFail?.label), r.firstFail?.errors?.join(' | ') ?? '')
      if (r.firstFail?.ops && process.env.OPS) console.log('     ops:', r.firstFail.ops.join(' ; '), '\n     msgs:', r.firstFail.stepMsgs.join(' '))
      if (r.firstFail?.diff) {
        console.log('     got :', r.firstFail.diff.got)
        console.log('     want:', r.firstFail.diff.want)
      }
    }
  }
}

fs.writeFileSync(path.join(dir, `results${filter ? '-' + filter : ''}.json`), JSON.stringify(out, null, 1))
await browser.close()
server.close()
