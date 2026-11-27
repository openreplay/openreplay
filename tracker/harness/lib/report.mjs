import fs from 'node:fs'
import path from 'node:path'
import { RESULTS } from './paths.mjs'

/** Prints an aligned table; `rows` are arrays of cells (strings or numbers). */
export function table(header, rows) {
  const all = [header, ...rows].map((r) => r.map((c) => String(c ?? '')))
  const widths = header.map((_, i) => Math.max(...all.map((r) => (r[i] ?? '').length)))
  const line = (r) => r.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd()
  console.log(line(all[0]))
  console.log(widths.map((w) => '-'.repeat(w)).join('  '))
  for (const r of all.slice(1)) console.log(line(r))
}

export const ms = (x) => (x >= 100 ? x.toFixed(0) : x.toFixed(1)) + 'ms'

const clock = (s) => (s >= 60 ? `${Math.floor(s / 60)}m${String(Math.floor(s % 60)).padStart(2, '0')}s` : `${Math.floor(s)}s`)

/**
 * One stderr line per finished run (count, elapsed, eta, result), so a long suite can be
 * followed in a log: `node cli.mjs e2e > run.log 2>&1 & tail -f run.log`. Tables stay on stdout.
 */
export function progress(total) {
  const start = Date.now()
  const width = String(total).length
  let done = 0
  return (label, result = '') => {
    done++
    const elapsed = (Date.now() - start) / 1000
    const eta = done < total ? ` eta ${clock((elapsed / done) * (total - done))}` : ''
    process.stderr.write(`[${String(done).padStart(width)}/${total} ${clock(elapsed)}${eta}] ${label}${result ? `  ${result}` : ''}\n`)
  }
}

/** `b` relative to `a`, as a speedup ("3.2x") or slowdown ("0.8x") of `b`. */
export const ratio = (a, b) => (a > 0 && b > 0 ? `${(a / b).toFixed(a / b >= 10 ? 0 : 1)}x` : '')

export function saveResults(suite, data) {
  fs.mkdirSync(RESULTS, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const file = path.join(RESULTS, `${suite}-${stamp}.json`)
  fs.writeFileSync(file, JSON.stringify(data, null, 1))
  return file
}
