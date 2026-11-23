#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from './lib/args.mjs'
import { CACHE } from './lib/paths.mjs'
import { cleanBaselines } from './lib/baseline.mjs'

const HELP = `usage: node cli.mjs <suite> [filter...] [options]

DOM core (cores driven directly, messages checked against a mirror of the player tree):
  core      correctness scenarios + seeded fuzz          --replay  also replay through the real player
                                                          --verbose print the first mismatch of each failure
  perf      tracker time per scenario                    --reps=3
  memory    DOM nodes / listeners / heap after churn     --late    measure again after 36 s (maintainer pass)
  profile   CPU profile of one scenario                  profile <scenario> [--impl=next] [--top=25]

Full tracker (built dist, fake ingest, messages taken at the worker boundary):
  e2e       correctness scenarios through the real Tracker, replayed by the player
  bytes     encoded bytes per scenario and per message type
  modules   interaction modules smoke test (inputs, clicks, scroll, iframes)
  leaks     listener-bearing churn (images, shadow roots, inputs), memory after GC
  features  module checks in a real browser (WebGL capture, adoptedStyleSheets)

Other:
  list      scenarios and the impls each tree can run
  clean     remove baseline worktrees and build output   --results  also results/

Options:
  [filter...]          only scenarios whose name contains one of these
  --impls=default,next DOM cores to run (core/perf/memory); --modes=... for full-tracker suites
  --baseline=<ref>     also run against a git ref (branch, tag, sha), side by side
  --no-build           full-tracker suites: reuse this checkout's tracker dist
  --strict             exit 1 on any failure (core, e2e, modules, features)
  --timeout=120000     per scenario run, ms (core/perf/memory)
`

const args = parseArgs(process.argv.slice(2))

async function main() {
  switch (args.suite) {
    case 'core':
    case 'perf':
    case 'memory':
      return (await import('./suites/scenarios.mjs')).runScenarios(args.suite, args)
    case 'profile':
      return (await import('./suites/profile.mjs')).runProfile(args)
    case 'e2e':
    case 'bytes':
    case 'modules':
    case 'leaks':
      return (await import('./suites/tracker.mjs')).runTrackerSuite(args.suite, args)
    case 'features':
      return (await import('./suites/features.mjs')).runFeatures(args)
    case 'list':
      return (await import('./suites/list.mjs')).runList(args)
    case 'clean': {
      const n = cleanBaselines()
      fs.rmSync(path.join(CACHE, 'build'), { recursive: true, force: true })
      if (args.flags.results) fs.rmSync(path.join(CACHE, '..', 'results'), { recursive: true, force: true })
      console.log(`removed ${n} baseline worktree(s) and build output`)
      return 0
    }
    default:
      console.log(HELP)
      return args.suite && args.suite !== 'help' ? 1 : 0
  }
}

// exit only after stdout drains: pipes are async, a bare exit can cut the tables off
const exit = (code) => process.stdout.write('', () => process.exit(code))
main().then(
  (code) => exit(code ?? 0),
  (e) => {
    console.error(e instanceof Error ? e.message : e)
    exit(1)
  },
)
