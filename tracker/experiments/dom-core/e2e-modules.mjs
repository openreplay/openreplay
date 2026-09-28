// Module smoke test on the full Tracker: real user events, then check which interaction
// messages each mode produced and that they point at the right nodes.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('/Users/nikitamelnikov/Documents/work/work/openreplay/frontend/node_modules/playwright')
const dir = path.dirname(new URL(import.meta.url).pathname)
const trackerJs = fs.readFileSync(path.join(dir, '../../tracker/dist/lib/entry.js'))
const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<input id="name" placeholder="name"><textarea id="bio"></textarea><select id="sel"><option>a</option><option>b</option></select>
<input id="cb" type="checkbox"><button id="btn">Save</button>
<div id="scroller" style="height:60px;overflow:auto"><div style="height:600px">tall</div></div>
<iframe id="f" srcdoc="<input id='inner'><button id='ib'>in</button>"></iframe>
</body></html>`
const server = http.createServer((req, res) => {
  if (req.url === '/tracker.js') { res.setHeader('content-type', 'text/javascript'); return res.end(trackerJs) }
  if (req.url.startsWith('/ingest/')) {
    req.resume(); req.on('end', () => {
      res.setHeader('content-type', 'application/json')
      if (req.url.startsWith('/ingest/v1/web/start')) return res.end(JSON.stringify({ token: 't', userUUID: 'u', projectID: '1', sessionID: '42', delay: 0, beaconSizeLimit: 1e6, startTimestamp: Date.now(), protocolVersion: 1, canvasEnabled: false }))
      res.end('{}')
    }); return
  }
  res.setHeader('content-type', 'text/html'); res.end(html)
})
await new Promise((r) => server.listen(0, r))
const base = `http://127.0.0.1:${server.address().port}/`
const T = { SetNodeScroll: 16, SetInputValue: 18, SetInputChecked: 19, MouseClick: 68, InputChange: 112, SetNodeFocus: 58, CreateElementNode: 8 }
const browser = await chromium.launch()
const results = {}
for (const next of [false, true]) {
  const ctx = await browser.newContext()
  await ctx.addInitScript(() => {
    window.__msgs = []
    const post = Worker.prototype.postMessage
    Worker.prototype.postMessage = function (d, t) { if (Array.isArray(d)) for (const m of d) window.__msgs.push(m); return post.call(this, d, t) }
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(base)
  await page.evaluate(async ([base, next]) => {
    const { default: Tracker } = await import('/tracker.js')
    window.tracker = new Tracker({ projectKey: 'k', ingestPoint: base + 'ingest', __DISABLE_SECURE_MODE: true, nextObserver: next, defaultInputMode: 0, network: { disabled: true } })
    await window.tracker.start()
  }, [base, next])
  await page.waitForTimeout(500)
  await page.fill('#name', 'Alice')
  await page.fill('#bio', 'hello')
  await page.selectOption('#sel', 'b')
  await page.check('#cb')
  await page.click('#btn')
  await page.hover('#scroller'); await page.mouse.wheel(0, 200)
  // a field added later must be tracked too
  await page.evaluate(() => { const i = document.createElement('input'); i.id = 'late'; document.body.append(i) })
  await page.waitForTimeout(100)
  await page.fill('#late', 'late value')
  const frame = page.frameLocator('#f')
  await frame.locator('#inner').fill('in frame')
  await frame.locator('#ib').click()
  await page.waitForTimeout(700)
  const r = await page.evaluate((T) => {
    const msgs = window.__msgs
    const created = new Map()
    for (const m of msgs) if (m[0] === 8) created.set(m[1], m[4])
    const pick = (t) => msgs.filter((m) => m[0] === t)
    const tagOf = (id) => created.get(id) ?? (id === 0 ? 'HTML' : '?')
    return {
      inputValues: pick(T.SetInputValue).map((m) => `${tagOf(m[1])}=${m[2]}`),
      checked: pick(T.SetInputChecked).map((m) => `${tagOf(m[1])}=${m[2]}`),
      clicks: pick(T.MouseClick).map((m) => `${tagOf(m[1])}:${m[3]}`),
      scrolls: pick(T.SetNodeScroll).filter((m) => m[3] > 0).map((m) => tagOf(m[1])),
      inputChanges: pick(T.InputChange).map((m) => `${tagOf(m[1])}=${m[2]}`),
      total: msgs.length,
      byType: Object.entries(msgs.reduce((a, m) => ((a[m[0]] = (a[m[0]] ?? 0) + 1), a), {})).map(([k, v]) => k + ':' + v).join(' '),
    }
  }, T)
  results[next ? 'next' : 'current'] = { ...r, errors }
  await ctx.close()
}
for (const k of Object.keys(results.current)) {
  const a = JSON.stringify(results.current[k]), b = JSON.stringify(results.next[k])
  console.log(`${k.padEnd(13)} ${a === b ? 'same' : 'DIFFERENT'}\n  current: ${a}\n  next:    ${b}`)
}
await browser.close(); server.close()
