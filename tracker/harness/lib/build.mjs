import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import * as esbuild from 'esbuild'
import { HARNESS, REPO, trackerPackage } from './paths.mjs'

/** impl name -> harness module, and the tracker sources it needs (older refs may lack them) */
const IMPLS = {
  default: {
    file: 'src/page/impls/default.ts',
    needs: ['main/app/observer/top_observer.ts', 'main/app/nodes/index.ts'],
  },
  next: {
    file: 'src/page/impls/next.ts',
    needs: ['main/app/observer/next_observer.ts', 'main/app/nodes/next_nodes.ts'],
  },
}

export const availableImpls = (workspace) => {
  const src = path.join(trackerPackage(workspace), 'src')
  return Object.keys(IMPLS).filter((n) => IMPLS[n].needs.every((f) => fs.existsSync(path.join(src, f))))
}

// `harness:impls` exports only the impls this tree can build
const implsPlugin = (names) => ({
  name: 'harness-impls',
  setup(b) {
    b.onResolve({ filter: /^harness:impls$/ }, () => ({ path: 'impls', namespace: 'harness' }))
    b.onLoad({ filter: /.*/, namespace: 'harness' }, () => ({
      resolveDir: HARNESS,
      loader: 'ts',
      contents:
        names.map((n, i) => `import i${i} from ${JSON.stringify(path.join(HARNESS, IMPLS[n].file))}`).join('\n') +
        `\nexport default { ${names.map((n, i) => `${JSON.stringify(n)}: i${i}`).join(', ')} }`,
    }))
  },
})

// the protocol declares its message types as `declare const enum` (inlined by tsc, no runtime
// object); esbuild needs the plain form to inline them. Older trees also commit a compiled
// messages.gen.js next to it, which has no enum at all.
const constEnums = {
  name: 'declared-const-enums',
  setup(b) {
    b.onResolve({ filter: /^\..*messages\.gen\.js$/ }, (args) => {
      const ts = path.resolve(args.resolveDir, args.path).replace(/\.js$/, '.ts')
      return fs.existsSync(ts) ? { path: ts } : undefined
    })
    b.onLoad({ filter: /messages\.gen\.ts$/ }, (args) => ({
      loader: 'ts',
      contents: fs.readFileSync(args.path, 'utf8').replace(/export declare const enum/g, 'export const enum'),
    }))
  },
}

const common = (workspace, plugins = []) => ({
  bundle: true,
  format: 'iife',
  target: 'es2022',
  logLevel: 'error',
  alias: { '@tracker': path.join(trackerPackage(workspace), 'src') },
  plugins: [constEnums, ...plugins],
})

/** Scenario page (window.H) against the tracker sources of `workspace`. */
export async function buildPage(workspace, outDir) {
  const impls = availableImpls(workspace)
  await esbuild.build({
    ...common(workspace, [implsPlugin(impls)]),
    entryPoints: [path.join(HARNESS, 'src/page/index.ts')],
    outfile: path.join(outDir, 'page.js'),
  })
  return impls
}

/** Feature checks (window.checks); built from this checkout only. */
export async function buildFeatures(workspace, outDir) {
  await esbuild.build({
    ...common(workspace),
    entryPoints: [path.join(HARNESS, 'src/features/index.ts')],
    outfile: path.join(outDir, 'features.js'),
  })
}

/** The real player (mcp_app ReplayEngine over player/src), window.replay(tuples). */
export async function buildReplay(outDir) {
  if (!fs.existsSync(path.join(REPO, 'player/node_modules'))) {
    throw new Error('player dependencies are missing: run `bun install` in player/ (needed for --replay and e2e)')
  }
  await esbuild.build({
    bundle: true,
    format: 'iife',
    target: 'es2022',
    logLevel: 'error',
    entryPoints: [path.join(HARNESS, 'src/replay/entry.ts')],
    outfile: path.join(outDir, 'replay.js'),
    alias: { '@openreplay/player': path.join(REPO, 'player/src') },
  })
}

/** Builds the tracker package of `workspace` (dist/lib/entry.js) unless it exists and `force` is off. */
export function buildTracker(workspace, { force }) {
  const pkg = trackerPackage(workspace)
  const entry = path.join(pkg, 'dist/lib/entry.js')
  if (!force && fs.existsSync(entry)) return entry
  console.log(`building tracker in ${path.relative(REPO, pkg) || '.'} ...`)
  const r = spawnSync('bun', ['run', 'build:fast'], { cwd: pkg, encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`tracker build failed in ${pkg}\n${r.stdout}${r.stderr}`)
  return entry
}
