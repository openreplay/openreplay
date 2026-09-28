import http from 'node:http'; import fs from 'node:fs'; import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('/Users/nikitamelnikov/Documents/work/work/openreplay/frontend/node_modules/playwright')
const server = http.createServer((q, s) => q.url === '/f.js' ? s.end(fs.readFileSync('dist/features.js')) : s.end('<!doctype html><html><body><script src="/f.js"></script></body></html>'))
await new Promise((r) => server.listen(0, r))
const b = await chromium.launch()
for (const fn of process.argv.slice(2)) {
  const p = await b.newPage()
  p.on('pageerror', (e) => console.log('pageerror', String(e)))
  await p.goto(`http://127.0.0.1:${server.address().port}/`)
  console.log(fn, JSON.stringify(await p.evaluate(`window.${fn}()`), null, 1))
  await p.close()
}
await b.close(); server.close()
