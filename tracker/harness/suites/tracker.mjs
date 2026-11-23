// e2e / bytes / modules / leaks: the built tracker (dist/lib/entry.js) in a page, a fake ingest
// backend, and the messages taken where the page posts them to the tracker's worker.
import path from 'node:path'
import { buildTracker } from '../lib/build.mjs'
import { serve, pageHtml } from '../lib/server.mjs'
import { launch, captureWorkerMessages, memoryAfterGc, replayDiff } from '../lib/browser.mjs'
import { resolveTargets, columnLabel, messageNames } from '../lib/targets.mjs'
import { table, ratio, saveResults } from '../lib/report.mjs'
import { scenarioRoutes, listScenarios, matches } from './scenarios.mjs'

const BASE_OPTIONS = {
  projectKey: 'k',
  __DISABLE_SECURE_MODE: true,
  obscureTextEmails: true,
  inlineCss: 0,
  disableSprites: true,
  captureIFrames: true,
  network: { disabled: true },
  defaultInputMode: 0,
}
const MODES = { default: { nextObserver: false }, next: { nextObserver: true } }

const MODULES_BODY = `
<input id="name" placeholder="name"><textarea id="bio"></textarea>
<select id="sel"><option>a</option><option>b</option></select>
<input id="cb" type="checkbox"><button id="btn">Save</button>
<div id="scroller" style="height:60px;overflow:auto"><div style="height:600px">tall</div></div>
<iframe id="f" srcdoc="<input id='inner'><button id='ib'>in</button>"></iframe>`

async function setup(args, { replay = false } = {}) {
  const targets = resolveTargets(args)
  for (const t of targets) t.dist = buildTracker(t.workspace, { force: t.id === 'w' && !args.flags['no-build'] })
  const routes = await scenarioRoutes(targets, { replay })
  for (const t of targets) {
    routes[`/${t.id}/tracker.js`] = t.dist
    routes[`/${t.id}/modules`] = { body: pageHtml([], MODULES_BODY) }
    routes[`/${t.id}/blank`] = { body: pageHtml([]) }
  }
  const columns = []
  for (const t of targets) {
    for (const mode of args.list('modes', Object.keys(MODES))) {
      // without the next core, nextObserver would be ignored and the default core measured twice
      if (!t.impls.includes(mode)) {
        console.log(`skipping ${mode} on ${t.label}: not in that tree`)
        continue
      }
      columns.push({ target: t, mode, label: columnLabel(targets, t, mode) })
    }
  }
  return { targets, routes, columns }
}

const options = (base, col) => ({ ...BASE_OPTIONS, ingestPoint: base + 'ingest', ...MODES[col.mode] })

async function newPage(browser, base, url) {
  const ctx = await browser.newContext()
  await ctx.addInitScript(captureWorkerMessages)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text().slice(0, 200)))
  await page.goto(base + url)
  return { ctx, page, errors }
}

/** Runs a scenario under the real Tracker; `collect` picks what comes back from the page. */
async function runScenario(browser, base, col, name, collect) {
  const { ctx, page, errors } = await newPage(browser, base, `${col.target.id}/`)
  try {
    const r = await page.evaluate(
      async ([name, url, opts, collect]) => {
        const { default: Tracker } = await import(url)
        const sc = window.H.scenarios[name]
        const tick = (ms) => new Promise((r) => setTimeout(r, ms))
        if (sc.setup) await sc.setup()
        const tracker = new Tracker(opts)
        const started = await tracker.start()
        await tick(400)
        for (const step of sc.steps) {
          await step()
          await tick(Math.max(60, sc.settle ?? 0))
        }
        await tick(400)
        const out = { started: started?.success ?? !!started, msgs: window.__msgs.length }
        if (collect === 'tree') Object.assign(out, { tuples: window.__msgs, want: window.H.expected({ imgModule: true }) })
        if (collect === 'bytes') out.sizes = window.H.sizesByType(window.__msgs)
        return out
      },
      [name, `/${col.target.id}/tracker.js`, options(base, col), collect],
    )
    r.errors = errors
    if (collect === 'tree') {
      r.diff = r.started ? await replayDiff(ctx, base, r.tuples, r.want) : null
      delete r.tuples
      delete r.want
    }
    return r
  } finally {
    await ctx.close()
  }
}

async function scenarioList(browser, base, targets, args) {
  const all = await listScenarios(browser, base, targets[targets.length - 1])
  // perf scenarios take minutes through the full tracker: only when asked for by name
  return all.filter((s) => (args.rest.length ? matches(s.name, args.rest) : s.kind === 'correct'))
}

async function e2e(browser, base, ctx, args) {
  const { columns } = ctx
  const scenarios = await scenarioList(browser, base, ctx.targets, args)
  const rows = []
  for (const sc of scenarios) {
    const cells = []
    for (const col of columns) cells.push(await runScenario(browser, base, col, sc.name, 'tree'))
    rows.push({ name: sc.name, cells })
  }
  const cell = (r) => (!r.started ? 'NOSTART' : r.diff ? 'DIFF' : 'OK') + (r.errors.length ? ' !err' : '')
  const ok = (r) => r.started && !r.diff && !r.errors.length
  table(
    ['scenario', ...columns.map((c) => c.label)],
    [
      ...rows.map((row) => [row.name, ...row.cells.map(cell)]),
      ['passed', ...columns.map((_, i) => `${rows.filter((row) => ok(row.cells[i])).length}/${rows.length}`)],
    ],
  )
  console.log('\ncells: replay of the recorded messages by the real player vs the live DOM; !err = page errors')
  if (args.flags.verbose) {
    for (const row of rows) {
      row.cells.forEach((r, i) => {
        if (ok(r) && !r.errors.length) return
        console.log(`\n${row.name} [${columns[i].label}]`)
        if (r.errors.length) console.log('  errors:', r.errors.slice(0, 3).join(' | '))
        if (r.diff) console.log('  got :', r.diff.got, '\n  want:', r.diff.want)
      })
    }
  }
  return { rows, failed: rows.reduce((n, row) => n + row.cells.filter((r) => !ok(r)).length, 0) }
}

async function bytes(browser, base, ctx, args) {
  const { columns, targets } = ctx
  const scenarios = await scenarioList(browser, base, targets, args)
  const names = messageNames(targets[targets.length - 1].workspace)
  const rows = []
  const byType = {}
  for (const sc of scenarios) {
    const cells = []
    for (const [i, col] of columns.entries()) {
      const r = await runScenario(browser, base, col, sc.name, 'bytes')
      if (!r.started) throw new Error(`tracker failed to start for ${sc.name} [${col.label}]`)
      r.total = Object.values(r.sizes).reduce((n, v) => n + v.bytes, 0)
      for (const [type, v] of Object.entries(r.sizes)) {
        const e = (byType[names[type] ?? `type ${type}`] ??= columns.map(() => ({ n: 0, bytes: 0 })))
        e[i].n += v.n
        e[i].bytes += v.bytes
      }
      cells.push(r)
    }
    rows.push({ name: sc.name, cells })
  }
  const header = columns.map((c) => c.label)
  table(
    ['scenario', ...header],
    rows.map((row) => [
      row.name,
      ...row.cells.map((r, i) => `${r.total}${i ? ' ' + ratio(row.cells[0].total, r.total) : ''}`),
    ]),
  )
  console.log('\nencoded bytes by message type' + (args.flags.all ? '' : ' (types that differ between columns)'))
  const typeRows = Object.entries(byType)
    .filter(([, v]) => args.flags.all || v.some((c) => c.bytes !== v[0].bytes || c.n !== v[0].n))
    .sort(([, a], [, b]) => Math.abs(b[b.length - 1].bytes - b[0].bytes) - Math.abs(a[a.length - 1].bytes - a[0].bytes))
    .map(([type, v]) => [type, ...v.map((c) => `${c.bytes} (${c.n})`)])
  table(['type', ...header], typeRows)
  console.log('\ncells: encoded bytes as the worker writes them (type + size + body), x = first column / this column (above 1: this one is smaller); (count)')
  return { rows, byType, failed: 0 }
}

// what the interaction modules must have produced in MODULES_BODY after the scripted input
const MODULE_CHECKS = [
  ['input value', (r) => r.inputValues.includes('INPUT=Alice')],
  ['textarea value', (r) => r.inputValues.includes('TEXTAREA=hello')],
  ['select value', (r) => r.inputValues.includes('SELECT=b')],
  ['checkbox', (r) => r.checked.includes('INPUT=true')],
  ['click', (r) => r.clicks.some((c) => c.startsWith('BUTTON:Save'))],
  ['element scroll', (r) => r.scrolls.includes('DIV')],
  ['field added later', (r) => r.inputValues.includes('INPUT=late value')],
  ['iframe input', (r) => r.inputValues.includes('INPUT=in frame')],
  ['iframe click', (r) => r.clicks.some((c) => c.startsWith('BUTTON:in'))],
  ['no page errors', (r) => r.errors.length === 0],
]

async function modules(browser, base, ctx, args) {
  const { columns } = ctx
  const results = []
  for (const col of columns) {
    const { ctx: bctx, page, errors } = await newPage(browser, base, `${col.target.id}/modules`)
    try {
      await page.evaluate(
        async ([url, opts]) => {
          const { default: Tracker } = await import(url)
          window.tracker = new Tracker(opts)
          await window.tracker.start()
        },
        [`/${col.target.id}/tracker.js`, options(base, col)],
      )
      await page.waitForTimeout(500)
      await page.fill('#name', 'Alice')
      await page.fill('#bio', 'hello')
      await page.selectOption('#sel', 'b')
      await page.check('#cb')
      await page.click('#btn')
      await page.hover('#scroller')
      await page.mouse.wheel(0, 200)
      await page.evaluate(() => {
        const i = document.createElement('input')
        i.id = 'late'
        document.body.append(i)
      })
      await page.waitForTimeout(100)
      await page.fill('#late', 'late value')
      const frame = page.frameLocator('#f')
      await frame.locator('#inner').fill('in frame')
      await frame.locator('#ib').click()
      await page.waitForTimeout(700)
      const r = await page.evaluate(() => {
        const T = { SetNodeScroll: 16, SetInputValue: 18, SetInputChecked: 19, MouseClick: 68, CreateElementNode: 8 }
        const msgs = window.__msgs
        const tags = new Map()
        for (const m of msgs) if (m[0] === T.CreateElementNode) tags.set(m[1], m[4])
        const tag = (id) => tags.get(id) ?? (id === 0 ? 'HTML' : '?')
        const pick = (t) => msgs.filter((m) => m[0] === t)
        return {
          inputValues: pick(T.SetInputValue).map((m) => `${tag(m[1])}=${m[2]}`),
          checked: pick(T.SetInputChecked).map((m) => `${tag(m[1])}=${m[2]}`),
          clicks: pick(T.MouseClick).map((m) => `${tag(m[1])}:${m[3]}`),
          scrolls: pick(T.SetNodeScroll).filter((m) => m[3] > 0).map((m) => tag(m[1])),
        }
      })
      r.errors = errors
      results.push(r)
    } finally {
      await bctx.close()
    }
  }
  const rows = MODULE_CHECKS.map(([name, check]) => [name, ...results.map((r) => (check(r) ? 'OK' : 'FAIL'))])
  table(['check', ...columns.map((c) => c.label)], rows)
  if (args.flags.verbose) results.forEach((r, i) => console.log(`\n${columns[i].label}:`, JSON.stringify(r, null, 1)))
  return { results, failed: rows.reduce((n, row) => n + row.filter((c) => c === 'FAIL').length, 0) }
}

async function leaks(browser, base, ctx, args) {
  const columns = [{ target: ctx.targets[ctx.targets.length - 1], mode: 'none', label: 'none' }, ...ctx.columns]
  const rows = []
  for (const col of columns) {
    const { ctx: bctx, page } = await newPage(browser, base, `${col.target.id}/blank`)
    try {
      const cdp = await bctx.newCDPSession(page)
      await page.evaluate(
        async ([url, opts]) => {
          if (opts) {
            const { default: Tracker } = await import(url)
            window.tracker = new Tracker(opts)
            if (!(await window.tracker.start())?.success) throw new Error('tracker did not start')
          }
          const tick = (ms) => new Promise((r) => setTimeout(r, ms))
          const app = document.getElementById('app')
          for (let round = 0; round < 20; round++) {
            const w = document.createElement('div')
            for (let i = 0; i < 200; i++) {
              const card = document.createElement('div')
              const img = document.createElement('img')
              img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
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
          // the tracker's own message buffers drain in the meantime
          await tick(500)
        },
        [`/${col.target.id}/tracker.js`, col.mode === 'none' ? null : options(base, col)],
      )
      const mem = await memoryAfterGc(cdp)
      let late = null
      if (args.flags.late) {
        await page.waitForTimeout(36_000)
        late = await memoryAfterGc(cdp)
      }
      rows.push({ label: col.label, mem, late })
    } finally {
      await bctx.close()
    }
  }
  const fmt = (m) => (m ? `${m.nodes}n ${m.documents}d ${m.listeners}l ${m.heapMB}MB` : '')
  table(['tracker', 'after churn', ...(args.flags.late ? ['36 s later'] : [])], rows.map((r) => [r.label, fmt(r.mem), ...(args.flags.late ? [fmt(r.late)] : [])]))
  console.log('\n20 rounds of 200 cards (img + input + shadow host) added and removed; DOM nodes, documents, JS listeners, heap after GC')
  return { rows, failed: 0 }
}

const SUITES = { e2e, bytes, modules, leaks }

export async function runTrackerSuite(suite, args) {
  const ctx = await setup(args, { replay: suite === 'e2e' })
  const server = await serve(ctx.routes)
  const browser = await launch()
  try {
    const out = await SUITES[suite](browser, server.base, ctx, args)
    const file = saveResults(suite, {
      suite,
      targets: ctx.targets.map((t) => ({ label: t.label, sha: t.sha })),
      columns: ctx.columns.map((c) => c.label),
      ...out,
    })
    console.log(`results: ${path.relative(process.cwd(), file)}`)
    return args.flags.strict && out.failed ? 1 : 0
  } finally {
    await browser.close()
    await server.close()
  }
}
