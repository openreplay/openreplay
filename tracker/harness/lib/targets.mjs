import fs from 'node:fs'
import path from 'node:path'
import { WORKSPACE, trackerPackage } from './paths.mjs'
import { prepareBaseline } from './baseline.mjs'

/**
 * Trees to run against: `--baseline=<git ref>` (first, so ratios read "vs baseline")
 * and this checkout ("work").
 */
export function resolveTargets(args) {
  const targets = []
  if (typeof args.flags.baseline === 'string') targets.push({ id: 'b', ...prepareBaseline(args.flags.baseline) })
  targets.push({ id: 'w', label: 'work', workspace: WORKSPACE })
  return targets
}

export const columnLabel = (targets, t, name) => (targets.length > 1 ? `${t.label}:${name}` : name)

/** Message type id -> name, from the tracker's generated protocol of that tree. */
export function messageNames(workspace) {
  const src = fs.readFileSync(path.join(trackerPackage(workspace), 'src/common/messages.gen.ts'), 'utf8')
  const block = src.slice(src.indexOf('enum Type'), src.indexOf('}', src.indexOf('enum Type')))
  const names = {}
  for (const [, name, id] of block.matchAll(/(\w+)\s*=\s*(\d+)/g)) names[id] = name
  return names
}
