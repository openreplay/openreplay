// core / perf / memory: scenarios from src/page/scenarios.ts run against the DOM cores directly
// (no worker, no transport), messages checked by a mirror of the player's tree semantics.
import fs from 'node:fs'
import path from 'node:path'
import { CACHE } from '../lib/paths.mjs'
import { buildPage, buildReplay } from '../lib/build.mjs'
import { serve, pageHtml, REPLAY_HTML } from '../lib/server.mjs'
import { launch, memoryAfterGc, replayDiff } from '../lib/browser.mjs'
import { resolveTargets, columnLabel } from '../lib/targets.mjs'
import { table, ms, ratio, saveResults } from '../lib/report.mjs'

const KIND = { core: 'correct', perf: 'perf', memory: 'memory' }
const cost = (r) => (r.snapshotMs ?? 0) + (r.moTime ?? 0)

/** Builds the scenario page of every target (served at /<id>/) and, if asked, the replay page. */
export async function scenarioRoutes(targets, { replay = false } = {}) {
  const routes = {}
  for (const t of targets) {
    const out = path.join(CACHE, 'build', t.id)
    t.impls = await buildPage(t.workspace, out)
    routes[`/${t.id}/page.js`] = path.join(out, 'page.js')
    routes[`/${t.id}/`] = { body: pageHtml([`/${t.id}/page.js`]) }
  }
  if (replay) {
    const out = path.join(CACHE, 'build', 'replay')
    await buildReplay(out)
    routes['/replay.js'] = path.join(out, 'replay.js')
    const css = path.join(out, 'replay.css')
    routes['/replay.css'] = fs.existsSync(css) ? css : { body: '', type: 'text/css' }
    routes['/replay.html'] = { body: REPLAY_HTML }
  }
  return routes
}

export async function listScenarios(browser, base, target) {
  const page = await browser.newPage()
  await page.goto(`${base}${target.id}/`)
  const list = await page.evaluate(() =>
    Object.entries(window.H.scenarios).map(([name, s]) => ({ name, kind: s.kind, note: s.note ?? '' })),
  )
  await page.close()
  return list
}

export const matches = (name, filters) => !filters.length || filters.some((f) => name.includes(f))

const progress = (msg) => process.stderr.isTTY && process.stderr.write(`\r\x1b[K${msg}`)

async function runOne(browser, base, col, name, opts) {
  const ctx = await browser.newContext()
  try {
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
    await page.goto(`${base}${col.target.id}/`)
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), opts.timeout).unref())
    const r = await Promise.race([page.evaluate(([n, i]) => window.H.run(n, i), [name, col.impl]), timeout]).catch(
      (e) => ({ ok: false, stepErr: String(e.message ?? e), msgs: 0, snapshotMs: 0, moTime: 0 }),
    )
    r.errors = errors
    if (opts.replay && r.msgs) {
      const [tuples, want] = await page.evaluate(() => [window.H.msgs, window.H.expected()])
      r.replayDiff = await replayDiff(ctx, base, tuples, want)
    }
    if (opts.kind === 'memory') {
      await page.evaluate(() => window.H.dropMessages())
      await page.waitForTimeout(300)
      const cdp = await ctx.newCDPSession(page)
      r.mem = await memoryAfterGc(cdp)
      r.tracked = await page.evaluate(() => window.H.trackedNodes())
      if (opts.late) {
        // the default core frees detached nodes on its 30 s maintainer pass
        await page.waitForTimeout(36_000)
        r.memLate = await memoryAfterGc(cdp)
        r.trackedLate = await page.evaluate(() => window.H.trackedNodes())
      }
    }
    return r
  } finally {
    await ctx.close()
  }
}

function coreCell(r, replay) {
  const mirror = r.ok ? 'OK' : 'FAIL'
  return (replay ? `${mirror}/${r.replayDiff ? 'diff' : 'ok'}` : mirror) + (r.errors?.length ? ' !err' : '')
}
const passed = (r) => r.ok && !r.errors?.length && !r.replayDiff

function perfCell(r, first) {
  if (!r.ok) return 'FAIL'
  let cell = ms(cost(r))
  if (first && first !== r && first.ok) {
    cell += ` ${ratio(cost(first), cost(r))}`
    // fewer messages for the same steps means the tree dropped something
    if (Math.abs(r.msgs - first.msgs) > first.msgs * 0.005) cell += ` msgs ${r.msgs - first.msgs > 0 ? '+' : ''}${r.msgs - first.msgs}`
  }
  return cell
}

function memCell(r, late) {
  if (!r.ok) return 'FAIL'
  const m = late ? r.memLate : r.mem
  return (m ? `${m.nodes}n ${m.documents}d ${m.listeners}l ${m.heapMB}MB` : '') + (r.errors?.length ? ' !err' : '')
}

function printFailures(rows, columns) {
  for (const row of rows) {
    row.cells.forEach((r, i) => {
      if (passed(r)) return
      console.log(`\n${row.name} [${columns[i].label}]`)
      if (r.stepErr) console.log('  error:', r.stepErr)
      if (r.errors?.length) console.log('  page errors:', r.errors.slice(0, 3).join(' | '))
      const f = r.firstFail
      if (f) {
        console.log(`  first mismatch at ${f.label}${f.errors?.length ? ': ' + f.errors.join(' | ') : ''}`)
        if (f.diff) console.log('  got :', f.diff.got, '\n  want:', f.diff.want)
      }
      if (r.replayDiff) console.log('  player got :', r.replayDiff.got, '\n  player want:', r.replayDiff.want)
    })
  }
}

export async function runScenarios(suite, args) {
  const kind = KIND[suite]
  const opts = {
    kind,
    replay: kind === 'correct' && !!args.flags.replay,
    late: kind === 'memory' && !!args.flags.late,
    timeout: args.num('timeout', 120_000),
  }
  const reps = kind === 'perf' ? args.num('reps', 3) : 1
  const targets = resolveTargets(args)
  const server = await serve(await scenarioRoutes(targets, opts))
  const browser = await launch()
  try {
    const wanted = args.list('impls', null)
    const columns = []
    if (kind === 'memory' && (!wanted || wanted.includes('none'))) {
      columns.push({ target: targets[targets.length - 1], impl: 'none', label: 'none' })
    }
    for (const t of targets) {
      for (const impl of wanted ?? t.impls) {
        if (impl === 'none') continue
        if (!t.impls.includes(impl)) {
          console.log(`skipping ${impl} on ${t.label}: not in that tree`)
          continue
        }
        columns.push({ target: t, impl, label: columnLabel(targets, t, impl) })
      }
    }
    const scenarios = (await listScenarios(browser, server.base, targets[targets.length - 1])).filter(
      (s) => s.kind === kind && matches(s.name, args.rest),
    )
    const rows = []
    for (const [n, sc] of scenarios.entries()) {
      const row = { name: sc.name, cells: [] }
      for (const col of columns) {
        progress(`[${n + 1}/${scenarios.length}] ${sc.name} ${col.label}`)
        const runs = []
        for (let k = 0; k < reps; k++) runs.push(await runOne(browser, server.base, col, sc.name, opts))
        // a timed-out run costs 0 and would win the median
        const good = runs.filter((r) => r.ok).sort((a, b) => cost(a) - cost(b))
        row.cells.push(good.length ? good[Math.floor(good.length / 2)] : runs[0])
      }
      rows.push(row)
    }
    progress('')

    const header = ['scenario', ...columns.map((c) => c.label)]
    let failed = 0
    if (kind === 'correct') {
      table(header, [
        ...rows.map((row) => [row.name, ...row.cells.map((r) => coreCell(r, opts.replay))]),
        ['passed', ...columns.map((_, i) => `${rows.filter((row) => passed(row.cells[i])).length}/${rows.length}`)],
      ])
      console.log(`\ncells: mirror check${opts.replay ? ' / real player replay vs live DOM' : ''}`)
      failed = rows.reduce((n, row) => n + row.cells.filter((r) => !passed(r)).length, 0)
      if (args.flags.verbose) printFailures(rows, columns)
    } else if (kind === 'perf') {
      table(header, rows.map((row) => [row.name, ...row.cells.map((r) => perfCell(r, row.cells[0]))]))
      console.log(`\ncells: tracker time (snapshot + MutationObserver callbacks), median of ${reps}; x = first column / this column (above 1: this one is faster)`)
    } else {
      table(header, rows.map((row) => [row.name, ...row.cells.map((r) => memCell(r, opts.late))]))
      console.log(`\ncells: DOM nodes, documents, JS listeners, heap after forced GC${opts.late ? ', 36 s later' : ''}`)
    }
    const file = saveResults(suite, {
      suite,
      targets: targets.map((t) => ({ label: t.label, sha: t.sha })),
      columns: columns.map((c) => c.label),
      rows,
    })
    console.log(`results: ${path.relative(process.cwd(), file)}`)
    return args.flags.strict && failed ? 1 : 0
  } finally {
    await browser.close()
    await server.close()
  }
}
