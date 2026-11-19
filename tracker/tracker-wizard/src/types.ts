export type Framework =
  'next' | 'nuxt' | 'angular' | 'react-router' | 'remix' | 'react' | 'vue' | 'vite' | 'js' | 'html'

export const FRAMEWORKS: Framework[] = [
  'next',
  'nuxt',
  'angular',
  'react-router',
  'remix',
  'react',
  'vue',
  'vite',
  'js',
  'html',
]

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'
export type StateLib = 'redux' | 'zustand' | 'mobx' | 'pinia' | 'vuex' | 'ngrx'
export type Privacy = 'default' | 'strict' | 'relaxed'
export type Feature =
  | 'localhost'
  | 'next-observer'
  | 'test-ids'
  | 'network'
  | 'backend-header'
  | 'numbers'
  | 'dnt'
  | 'inline-css'
  | 'iframes'
  | 'analytics'
export type Method = 'npm' | 'script'

export const STATE_LIBS: StateLib[] = ['redux', 'zustand', 'mobx', 'pinia', 'vuex', 'ngrx']
export const FEATURES: Feature[] = [
  'localhost',
  'next-observer',
  'test-ids',
  'network',
  'backend-header',
  'numbers',
  'dnt',
  'inline-css',
  'iframes',
  'analytics',
]
export const DEFAULT_FEATURES: Feature[] = ['localhost', 'next-observer']
export const PRIVACY: Privacy[] = ['default', 'strict', 'relaxed']

/** How generated code tells a development build from a production one. */
export type DevFlag = 'vite' | 'node-env' | 'angular' | 'nuxt' | 'hostname'

export interface NextInfo {
  major: number
  minor: number
  router: 'app' | 'pages'
  /** `app`, `src/app`, `pages` or `src/pages` */
  dir: string
}

export interface Project {
  root: string
  framework: Framework
  label: string
  ts: boolean
  pm: PackageManager
  hasPackageJson: boolean
  deps: Record<string, string>
  scripts: Record<string, string>
  /** Folder for the generated config module, relative to root ('' = root). */
  configDir: string
  /** Client entry, relative posix path. */
  entry?: string
  next?: NextInfo
  /** Nuxt source folder: '' (Nuxt 3) or 'app' (Nuxt 4). */
  nuxtDir?: string
  nuxtMajor?: number
  htmlFiles: string[]
  state: StateLib[]
  cssInJs: string[]
  /** Installed (or declared) @openreplay/tracker version. */
  trackerVersion?: string
  /** Files that already reference OpenReplay. */
  existing: string[]
  /** Test-id attributes used in the sources, most used first (`data-testid`, `data-cy`…). */
  testIds: string[]
  /** The sources render iframes. */
  iframes: boolean
}

export interface Answers {
  projectKey: string
  /** Self-hosted OpenReplay origin; undefined = OpenReplay Cloud. */
  host?: string
  method: Method
  privacy: Privacy
  features: Feature[]
  assist: boolean
  state: StateLib[]
  htmlFiles: string[]
  /** Overrides the detected client entry. */
  entry?: string
  /** `customAttributes` for click labels (filled from `Project.testIds`). */
  testIdAttributes: string[]
  /** URL prefix that gets the session token header; empty = same origin. */
  apiUrl?: string
}

export interface Style {
  quote: "'" | '"'
  semi: boolean
  indent: string
}

export interface FileChange {
  path: string
  before: string | null
  after: string
}

export interface ManualStep {
  title: string
  file?: string
  code?: string
}

export interface Plan {
  files: FileChange[]
  packages: string[]
  manual: ManualStep[]
  notes: string[]
}
