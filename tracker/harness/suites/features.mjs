import path from 'node:path'
import { CACHE, WORKSPACE } from '../lib/paths.mjs'
import { buildFeatures } from '../lib/build.mjs'
import { serve, pageHtml } from '../lib/server.mjs'
import { launch } from '../lib/browser.mjs'
import { table, saveResults } from '../lib/report.mjs'
import { matches } from './scenarios.mjs'

/** Runs window.checks from src/features against this checkout's tracker modules. */
export async function runFeatures(args) {
  const out = path.join(CACHE, 'build', 'features')
  await buildFeatures(WORKSPACE, out)
  const server = await serve({
    '/features.js': path.join(out, 'features.js'),
    '/': { body: pageHtml(['/features.js'], '') },
  })
  const browser = await launch()
  try {
    const probe = await browser.newPage()
    await probe.goto(server.base)
    const names = (await probe.evaluate(() => Object.keys(window.checks))).filter((n) => matches(n, args.rest))
    await probe.close()
    const rows = []
    let failed = 0
    for (const name of names) {
      const page = await browser.newPage()
      const errors = []
      page.on('pageerror', (e) => errors.push(String(e)))
      await page.goto(server.base)
      const r = await page.evaluate((n) => window.checks[n](), name).catch((e) => ({ ok: false, details: String(e) }))
      await page.close()
      if (!r.ok) failed++
      rows.push([name, r.ok ? 'OK' : 'FAIL', errors.length ? errors[0].slice(0, 120) : ''])
      if (!r.ok || args.flags.verbose) console.log(`${name}:`, JSON.stringify(r.details, null, 1))
    }
    table(['check', 'result', 'page errors'], rows)
    const file = saveResults('features', { suite: 'features', rows, failed })
    console.log(`results: ${path.relative(process.cwd(), file)}`)
    return args.flags.strict && failed ? 1 : 0
  } finally {
    await browser.close()
    await server.close()
  }
}
