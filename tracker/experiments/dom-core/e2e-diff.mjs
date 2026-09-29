// Same scripted scenario through the full Tracker in both modes: which message types differ, by encoded bytes.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('/Users/nikitamelnikov/Documents/work/work/openreplay/frontend/node_modules/playwright')
const dir = path.dirname(new URL(import.meta.url).pathname)
const trackerJs = fs.readFileSync(path.join(dir, '../../tracker/dist/lib/entry.js'))
const names = process.argv.slice(2)
const server = http.createServer((req, res) => {
  const u = req.url
  if (u === '/tracker.js') { res.setHeader('content-type', 'text/javascript'); return res.end(trackerJs) }
  if (u === '/page.js') { res.setHeader('content-type', 'text/javascript'); return res.end(fs.readFileSync(path.join(dir, 'dist/page.js'))) }
  if (u.startsWith('/ingest/')) {
    req.resume(); req.on('end', () => {
      res.setHeader('content-type', 'application/json')
      if (u.startsWith('/ingest/v1/web/start')) return res.end(JSON.stringify({ token: 't', userUUID: 'u', projectID: '1', sessionID: '42', delay: 0, beaconSizeLimit: 1e6, startTimestamp: Date.now(), protocolVersion: 1, canvasEnabled: false }))
      res.end('{}')
    }); return
  }
  res.setHeader('content-type', 'text/html')
  res.end('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div><script src="/page.js"></script></body></html>')
})
await new Promise((r) => server.listen(0, r))
const base = `http://127.0.0.1:${server.address().port}/`
const browser = await chromium.launch()
const NAMES = { 0: 'Timestamp', 4: 'PageLocation', 5: 'ViewportSize', 6: 'ViewportScroll', 7: 'CreateDocument', 8: 'CreateElementNode', 9: 'CreateTextNode', 10: 'MoveNode', 11: 'RemoveNode', 12: 'SetNodeAttribute', 13: 'RemoveNodeAttribute', 14: 'SetNodeData', 16: 'SetNodeScroll', 18: 'SetInputValue', 19: 'SetInputChecked', 20: 'MouseMove', 34: 'StringDictGlobal', 35: 'SetNodeAttributeDictGlobal', 60: 'SetNodeAttributeURLBased', 61: 'SetCSSDataURLBased', 65: 'SetNodeSlot', 70: 'CreateIFrameDocument', 115: 'UnbindNodes', 118: 'TabData' }
const total = { current: 0, next: 0 }
const byType = {}
for (const name of names) {
  for (const next of [false, true]) {
    const ctx = await browser.newContext()
    await ctx.addInitScript(() => {
      window.__msgs = []
      const post = Worker.prototype.postMessage
      Worker.prototype.postMessage = function (d, t) { if (Array.isArray(d)) for (const m of d) window.__msgs.push(m); return post.call(this, d, t) }
    })
    const page = await ctx.newPage()
    await page.goto(base)
    const sizes = await page.evaluate(async ([name, next, base]) => {
      const { default: Tracker } = await import('/tracker.js')
      const sc = window.H.scenarios[name]
      const tick = (ms) => new Promise((r) => setTimeout(r, ms))
      if (sc.setup) await sc.setup()
      const t = new Tracker({ projectKey: 'k', ingestPoint: base + 'ingest', __DISABLE_SECURE_MODE: true, nextObserver: next, network: { disabled: true }, inlineCss: 0 })
      await t.start()
      await tick(400)
      for (const step of sc.steps) { await step(); await tick(Math.max(60, sc.settle ?? 0)) }
      await tick(400)
      return window.H.sizesByType(window.__msgs)
    }, [name, next, base])
    const mode = next ? 'next' : 'current'
    for (const [t, v] of Object.entries(sizes)) {
      const k = NAMES[t] ?? `type ${t}`
      byType[k] ??= { current: { n: 0, bytes: 0 }, next: { n: 0, bytes: 0 } }
      byType[k][mode].n += v.n
      byType[k][mode].bytes += v.bytes
      total[mode] += v.bytes
    }
    await ctx.close()
  }
}
console.log(`total bytes: current ${total.current}, next ${total.next} (${(((total.next - total.current) / total.current) * 100).toFixed(2)}%)`)
for (const [k, v] of Object.entries(byType).sort((a, b) => Math.abs(b[1].next.bytes - b[1].current.bytes) - Math.abs(a[1].next.bytes - a[1].current.bytes))) {
  const d = v.next.bytes - v.current.bytes
  if (d === 0 && v.next.n === v.current.n) continue
  console.log(`${k.padEnd(28)} bytes ${String(v.current.bytes).padStart(8)} -> ${String(v.next.bytes).padStart(8)} (${d >= 0 ? '+' : ''}${d})   count ${v.current.n} -> ${v.next.n}`)
}
await browser.close(); server.close()
