import { serve } from '../lib/server.mjs'
import { launch } from '../lib/browser.mjs'
import { resolveTargets } from '../lib/targets.mjs'
import { scenarioRoutes } from './scenarios.mjs'

/** Top self-time functions while one impl runs one scenario. */
export async function runProfile(args) {
  const [scenario] = args.rest
  if (!scenario) throw new Error('usage: node cli.mjs profile <scenario> [--impl=next] [--top=25]')
  const impl = args.flags.impl ?? 'next'
  const top = args.num('top', 25)
  const [target] = resolveTargets({ ...args, flags: {} })
  const server = await serve(await scenarioRoutes([target]))
  const browser = await launch()
  try {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const cdp = await ctx.newCDPSession(page)
    await page.goto(`${server.base}${target.id}/`)
    await cdp.send('Profiler.enable')
    await cdp.send('Profiler.setSamplingInterval', { interval: 50 })
    await cdp.send('Profiler.start')
    await page.evaluate(([s, i]) => window.H.run(s, i), [scenario, impl])
    const { profile } = await cdp.send('Profiler.stop')

    const byId = new Map(profile.nodes.map((n) => [n.id, n]))
    const selfTime = new Map()
    profile.samples.forEach((id, k) => {
      const f = byId.get(id).callFrame
      if (f.functionName === '(idle)') return
      const key = `${f.functionName || '(anonymous)'} ${f.url.split('/').pop()}:${f.lineNumber}`
      selfTime.set(key, (selfTime.get(key) ?? 0) + (profile.timeDeltas[k] ?? 0))
    })
    const total = [...selfTime.values()].reduce((a, b) => a + b, 0)
    console.log(`${scenario} [${impl}], total ${(total / 1000).toFixed(1)}ms sampled`)
    for (const [k, v] of [...selfTime.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)) {
      console.log(`${(v / 1000).toFixed(1).padStart(8)}ms ${((100 * v) / total).toFixed(1).padStart(5)}%  ${k}`)
    }
    return 0
  } finally {
    await browser.close()
    await server.close()
  }
}
