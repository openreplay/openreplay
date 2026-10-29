import { chromium } from 'playwright-core'

export async function launch() {
  try {
    // SwiftShader: WebGL in headless without a GPU
    return await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  } catch (e) {
    if (/Executable doesn't exist/.test(String(e))) {
      throw new Error('Chromium for playwright-core is missing: run `bun run install-browser` in tracker/harness')
    }
    throw e
  }
}

/** Init script: collects every message batch the page posts to the tracker's worker into window.__msgs. */
export function captureWorkerMessages() {
  window.__msgs = []
  const post = Worker.prototype.postMessage
  Worker.prototype.postMessage = function (d, t) {
    if (Array.isArray(d)) for (const m of d) window.__msgs.push(m)
    return post.call(this, d, t)
  }
}

/** DOM counters and JS heap after forced GCs. */
export async function memoryAfterGc(cdp) {
  for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage')
  const dom = await cdp.send('Memory.getDOMCounters')
  const heap = await cdp.send('Runtime.getHeapUsage')
  return {
    documents: dom.documents,
    nodes: dom.nodes,
    listeners: dom.jsEventListeners,
    heapMB: +(heap.usedSize / 1048576).toFixed(2),
  }
}

/** Tracker serializations vs the expected tree differ only in these harmless ways. */
export function normalizeTree(x, origin) {
  return x
    .split(origin)
    .join('')
    .replace(/style="([^"]*)"/g, (m, v) => `style="${v.replace(/\\"/g, "'").replace(/\s*([:;,])\s*/g, '$1').replace(/\s+/g, ' ').trim().replace(/;$/, '')}"`)
    .replace(/<HTML style="color-scheme:normal">/, '<HTML>')
    .replace(/ autocomplete="[^"]*"/g, '')
}

export function firstDiff(a, b) {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  if (i === a.length && i === b.length) return null
  return { got: a.slice(Math.max(0, i - 100), i + 150), want: b.slice(Math.max(0, i - 100), i + 150) }
}

/** Replays tracker tuples through the real player in a fresh page and diffs against `want`. */
export async function replayDiff(ctx, base, tuples, want) {
  const page = await ctx.newPage()
  await page.goto(base + 'replay.html')
  const got = await page.evaluate((t) => window.replay(t), tuples)
  await page.close()
  const origin = base.replace(/\/$/, '')
  return firstDiff(normalizeTree(got, origin), normalizeTree(want, origin))
}
