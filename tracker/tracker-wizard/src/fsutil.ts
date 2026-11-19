import fs from 'node:fs'
import path from 'node:path'

export const toPosix = (p: string) => p.split(path.sep).join('/')

export function exists(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel))
}

export function isDir(root: string, rel: string): boolean {
  try {
    return fs.statSync(path.join(root, rel)).isDirectory()
  } catch {
    return false
  }
}

export function readText(root: string, rel: string): string | null {
  try {
    return fs.readFileSync(path.join(root, rel), 'utf8')
  } catch {
    return null
  }
}

export function readJson<T = any>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

/** First of `candidates` (relative paths) that exists under root. */
export function firstExisting(root: string, candidates: string[]): string | undefined {
  return candidates.find((c) => exists(root, c))
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.output',
  '.svelte-kit',
  '.angular',
  '.turbo',
  '.vercel',
  '.cache',
  '.react-router',
])

export const SOURCE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.vue']

/**
 * Files under `dirs` (relative to root) with one of `exts`, skipping build output
 * and dependencies. `''` lists the root itself, without descending unless `recurseRoot`.
 */
export function listFiles(
  root: string,
  dirs: string[],
  exts: string[],
  limit = 4000,
  recurseRoot = false,
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const visit = (rel: string, recurse: boolean) => {
    if (out.length >= limit || seen.has(rel)) return
    seen.add(rel)
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (out.length >= limit) return
      const child = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) {
        if (recurse && !SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) visit(child, true)
      } else if (exts.some((x) => e.name.endsWith(x)) && !e.name.endsWith('.d.ts')) {
        out.push(child)
      }
    }
  }
  for (const d of dirs) visit(d, d !== '' || recurseRoot)
  return out
}

/** Import specifier from `fromFile` to `toFile` (both relative to the same root), without extension. */
export function relativeImport(fromFile: string, toFile: string): string {
  let rel = path.posix.relative(path.posix.dirname(fromFile), toFile)
  rel = rel.replace(/\.(tsx?|jsx?|mjs|mts)$/, '')
  return rel.startsWith('.') ? rel : `./${rel}`
}
