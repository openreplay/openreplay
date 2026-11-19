import { parseArgs } from 'node:util'

import {
  DEFAULT_FEATURES,
  FEATURES,
  FRAMEWORKS,
  PRIVACY,
  STATE_LIBS,
  type Feature,
  type Framework,
  type Privacy,
  type StateLib,
} from './types.js'

export interface Flags {
  key?: string
  host?: string
  cloud: boolean
  framework?: Framework
  privacy?: Privacy
  features?: Feature[]
  assist?: boolean
  state?: StateLib[] | 'all'
  script: boolean
  html?: string[]
  entry?: string
  apiUrl?: string
  cwd: string
  yes: boolean
  dryRun: boolean
  skipInstall: boolean
  force: boolean
  help: boolean
  version: boolean
}

export const HELP = `Set up the OpenReplay tracker in this project.

Usage: npx @openreplay/wizard [options]

Without options it asks a few questions. With --yes it runs without prompts
(for CI and coding agents) and needs --key.

Options:
  --key <key>            project key (dashboard: Preferences > Projects)
  --host <url>           self-hosted OpenReplay URL, e.g. https://openreplay.example.com
  --cloud                use OpenReplay Cloud (default with --yes)
  --framework <name>     skip detection: ${FRAMEWORKS.join(', ')}
  --privacy <preset>     ${PRIVACY.join(', ')} (default: default)
  --features <list>      comma list, or none (default: ${DEFAULT_FEATURES.join(',')},
                         plus test-ids when found):
                           localhost       record on http://localhost in development
                           next-observer   tracker 20+ DOM observer
                           test-ids        data-testid/-cy/... as click labels (customAttributes)
                           network         request and response bodies
                           backend-header  X-OpenReplay-SessionToken on your API calls
                           numbers         mask numbers in page text
                           dnt             respect Do Not Track
                           inline-css      read stylesheets in the browser (inlineCss: 1)
                           iframes         cross-origin iframes (crossdomain)
                           analytics       product analytics (npm only)
  --api-url <url>        API that gets the session token header (default: same origin)
  --assist               add Assist (live sessions, co-browsing, calls)
  --state <list>         comma list of ${STATE_LIBS.join(', ')}, or all detected
  --script               use the CDN script tag instead of the npm package
  --html <files>         comma list of HTML files for the script tag
  --entry <file>         client entry to import the tracker from
  --cwd <dir>            project folder (default: current folder)
  -y, --yes              no prompts; use flags and defaults
  --dry-run              print the changes, write nothing
  --skip-install         don't install packages, print the command instead
  --force                continue when OpenReplay is already set up (with --yes)
  -h, --help             show this help
  -v, --version          show the version
`

function list<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  name: string,
): T[] | undefined {
  if (raw === undefined) return undefined
  if (raw === 'none' || raw === '') return []
  const items = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  for (const item of items) {
    if (!allowed.includes(item as T))
      throw new Error(`Unknown ${name} "${item}". Use: ${allowed.join(', ')}`)
  }
  return items as T[]
}

function one<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  name: string,
): T | undefined {
  if (raw === undefined) return undefined
  if (!allowed.includes(raw as T))
    throw new Error(`Unknown ${name} "${raw}". Use: ${allowed.join(', ')}`)
  return raw as T
}

export function parseFlags(argv: string[]): Flags {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      key: { type: 'string' },
      host: { type: 'string' },
      cloud: { type: 'boolean', default: false },
      framework: { type: 'string' },
      privacy: { type: 'string' },
      features: { type: 'string' },
      assist: { type: 'boolean' },
      state: { type: 'string' },
      script: { type: 'boolean', default: false },
      html: { type: 'string' },
      entry: { type: 'string' },
      'api-url': { type: 'string' },
      cwd: { type: 'string', default: '.' },
      yes: { type: 'boolean', short: 'y', default: false },
      'dry-run': { type: 'boolean', default: false },
      'skip-install': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
  })
  if (values.host && values.cloud) throw new Error('Use either --host or --cloud, not both')
  return {
    key: values.key?.trim(),
    host: values.host,
    cloud: values.cloud!,
    framework: one(values.framework, FRAMEWORKS, 'framework'),
    privacy: one(values.privacy, PRIVACY, 'privacy preset'),
    features: list(values.features, FEATURES, 'feature'),
    assist: values.assist,
    state: values.state === 'all' ? 'all' : list(values.state, STATE_LIBS, 'state library'),
    script: values.script!,
    html: values.html
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    entry: values.entry,
    apiUrl:
      values['api-url'] === undefined
        ? undefined
        : (normalizeApiUrl(values['api-url']) ?? bad('--api-url needs an http(s) URL')),
    cwd: values.cwd!,
    yes: values.yes!,
    dryRun: values['dry-run']!,
    skipInstall: values['skip-install']!,
    force: values.force!,
    help: values.help!,
    version: values.version!,
  }
}

function bad(message: string): never {
  throw new Error(message)
}

/** Prefix for `tokenUrlMatcher`, ending with `/` so `api.example.com.evil.io` doesn't match. */
export function normalizeApiUrl(input: string): string | undefined {
  try {
    const url = new URL(input.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    const href = `${url.origin}${url.pathname}`
    return href.endsWith('/') ? href : `${href}/`
  } catch {
    return undefined
  }
}

/** `https://or.example.com/ingest` or `or.example.com/1/sessions` → `https://or.example.com`; cloud → undefined. */
export function normalizeHost(input: string): string | undefined {
  let v = input.trim()
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`
  const url = new URL(v)
  if (url.hostname === 'app.openreplay.com' || url.hostname === 'api.openreplay.com')
    return undefined
  return url.origin
}

export function validateKey(key: string | undefined): string | undefined {
  if (!key?.trim()) return 'Paste the project key from Preferences > Projects'
  if (!/^[\w-]+$/.test(key.trim())) return 'A project key has only letters, digits, - and _'
  return undefined
}
