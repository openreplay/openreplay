// Full Tracker (dist bundle) with a fake ingest backend; messages captured at Worker.postMessage,
// replayed through the real player and compared with the live DOM.
// node e2e.mjs [filter] [--next=true|false|both]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('/Users/nikitamelnikov/Documents/work/work/openreplay/frontend/node_modules/playwright')
const dir = path.dirname(new URL(import.meta.url).pathname)
const args = process.argv.slice(2)
const filter = args.find((a) => !a.startsWith('--')) ?? 'c_'
const modes = (args.find((a) => a.startsWith('--next='))?.split('=')[1] ?? 'both') === 'both' ? [false, true] : [args.find((a) => a.startsWith('--next=')).endsWith('true')]
const trackerJs = fs.readFileSync(path.join(dir, '../../tracker/dist/lib/entry.js'))
let ingested = 0
const server = http.createServer((req, res) => {
  const u = req.url
  if (u === '/tracker.js') { res.setHeader('content-type', 'text/javascript'); return res.end(trackerJs) }
  if (u === '/page.js' || u === '/replay.js' || u === '/replay.css') {
    res.setHeader('content-type', u.endsWith('.css') ? 'text/css' : 'text/javascript')
    return res.end(fs.readFileSync(path.join(dir, 'dist' + u)))
  }
  if (u === '/replay.html') return res.end('<!doctype html><html><head><link rel="stylesheet" href="/replay.css"></head><body><div id="host" style="width:1200px;height:800px;position:relative"></div><script src="/replay.js"></script></body></html>')
  if (u.startsWith('/ingest/')) {
    let body = []
    req.on('data', (c) => body.push(c))
    req.on('end', () => {
      res.setHeader('access-control-allow-origin', '*')
      res.setHeader('access-control-allow-headers', '*')
      res.setHeader('content-type', 'application/json')
      if (u.startsWith('/ingest/v1/web/start')) {
        return res.end(JSON.stringify({ token: 'tok', userUUID: 'u', projectID: '1', sessionID: '42', delay: 0, beaconSizeLimit: 1000000, startTimestamp: Date.now(), protocolVersion: 1, compressionThreshold: 24000, canvasEnabled: false }))
      }
      if (u.startsWith('/ingest/v1/web/i')) ingested += Buffer.concat(body).length
      res.end('{}')
    })
    return
  }
  res.setHeader('content-type', 'text/html')
  res.end('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div><script src="/page.js"></script></body></html>')
})
await new Promise((r) => server.listen(0, r))
const base = `http://127.0.0.1:${server.address().port}/`
const browser = await chromium.launch()
const scenarios = await (async () => {
  const p = await browser.newPage(); await p.goto(base)
  const s = await p.evaluate(() => Object.entries(window.H.scenarios).filter(([, v]) => v.kind === 'correct').map(([k]) => k))
  await p.close(); return s
})()
const norm = (x, origin) => x.split(origin).join('')
  .replace(/style="([^"]*)"/g, (m, v) => `style="${v.replace(/\\"/g, "'").replace(/\s+/g, '').replace(/;$/, '')}"`)
  .replace(/<HTML style="color-scheme:normal">/, '<HTML>').replace(/ autocomplete="[^"]*"/g, '')
for (const name of scenarios.filter((s) => s.includes(filter))) {
  for (const next of modes) {
    const ctx = await browser.newContext()
    await ctx.addInitScript(() => {
      window.__msgs = []
      const post = Worker.prototype.postMessage
      Worker.prototype.postMessage = function (d, t) {
        if (Array.isArray(d)) for (const m of d) window.__msgs.push(m)
        return post.call(this, d, t)
      }
    })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)) })
    await page.goto(base)
    const r = await page.evaluate(async ([name, next, base]) => {
      const { default: Tracker } = await import('/tracker.js')
      const sc = window.H.scenarios[name]
      const tick = (ms) => new Promise((r) => setTimeout(r, ms))
      if (sc.setup) await sc.setup()
      const tracker = new Tracker({ projectKey: 'k', ingestPoint: base + 'ingest', __DISABLE_SECURE_MODE: true, nextObserver: next, obscureTextEmails: true, inlineCss: 0, disableSprites: true, captureIFrames: true, network: { disabled: true }, defaultInputMode: 0 })
      const started = await tracker.start()
      await tick(400)
      for (const step of sc.steps) { await step(); await tick(Math.max(60, sc.settle ?? 0)) }
      await tick(400)
      return { started: started?.success ?? started, msgs: window.__msgs, want: window.H.expected() }
    }, [name, next, base])
    const rp = await ctx.newPage()
    await rp.goto(base + 'replay.html')
    const got = await rp.evaluate((t) => window.replay(t), r.msgs)
    const origin = base.replace(/\/$/, '')
    const a = norm(got, origin), b = norm(r.want, origin)
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++
    const ok = i === a.length && i === b.length
    console.log(`${name.padEnd(22)} ${next ? 'next   ' : 'current'} ${ok ? 'OK  ' : 'DIFF'} msgs=${r.msgs.length} started=${JSON.stringify(r.started)}${errors.length ? ' errors=' + JSON.stringify(errors.slice(0, 3)) : ''}`)
    if (!ok && process.env.PD) console.log('   got :', a.slice(Math.max(0, i - 100), i + 150), '\n   want:', b.slice(Math.max(0, i - 100), i + 150))
    await ctx.close()
  }
}
console.log('ingested bytes', ingested)
await browser.close(); server.close()
