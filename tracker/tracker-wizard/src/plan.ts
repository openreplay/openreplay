import fs from 'node:fs'
import path from 'node:path'

import {
  configModule,
  entryClient,
  htmlSnippet,
  NEXT_OBSERVER_MAJOR,
  nextClientComponent,
  nextPagesApp,
  nuxtPlugin,
  STATE_EXPORTS,
  STATE_LABELS,
  STATE_PACKAGES,
} from './codegen.js'
import { installedPackageDir, parseVersion } from './detect.js'
import { firstExisting, listFiles, readJson, readText, relativeImport } from './fsutil.js'
import {
  addImport,
  detectStyle,
  injectIntoHead,
  insertJsxChild,
  wirePinia,
  wireReduxToolkit,
} from './transforms.js'
import type { Answers, FileChange, ManualStep, Plan, Project, StateLib, Style } from './types.js'

/** Tracker major that introduced the `tracker` singleton the generated code uses. */
const MIN_TRACKER_MAJOR = 16

/** State libraries the wizard can hook for this project. */
export function stateChoices(p: Project): StateLib[] {
  if (p.framework === 'html') return []
  if (p.framework === 'nuxt')
    return p.deps['@pinia/nuxt'] && (p.nuxtMajor ?? 3) >= 3 ? ['pinia'] : []
  return p.state
}

function prettierStyle(root: string): Style | null {
  const cfg =
    readJson(path.join(root, '.prettierrc')) ??
    readJson(path.join(root, '.prettierrc.json')) ??
    readJson(path.join(root, 'package.json'))?.prettier
  if (!cfg || typeof cfg !== 'object') return null
  return {
    quote: cfg.singleQuote ? "'" : '"',
    semi: cfg.semi !== false,
    indent: cfg.useTabs ? '\t' : ' '.repeat(cfg.tabWidth ?? 2),
  }
}

export function projectStyle(p: Project, entry?: string): Style {
  const fromPrettier = prettierStyle(p.root)
  if (fromPrettier) return fromPrettier
  const candidates = [
    entry,
    p.next && `${p.next.dir}/layout.tsx`,
    p.next && `${p.next.dir}/layout.js`,
    p.next && `${p.next.dir}/_app.tsx`,
    p.nuxtDir !== undefined && `${p.nuxtDir ? `${p.nuxtDir}/` : ''}app.vue`,
    'app/root.tsx',
    'app/root.jsx',
    'src/main.ts',
    'src/main.tsx',
    'src/main.js',
  ].filter(Boolean) as string[]
  for (const c of candidates) {
    const text = readText(p.root, c)
    if (text) return detectStyle(text.replace(/^[\s\S]*?<script[^>]*>/, ''))
  }
  return detectStyle(null)
}

const SOURCE_DIRS = ['src', 'app', 'lib', 'store', 'stores', 'redux', 'state']
const CODE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts']

/** Source files whose text passes `test`. */
function findSources(p: Project, test: (text: string) => boolean): string[] {
  return listFiles(p.root, ['', ...SOURCE_DIRS], CODE_EXTS, 3000).filter((f) => {
    const text = readText(p.root, f)
    return !!text && test(text)
  })
}

const STATE_FILE_TESTS: Record<StateLib, (t: string) => boolean> = {
  redux: (t) => /\b(configureStore|createStore|legacy_createStore)\s*\(/.test(t),
  zustand: (t) => /from\s+['"]zustand['"]/.test(t) && /\bcreate(Store)?\s*\(/.test(t),
  mobx: (t) =>
    /from\s+['"]mobx['"]/.test(t) && /\b(makeAutoObservable|makeObservable|observable)\b/.test(t),
  pinia: (t) => /\bcreatePinia\s*\(/.test(t),
  vuex: (t) => /\b(createStore|Vuex\.Store)\b/.test(t) && /from\s+['"]vuex['"]/.test(t),
  ngrx: (t) => /\b(provideStore|StoreModule\.forRoot)\s*\(/.test(t),
}

function stateUsage(lib: StateLib, from: string): ManualStep {
  const name = STATE_EXPORTS[lib]
  const imp = `import { ${name} } from '${from}'`
  switch (lib) {
    case 'redux':
      return {
        title: 'Add the Redux middleware to your store',
        code: `${imp}\n\n// Redux Toolkit\nconfigureStore({\n  reducer,\n  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(${name}),\n})\n\n// plain Redux\ncreateStore(reducer, applyMiddleware(${name}))`,
      }
    case 'zustand':
      return {
        title: 'Wrap each Zustand store you want to see in replays',
        code: `${imp}\n\nconst useBearStore = create(\n  ${name}((set) => ({\n    bears: 0,\n    increase: () => set((s) => ({ bears: s.bears + 1 })),\n  }), 'bears'),\n)`,
      }
    case 'mobx':
      return {
        title: 'Observe your MobX stores',
        code: `${imp}\nimport { observe } from 'mobx'\n\nobserve(store, ${name})`,
      }
    case 'pinia':
      return { title: 'Add the Pinia plugin', code: `${imp}\n\npinia.use(${name})` }
    case 'vuex':
      return {
        title: 'Add the Vuex plugin to your store',
        code: `${imp}\n\nconst store = createStore({\n  // ...\n  plugins: [${name}('main')],\n})`,
      }
    case 'ngrx':
      return {
        title: 'Add the NgRx meta-reducer',
        code: `${imp}\n\nprovideStore(reducers, { metaReducers: [${name}] })\n// or, with NgModules\nStoreModule.forRoot(reducers, { metaReducers: [${name}] })`,
      }
  }
}

/** What the generated code may rely on in the tracker the project ends up with. */
export interface TrackerTarget {
  major?: number
  /** The package has docs/usage.md and docs/api.md. */
  docs: boolean
  /** Its types accept a partial `network` object. */
  partialNetwork: boolean
}

/** First release with docs/*.md in the package and partial `network` types (20.0.0 has both). */
const DOCS_AND_NETWORK_TYPES: [number, number, number] = [19, 1, 3]

/** `version` (or a range's lower bound) is at least `min`; false when unparsable. */
function atLeast(version: string | undefined, min: [number, number, number]): boolean {
  const m = version?.match(/(\d+)\.(\d+)\.(\d+)/)
  if (!m) return false
  const v = m.slice(1).map(Number)
  for (let i = 0; i < 3; i++) if (v[i] !== min[i]) return v[i] > min[i]
  return true
}

export const shipsDocs = (version?: string) => atLeast(version, DOCS_AND_NETWORK_TYPES)

/** The installed tracker, read from node_modules. */
export function installedTracker(root: string): TrackerTarget | undefined {
  const dir = installedPackageDir(root, '@openreplay/tracker')
  if (!dir) return undefined
  const version = readJson(path.join(dir, 'package.json'))?.version
  return {
    major: parseVersion(version)?.[0],
    docs: fs.existsSync(path.join(dir, 'docs', 'usage.md')),
    partialNetwork: atLeast(version, DOCS_AND_NETWORK_TYPES),
  }
}

/**
 * The tracker the project ends up with: the one it already has, or `latest` (the
 * registry's) when the wizard installs or upgrades it.
 */
export function targetTracker(p: Project, latest?: string): TrackerTarget {
  const current = parseVersion(p.trackerVersion)?.[0]
  if (p.deps['@openreplay/tracker'] && current !== undefined && current >= MIN_TRACKER_MAJOR) {
    return {
      major: current,
      docs: installedTracker(p.root)?.docs || shipsDocs(p.trackerVersion),
      partialNetwork: atLeast(p.trackerVersion, DOCS_AND_NETWORK_TYPES),
    }
  }
  return {
    major: parseVersion(latest)?.[0],
    docs: shipsDocs(latest),
    partialNetwork: atLeast(latest, DOCS_AND_NETWORK_TYPES),
  }
}

const isNextInstrumentation = (major: number, minor: number) =>
  major === 0 || major > 15 || (major === 15 && minor >= 3)

export function buildPlan(
  p: Project,
  a: Answers,
  tracker: TrackerTarget = { docs: false, partialNetwork: false },
): Plan {
  const files = new Map<string, FileChange>()
  const manual: ManualStep[] = []
  const notes: string[] = []
  const read = (rel: string) => readText(p.root, rel)
  const current = (rel: string) => files.get(rel)?.after ?? read(rel)
  const write = (rel: string, after: string) => {
    const prev = files.get(rel)
    files.set(rel, { path: rel, before: prev ? prev.before : read(rel), after })
  }
  const edit = (rel: string, fn: (code: string) => string | null): boolean => {
    const code = current(rel)
    if (code == null) return false
    const out = fn(code)
    if (out == null) return false
    if (out !== code) write(rel, out)
    return true
  }

  const finish = (packages: string[]): Plan => ({
    files: [...files.values()].filter((f) => f.before !== f.after),
    packages,
    manual: [...manual, ...featureSteps(a)],
    notes: [...notes, ...commonNotes(a)],
  })

  if (a.method === 'script') {
    const snippet = htmlSnippet(a)
    for (const f of a.htmlFiles) {
      edit(f, (html) =>
        /window\.OpenReplay\s*=|static\.openreplay\.com/.test(html)
          ? html
          : injectIntoHead(html, snippet),
      )
    }
    if (!a.htmlFiles.length) {
      manual.push({ title: 'Paste this before </head> on every page', code: snippet })
    }
    if (a.state.length)
      notes.push('State plugins need the npm package; the script tag install skips them.')
    return finish([])
  }

  const packages: string[] = []
  const currentMajor = parseVersion(p.trackerVersion)?.[0]
  if (!p.deps['@openreplay/tracker']) {
    packages.push('@openreplay/tracker')
  } else if (currentMajor !== undefined && currentMajor < MIN_TRACKER_MAJOR) {
    packages.push('@openreplay/tracker@latest')
    notes.push(
      `@openreplay/tracker ${p.trackerVersion} is upgraded to the latest major; check its changelog.`,
    )
  }
  if (a.assist && !p.deps['@openreplay/tracker-assist']) packages.push('@openreplay/tracker-assist')
  for (const lib of a.state) {
    const name = STATE_PACKAGES[lib]
    if (!p.deps[name] && !packages.includes(name)) packages.push(name)
  }

  const entry = a.entry ?? p.entry
  const style = projectStyle(p, entry)
  const ext = p.ts ? '.ts' : '.js'
  const moduleOptions = {
    nextObserver:
      a.features.includes('next-observer') && (tracker.major ?? 0) >= NEXT_OBSERVER_MAJOR,
    localDocs: tracker.docs,
    fullNetwork: p.ts && !tracker.partialNetwork,
  }

  if (p.framework === 'nuxt' && (p.nuxtMajor ?? 3) >= 3) {
    const dir = p.nuxtDir ? `${p.nuxtDir}/plugins` : 'plugins'
    write(`${dir}/openreplay.client${ext}`, nuxtPlugin(p, a, style, moduleOptions))
    return finishWithNotes()
  }

  const configPath = path.posix.join(p.configDir || '.', `openreplay${ext}`)
  write(configPath, configModule(p, a, style, moduleOptions))
  const importFrom = (file: string) => relativeImport(file, configPath)
  const sideEffect = (file: string) => (code: string) =>
    addImport(code, file, { source: importFrom(file) }, style, 'first')
  const importManually = (title: string) =>
    manual.push({ title, code: `import '${importFrom(entry ?? `${p.configDir}/main${ext}`)}'` })

  switch (p.framework) {
    case 'next': {
      const next = p.next!
      const base = next.dir.startsWith('src/') ? 'src/' : ''
      if (isNextInstrumentation(next.major, next.minor)) {
        const file =
          firstExisting(
            p.root,
            ['.ts', '.js', '.tsx', '.jsx'].map((x) => `${base}instrumentation-client${x}`),
          ) ?? `${base}instrumentation-client${ext}`
        if (current(file) == null) write(file, '')
        if (!edit(file, sideEffect(file))) importManually(`Import the tracker in ${file}`)
      } else if (next.router === 'app') {
        const comp = `${next.dir}/openreplay-client${p.ts ? '.tsx' : '.jsx'}`
        write(comp, nextClientComponent(importFrom(comp), style))
        const layout = firstExisting(
          p.root,
          ['.tsx', '.jsx', '.js', '.ts'].map((x) => `${next.dir}/layout${x}`),
        )
        const ok =
          !!layout &&
          edit(layout, (code) => {
            const withEl = insertJsxChild(code, layout, 'body', '<OpenReplay />', style)
            return (
              withEl &&
              addImport(
                withEl,
                layout,
                { source: './openreplay-client', default: 'OpenReplay' },
                style,
              )
            )
          })
        if (!ok) {
          manual.push({
            title: `Render <OpenReplay /> inside <body> of your root layout`,
            file: layout,
            code: `import OpenReplay from './openreplay-client'\n\n<body>\n  <OpenReplay />\n  {children}\n</body>`,
          })
        }
      } else {
        const app =
          firstExisting(
            p.root,
            ['.tsx', '.jsx', '.js', '.ts'].map((x) => `${next.dir}/_app${x}`),
          ) ?? `${next.dir}/_app${p.ts ? '.tsx' : '.js'}`
        if (current(app) == null) write(app, nextPagesApp(importFrom(app), p.ts, style))
        else if (!edit(app, sideEffect(app))) importManually(`Import the tracker in ${app}`)
      }
      break
    }
    case 'react-router':
    case 'remix': {
      const file = entry ?? `app/entry.client${p.ts ? '.tsx' : '.jsx'}`
      if (current(file) == null) write(file, entryClient(p.framework, style))
      if (!edit(file, sideEffect(file))) importManually(`Import the tracker in ${file}`)
      break
    }
    case 'nuxt': {
      manual.push({
        title: 'Nuxt 2: register the plugin in nuxt.config',
        code: `plugins: [{ src: '~/openreplay${ext}', mode: 'client' }]`,
      })
      break
    }
    default: {
      if (!entry)
        importManually('Import the tracker from your client entry (before the app renders)')
      else if (!edit(entry, sideEffect(entry))) importManually(`Import the tracker in ${entry}`)
    }
  }

  for (const lib of a.state) {
    if (lib === 'pinia') {
      const candidates = [entry, ...findSources(p, STATE_FILE_TESTS.pinia)].filter(
        (f, i, all): f is string =>
          !!f && all.indexOf(f) === i && /createPinia\s*\(/.test(current(f) ?? ''),
      )
      const file = candidates[0]
      const ok =
        candidates.length === 1 &&
        edit(file, (code) => {
          const wired = wirePinia(code, file, STATE_EXPORTS.pinia)
          return (
            wired &&
            addImport(
              wired,
              file,
              { source: importFrom(file), named: [STATE_EXPORTS.pinia] },
              style,
            )
          )
        })
      if (ok) continue
    }
    if (lib === 'redux') {
      const stores = findSources(
        p,
        (t) => /\bconfigureStore\s*\(/.test(t) && t.includes('@reduxjs/toolkit'),
      )
      const file = stores[0]
      const ok =
        stores.length === 1 &&
        edit(file, (code) => {
          const wired = wireReduxToolkit(code, file, STATE_EXPORTS.redux)
          return (
            wired &&
            addImport(
              wired,
              file,
              { source: importFrom(file), named: [STATE_EXPORTS.redux] },
              style,
            )
          )
        })
      if (ok) continue
    }
    const step = stateUsage(lib, importFrom(`${p.configDir || '.'}/store${ext}`))
    const found = findSources(p, STATE_FILE_TESTS[lib]).slice(0, 3)
    if (found.length) step.file = found.join(', ')
    manual.push(step)
  }

  return finishWithNotes()

  function finishWithNotes(): Plan {
    if (p.cssInJs.length)
      notes.push(
        `Uses ${p.cssInJs[0]}: if styles are missing in replays, add css: { scanInMemoryCSS: true } to configure().`,
      )
    return finish(packages)
  }
}

function featureSteps(a: Answers): ManualStep[] {
  if (!a.features.includes('iframes')) return []
  return [
    {
      title: 'Run a tracker inside the cross-origin iframe too',
      code: `// in the app the iframe loads, with the same project key
tracker.configure({
  projectKey: '${a.projectKey}',
  crossdomain: { enabled: true, parentDomain: 'https://<your site>' },
})
tracker.start()`,
    },
  ]
}

export function commonNotes(a: Answers): string[] {
  const notes: string[] = []
  if (a.privacy === 'strict')
    notes.push(
      'Private mode masks all text, inputs and network data. Mark safe areas with data-openreplay-unmask.',
    )
  if (a.features.includes('backend-header'))
    notes.push(
      a.apiUrl
        ? `Requests to ${a.apiUrl} get an X-OpenReplay-SessionToken header; that API must list it in Access-Control-Allow-Headers.`
        : 'Same-origin requests get an X-OpenReplay-SessionToken header to tie backend logs to replays.',
    )
  if (a.features.includes('network'))
    notes.push(
      'Request and response bodies are recorded. Passwords and tokens are masked; add network.sanitizer for other secrets.',
    )
  return notes
}

export const label = (lib: StateLib) => STATE_LABELS[lib]
