/** `cli.mjs <suite> [filter...] [--key=value] [--flag]` */
export function parseArgs(argv) {
  const positional = []
  const flags = {}
  for (const a of argv) {
    if (!a.startsWith('--')) {
      positional.push(a)
      continue
    }
    const eq = a.indexOf('=')
    if (eq === -1) flags[a.slice(2)] = true
    else flags[a.slice(2, eq)] = a.slice(eq + 1)
  }
  const list = (k, d) => (typeof flags[k] === 'string' ? flags[k].split(',').filter(Boolean) : d)
  const num = (k, d) => {
    if (flags[k] === undefined) return d
    const v = Number(flags[k])
    if (!(v > 0)) throw new Error(`--${k} must be a positive number`)
    return v
  }
  return { suite: positional[0], rest: positional.slice(1), flags, list, num }
}
