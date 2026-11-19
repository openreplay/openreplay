import { importLine, type ImportSpec } from './transforms.js'
import type { Answers, DevFlag, Feature, Project, StateLib, Style } from './types.js'

/** First tracker major with the `nextObserver` DOM core (and its option type). */
export const NEXT_OBSERVER_MAJOR = 20
export const CLOUD_DASHBOARD = 'https://app.openreplay.com'
export const DOCS = 'https://docs.openreplay.com/en/sdk/'

export const STATE_PACKAGES: Record<StateLib, string> = {
  redux: '@openreplay/tracker-redux',
  zustand: '@openreplay/tracker-zustand',
  mobx: '@openreplay/tracker-mobx',
  pinia: '@openreplay/tracker-vuex',
  vuex: '@openreplay/tracker-vuex',
  ngrx: '@openreplay/tracker-ngrx',
}

/** What the config module exports for each state plugin. */
export const STATE_EXPORTS: Record<StateLib, string> = {
  redux: 'openReplayMiddleware',
  zustand: 'openReplayZustand',
  mobx: 'openReplayMobX',
  pinia: 'openReplayPinia',
  vuex: 'openReplayVuex',
  ngrx: 'openReplayMetaReducer',
}

export const STATE_LABELS: Record<StateLib, string> = {
  redux: 'Redux',
  zustand: 'Zustand',
  mobx: 'MobX',
  pinia: 'Pinia',
  vuex: 'Vuex',
  ngrx: 'NgRx',
}

export const ingestPoint = (host: string) => `${host}/ingest`
export const dashboardUrl = (a: Pick<Answers, 'host'>) => a.host ?? CLOUD_DASHBOARD

export function devFlagFor(p: Project): DevFlag {
  switch (p.framework) {
    case 'next':
      return 'node-env'
    case 'nuxt':
      return (p.nuxtMajor ?? 3) >= 3 ? 'nuxt' : 'node-env'
    case 'angular':
      return 'angular'
    case 'html':
      return 'hostname'
    default:
      if (p.deps.vite) return 'vite'
      if (p.deps['react-scripts'] || p.deps.webpack || p.deps['@vue/cli-service'] || p.deps.parcel)
        return 'node-env'
      return 'hostname'
  }
}

export const str = (v: string, s: Pick<Style, 'quote'>) =>
  s.quote + v.replace(/\\/g, '\\\\').replaceAll(s.quote, `\\${s.quote}`) + s.quote

function devExpr(flag: DevFlag, s: Style): string {
  switch (flag) {
    case 'vite':
      return 'import.meta.env.DEV'
    case 'nuxt':
      return 'import.meta.dev'
    case 'angular':
      return 'isDevMode()'
    case 'node-env':
      return `process.env.NODE_ENV === ${str('development', s)}`
    case 'hostname':
      return `location.hostname === ${str('localhost', s)}`
  }
}

export interface OptionContext {
  nextObserver: boolean
  /** Tracker < 20 types reject a partial `network` object. */
  fullNetwork: boolean
}

/** 19.x `network` defaults, written out when its types need every field. */
const NETWORK_DEFAULTS: [string, string][] = [
  ['failuresOnly', 'false'],
  ['ignoreHeaders', "['cookie', 'set-cookie', 'authorization']"],
  ['capturePayload', 'false'],
  ['sessionTokenHeader', 'false'],
  ['captureInIframes', 'true'],
]

function networkLines(a: Answers, s: Style, ctx: OptionContext): string[] {
  const fields: [string, string][] = []
  if (a.features.includes('network')) fields.push(['capturePayload', 'true'])
  if (a.features.includes('backend-header')) {
    fields.push(['sessionTokenHeader', 'true'])
    const prefix = a.apiUrl ? str(a.apiUrl, s) : `location.origin + ${str('/', s)}`
    fields.push(['tokenUrlMatcher', `(url) => url.startsWith(${prefix})`])
  }
  if (!fields.length) return []
  const quote = (v: string) => (s.quote === '"' ? v.replaceAll("'", '"') : v)
  const body = fields.map(([k, v]) => `${k}: ${v},`)
  if (ctx.fullNetwork) {
    const missing = NETWORK_DEFAULTS.filter(([k]) => !fields.some(([f]) => f === k))
    body.push(
      "// tracker 19's types want every network field",
      ...missing.map(([k, v]) => `${k}: ${quote(v)},`),
    )
  }
  if (body.length === 1) return [`network: { ${body[0].slice(0, -1)} },`]
  return ['network: {', ...body.map((l) => s.indent + l), '},']
}

/** Option lines for `configure()` / the snippet's `initOpts`, each ending with a comma. */
export function trackerOptions(a: Answers, flag: DevFlag, s: Style, ctx: OptionContext): string[] {
  const has = (f: Feature) => a.features.includes(f)
  const lines = [`projectKey: ${str(a.projectKey, s)},`]
  if (a.host) lines.push(`ingestPoint: ${str(ingestPoint(a.host), s)},`)
  if (has('localhost'))
    lines.push(
      `__DISABLE_SECURE_MODE: ${devExpr(flag, s)}, // record on http://localhost while developing`,
    )
  if (ctx.nextObserver) lines.push('nextObserver: true,')
  if (a.privacy === 'strict') lines.push('privateMode: true,')
  if (a.privacy === 'relaxed') lines.push('defaultInputMode: 0, // passwords stay hidden')
  if (has('numbers')) lines.push('obscureTextNumbers: true,')
  if (has('dnt')) lines.push('respectDoNotTrack: true,')
  if (has('test-ids') && a.testIdAttributes.length)
    lines.push(`customAttributes: [${a.testIdAttributes.map((x) => str(x, s)).join(', ')}],`)
  if (has('inline-css'))
    lines.push("inlineCss: 1, // read stylesheets in the browser; for CSS the backend can't fetch")
  if (has('iframes')) lines.push('crossdomain: { enabled: true },')
  lines.push(...networkLines(a, s, ctx))
  if (has('analytics')) lines.push('analytics: { active: true },')
  return lines
}

interface Body {
  imports: ImportSpec[]
  configure: string[]
  plugins: string[]
}

/**
 * The tracker setup shared by every npm flavor. `exportState` makes state plugins
 * importable by the user's stores (not possible from a Nuxt plugin file).
 */
function trackerBody(
  p: Project,
  a: Answers,
  s: Style,
  exportState: boolean,
  ctx: OptionContext,
): Body {
  const flag = devFlagFor(p)
  const semi = s.semi ? ';' : ''
  const imports: ImportSpec[] = []
  if (flag === 'angular' && a.features.includes('localhost'))
    imports.push({ source: '@angular/core', named: ['isDevMode'] })
  imports.push({ source: '@openreplay/tracker', named: ['tracker'] })
  const plugins: string[] = []
  const ex = exportState ? 'export ' : ''
  if (a.assist) {
    imports.push({ source: '@openreplay/tracker-assist', default: 'trackerAssist' })
    plugins.push(`tracker.use(trackerAssist())${semi}`)
  }
  const state = new Set(a.state)
  if (state.has('redux')) {
    imports.push({ source: STATE_PACKAGES.redux, default: 'trackerRedux' })
    plugins.push(`${ex}const openReplayMiddleware = tracker.use(trackerRedux())${semi}`)
  }
  if (state.has('zustand')) {
    imports.push({ source: STATE_PACKAGES.zustand, default: 'trackerZustand' })
    if (p.ts) {
      imports.push({ source: STATE_PACKAGES.zustand, named: ['StateLogger'], typeOnly: true })
      plugins.push(
        `${ex}const openReplayZustand = tracker.use(trackerZustand()) as unknown as StateLogger${semi}`,
      )
    } else {
      plugins.push(`${ex}const openReplayZustand = tracker.use(trackerZustand())${semi}`)
    }
  }
  if (state.has('mobx')) {
    imports.push({ source: STATE_PACKAGES.mobx, default: 'trackerMobX' })
    plugins.push(`${ex}const openReplayMobX = tracker.use(trackerMobX())${semi}`)
  }
  if (state.has('vuex') || state.has('pinia')) {
    imports.push({ source: STATE_PACKAGES.vuex, default: 'trackerVuex' })
    const vuexEx = state.has('vuex') ? ex : ''
    plugins.push(`${vuexEx}const openReplayVuex = tracker.use(trackerVuex())${semi}`)
    if (state.has('pinia') && p.framework !== 'nuxt') {
      if (p.ts) imports.push({ source: 'pinia', named: ['PiniaPluginContext'], typeOnly: true })
      const param = p.ts ? '{ store }: PiniaPluginContext' : '{ store }'
      plugins.push(
        `${ex}const openReplayPinia = (${param}) => openReplayVuex(store.$id)(store)${semi}`,
      )
    }
  }
  if (state.has('ngrx')) {
    imports.push({ source: STATE_PACKAGES.ngrx, default: 'trackerNgRx' })
    plugins.push(`${ex}const openReplayMetaReducer = tracker.use(trackerNgRx())${semi}`)
  }
  return { imports, configure: trackerOptions(a, flag, s, ctx), plugins }
}

const indentBlock = (lines: string[], indent: string) => lines.map((l) => (l ? indent + l : l))

export interface ModuleOptions extends OptionContext {
  /** The installed tracker ships docs/*.md; otherwise point to the docs site. */
  localDocs: boolean
}

function docsHeader(localDocs: boolean): string[] {
  if (!localDocs)
    return [
      `// OpenReplay tracker docs: ${DOCS}`,
      // the package exports ./docs/* (not ./docs), so name the files
      '// Docs for agents: @openreplay/tracker/docs/usage.md and @openreplay/tracker/docs/api.md',
    ]
  return [
    '// OpenReplay tracker docs, also meant for coding agents:',
    '//   node_modules/@openreplay/tracker/docs/usage.md  setup, privacy, frameworks, troubleshooting',
    '//   node_modules/@openreplay/tracker/docs/api.md    every method and option',
  ]
}

function configureCall(options: string[], s: Style): string[] {
  return ['tracker.configure({', ...indentBlock(options, s.indent), `})${s.semi ? ';' : ''}`]
}

/** `openreplay.ts`: configures, attaches plugins and starts the tracker when first imported. */
export function configModule(p: Project, a: Answers, s: Style, o: ModuleOptions): string {
  const b = trackerBody(p, a, s, true, o)
  const lines = [
    ...docsHeader(o.localDocs),
    ...b.imports.map((i) => importLine(i, s)),
    '',
    ...configureCall(b.configure, s),
    '',
  ]
  if (b.plugins.length) lines.push(...b.plugins, '')
  lines.push(`tracker.start()${s.semi ? ';' : ''}`)
  return `${lines.join('\n')}\n`
}

/** Nuxt 3+ client-only plugin. Pinia is hooked through `nuxtApp.$pinia` (@pinia/nuxt). */
export function nuxtPlugin(p: Project, a: Answers, s: Style, o: ModuleOptions): string {
  const b = trackerBody(p, a, s, false, o)
  const semi = s.semi ? ';' : ''
  const inner = [...configureCall(b.configure, s), '']
  if (b.plugins.length) inner.push(...b.plugins)
  if (a.state.includes('pinia'))
    inner.push(`nuxtApp.$pinia.use(({ store }) => openReplayVuex(store.$id)(store))${semi}`)
  if (b.plugins.length) inner.push('')
  inner.push(`tracker.start()${semi}`)
  const lines = [
    ...docsHeader(o.localDocs),
    ...b.imports.map((i) => importLine(i, s)),
    '',
    `export default defineNuxtPlugin((${a.state.includes('pinia') ? 'nuxtApp' : ''}) => {`,
    ...indentBlock(inner, s.indent),
    `})${semi}`,
  ]
  return `${lines.join('\n')}\n`
}

/** Client component for Next.js App Router < 15.3, rendered once in the root layout. */
export function nextClientComponent(configImport: string, s: Style): string {
  const semi = s.semi ? ';' : ''
  return [
    `${str('use client', s)}${semi}`,
    '',
    importLine({ source: configImport }, s),
    '',
    'export default function OpenReplay() {',
    `${s.indent}return null${semi}`,
    '}',
    '',
  ].join('\n')
}

export function nextPagesApp(configImport: string, ts: boolean, s: Style): string {
  const semi = s.semi ? ';' : ''
  const lines = ts
    ? [importLine({ source: 'next/app', named: ['AppProps'], typeOnly: true }, s)]
    : []
  lines.push(
    importLine({ source: configImport }, s),
    '',
    `export default function App({ Component, pageProps }${ts ? ': AppProps' : ''}) {`,
    `${s.indent}return <Component {...pageProps} />${semi}`,
    '}',
    '',
  )
  return lines.join('\n')
}

/** Default `app/entry.client.tsx` (what `react-router reveal` / `remix reveal` print). */
export function entryClient(kind: 'react-router' | 'remix', s: Style): string {
  const semi = s.semi ? ';' : ''
  const i = s.indent
  const router =
    kind === 'react-router'
      ? {
          spec: { source: 'react-router/dom', named: ['HydratedRouter'] },
          el: '<HydratedRouter />',
        }
      : { spec: { source: '@remix-run/react', named: ['RemixBrowser'] }, el: '<RemixBrowser />' }
  return [
    importLine({ source: 'react', named: ['startTransition', 'StrictMode'] }, s),
    importLine({ source: 'react-dom/client', named: ['hydrateRoot'] }, s),
    importLine(router.spec, s),
    '',
    'startTransition(() => {',
    `${i}hydrateRoot(`,
    `${i}${i}document,`,
    `${i}${i}<StrictMode>`,
    `${i}${i}${i}${router.el}`,
    `${i}${i}</StrictMode>,`,
    `${i})${semi}`,
    `})${semi}`,
    '',
  ].join('\n')
}

export function cdnUrl(assist: boolean): string {
  return `https://static.openreplay.com/latest/openreplay${assist ? '-assist' : ''}.js`
}

/**
 * Script-tag install: the CDN loader with a call queue, same as the dashboard's snippet.
 * The CDN serves the latest tracker, so `nextObserver` follows the answer; builds before
 * 20 ignore the option.
 */
export function htmlSnippet(a: Answers): string {
  const s: Style = { quote: "'", semi: true, indent: '  ' }
  const opts = trackerOptions(a, 'hostname', s, {
    nextObserver: a.features.includes('next-observer'),
    fullNetwork: false,
  })
  return [
    `<!-- OpenReplay, docs: ${DOCS} -->`,
    '<script>',
    '  var initOpts = {',
    ...opts.map((l) => `    ${l}`),
    '  };',
    '  var startOpts = {};',
    '  (function(A,s,a,y,e,r){',
    '    r=window.OpenReplay=[e,r,y,[s-1, e]];',
    "    s=document.createElement('script');s.src=A;s.async=!a;",
    "    document.getElementsByTagName('head')[0].appendChild(s);",
    '    r.start=function(v){r.push([0])};',
    '    r.stop=function(v){r.push([1])};',
    '    r.setUserID=function(id){r.push([2,id])};',
    '    r.setUserAnonymousID=function(id){r.push([3,id])};',
    '    r.setMetadata=function(k,v){r.push([4,k,v])};',
    '    r.event=function(k,p,i){r.push([5,k,p,i])};',
    '    r.issue=function(k,p){r.push([6,k,p])};',
    '    r.isActive=function(){return false};',
    '    r.getSessionToken=function(){};',
    `  })(${str(cdnUrl(a.assist), s)},1,0,initOpts,startOpts);`,
    '</script>',
  ].join('\n')
}
