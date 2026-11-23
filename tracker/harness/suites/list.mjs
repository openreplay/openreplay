import { serve } from '../lib/server.mjs'
import { launch } from '../lib/browser.mjs'
import { resolveTargets } from '../lib/targets.mjs'
import { scenarioRoutes, listScenarios, matches } from './scenarios.mjs'

export async function runList(args) {
  const targets = resolveTargets(args)
  const server = await serve(await scenarioRoutes(targets))
  const browser = await launch()
  try {
    for (const t of targets) console.log(`impls in ${t.label}: ${t.impls.join(', ')}`)
    const list = await listScenarios(browser, server.base, targets[targets.length - 1])
    for (const kind of ['correct', 'perf', 'memory']) {
      console.log(`\n${kind === 'correct' ? 'core / e2e' : kind}:`)
      for (const s of list.filter((x) => x.kind === kind && matches(x.name, args.rest))) console.log(`  ${s.name.padEnd(24)} ${s.note}`)
    }
    return 0
  } finally {
    await browser.close()
    await server.close()
  }
}
