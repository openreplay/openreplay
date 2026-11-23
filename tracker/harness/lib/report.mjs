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

/** `b` relative to `a`, as a speedup ("3.2x") or slowdown ("0.8x") of `b`. */
export const ratio = (a, b) => (a > 0 && b > 0 ? `${(a / b).toFixed(a / b >= 10 ? 0 : 1)}x` : '')

export function saveResults(suite, data) {
  fs.mkdirSync(RESULTS, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const file = path.join(RESULTS, `${suite}-${stamp}.json`)
  fs.writeFileSync(file, JSON.stringify(data, null, 1))
  return file
}
