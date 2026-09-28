// Full tracker, listener-bearing churn (images, shadow roots, form fields), DOM counters after GC.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('/Users/nikitamelnikov/Documents/work/work/openreplay/frontend/node_modules/playwright')
const dir = path.dirname(new URL(import.meta.url).pathname)
const trackerJs = fs.readFileSync(path.join(dir, '../../tracker/dist/lib/entry.js'))
const server = http.createServer((req, res) => {
  if (req.url === '/tracker.js') { res.setHeader('content-type', 'text/javascript'); return res.end(trackerJs) }
  if (req.url.startsWith('/ingest/')) {
    req.resume(); req.on('end', () => {
      res.setHeader('content-type', 'application/json')
      if (req.url.startsWith('/ingest/v1/web/start')) return res.end(JSON.stringify({ token: 't', userUUID: 'u', projectID: '1', sessionID: '42', delay: 0, beaconSizeLimit: 1e6, startTimestamp: Date.now(), protocolVersion: 1, canvasEnabled: false }))
      res.end('{}')
    }); return
  }
  res.setHeader('content-type', 'text/html'); res.end('<!doctype html><html><body><div id="app"></div></body></html>')
})
await new Promise((r) => server.listen(0, r))
const base = `http://127.0.0.1:${server.address().port}/`
const browser = await chromium.launch()
for (const mode of ['none', 'current', 'next']) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  await page.goto(base)
  await page.evaluate(async ([base, mode]) => {
    if (mode !== 'none') {
      const { default: Tracker } = await import('/tracker.js')
      window.tracker = new Tracker({ projectKey: 'k', ingestPoint: base + 'ingest', __DISABLE_SECURE_MODE: true, nextObserver: mode === 'next', network: { disabled: true } })
      await window.tracker.start()
    }
    const tick = (ms) => new Promise((r) => setTimeout(r, ms))
    const app = document.getElementById('app')
    for (let round = 0; round < 20; round++) {
      const w = document.createElement('div')
      for (let i = 0; i < 200; i++) {
        const card = document.createElement('div')
        const img = document.createElement('img')
        img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='
        card.append(img, document.createElement('input'))
        const host = document.createElement('x-card')
        host.attachShadow({ mode: 'open' }).innerHTML = '<p>shadow</p><b>x</b>'
        card.append(host)
        w.append(card)
      }
      app.append(w)
      await tick(60)
      w.remove()
      await tick(60)
    }
    // drop the tracker's own message buffers from the picture
    await tick(500)
  }, [base, mode])
  for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage')
  const d = await cdp.send('Memory.getDOMCounters')
  const h = await cdp.send('Runtime.getHeapUsage')
  let late = ''
  if (mode === 'current') {
    await new Promise((r) => setTimeout(r, 36000))
    for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage')
    const d2 = await cdp.send('Memory.getDOMCounters')
    const h2 = await cdp.send('Runtime.getHeapUsage')
    late = ` | after Maintainer: nodes=${d2.nodes} jsListeners=${d2.jsEventListeners} heap=${(h2.usedSize / 1048576).toFixed(1)}MB`
  }
  console.log(`${mode.padEnd(8)} nodes=${d.nodes} docs=${d.documents} jsListeners=${d.jsEventListeners} heap=${(h.usedSize / 1048576).toFixed(1)}MB${late}`)
  await ctx.close()
}
await browser.close(); server.close()
