import http from 'node:http'; import fs from 'node:fs'; import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('/Users/nikitamelnikov/Documents/work/work/openreplay/frontend/node_modules/playwright')
const html = `<!doctype html><html><head></head><body><div id="app"></div><script src="/page.js"></script></body></html>`
const server = http.createServer((q, s) => q.url === '/page.js' ? s.end(fs.readFileSync('dist/page.js')) : s.end(html))
await new Promise((r) => server.listen(0, r))
const b = await chromium.launch(); const c0 = await b.newContext(); const p0 = await c0.newPage(); const ctx = await b.newContext(); const p = await ctx.newPage()
p.on('console', (m) => console.log('console:', m.text().slice(0, 300)))
await p.goto(`http://127.0.0.1:${server.address().port}/`)
console.log(await p.evaluate(process.argv[2]))
await b.close(); server.close()
