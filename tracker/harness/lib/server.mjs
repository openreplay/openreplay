import http from 'node:http'
import fs from 'node:fs'

const TYPES = { js: 'text/javascript', css: 'text/css', html: 'text/html', json: 'application/json' }

export const pageHtml = (scripts, body = '<div id="app"></div>') =>
  `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}${scripts
    .map((s) => `<script src="${s}"></script>`)
    .join('')}</body></html>`

export const REPLAY_HTML =
  '<!doctype html><html><head><link rel="stylesheet" href="/replay.css"></head><body>' +
  '<div id="host" style="width:1200px;height:800px;position:relative"></div><script src="/replay.js"></script></body></html>'

const GIF = Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64')
// assets scenarios reference by made-up paths: empty stylesheet, 1px image
const fixture = (url) =>
  url.endsWith('.css')
    ? { body: '', type: 'text/css' }
    : /\.(png|gif|jpe?g|webp|svg)$/.test(url)
      ? { body: GIF, type: 'image/gif' }
      : undefined

/** What the tracker's start request gets back from the fake backend. */
const startResponse = () => ({
  token: 'tok',
  userUUID: 'u',
  projectID: '1',
  sessionID: '42',
  delay: 0,
  beaconSizeLimit: 1_000_000,
  startTimestamp: Date.now(),
  protocolVersion: 1,
  compressionThreshold: 24000,
  canvasEnabled: false,
})

/**
 * Static routes plus a fake ingest backend under /ingest/.
 * `routes`: url -> absolute file path, or { body, type }.
 */
export async function serve(routes) {
  const ingest = { batches: 0, bytes: 0 }
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0]
    if (url.startsWith('/ingest/')) {
      const body = []
      req.on('data', (c) => body.push(c))
      req.on('end', () => {
        res.setHeader('access-control-allow-origin', '*')
        res.setHeader('access-control-allow-headers', '*')
        res.setHeader('content-type', 'application/json')
        if (url.startsWith('/ingest/v1/web/start')) return res.end(JSON.stringify(startResponse()))
        if (url.startsWith('/ingest/v1/web/i')) {
          ingest.batches++
          ingest.bytes += Buffer.concat(body).length
        }
        res.end('{}')
      })
      return
    }
    const route = routes[url] ?? fixture(url)
    if (route === undefined) {
      res.statusCode = 404
      return res.end()
    }
    const ext = (typeof route === 'string' ? route : url).split('.').pop()
    res.setHeader('content-type', route.type ?? TYPES[ext] ?? 'text/html')
    res.end(typeof route === 'string' ? fs.readFileSync(route) : route.body)
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}/`
  return { base, ingest, close: () => new Promise((r) => server.close(r)) }
}
