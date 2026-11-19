import fs from 'node:fs'
import path from 'node:path'

import {
  exists,
  firstExisting,
  isDir,
  listFiles,
  readJson,
  readText,
  SOURCE_EXTS,
  toPosix,
} from './fsutil.js'
import type { Framework, NextInfo, PackageManager, Project, StateLib } from './types.js'

const LOCKFILES: [string, PackageManager][] = [
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['package-lock.json', 'npm'],
]

/** Lockfile or `packageManager` field here or in a parent folder (monorepos), then the runner. */
export function detectPm(root: string): PackageManager {
  let dir = path.resolve(root)
  for (;;) {
    for (const [file, pm] of LOCKFILES) {
      if (fs.existsSync(path.join(dir, file))) return pm
    }
    const field = readJson(path.join(dir, 'package.json'))?.packageManager
    if (typeof field === 'string') {
      const name = field.split('@')[0]
      if (name === 'npm' || name === 'yarn' || name === 'pnpm' || name === 'bun') return name
    }
    if (fs.existsSync(path.join(dir, '.git'))) break
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  const agent = process.env.npm_config_user_agent ?? ''
  if (agent.startsWith('pnpm')) return 'pnpm'
  if (agent.startsWith('yarn')) return 'yarn'
  if (agent.startsWith('bun')) return 'bun'
  return 'npm'
}

/** major.minor from a version or a range like `^15.3.1`; null for `latest`, `workspace:*`… */
export function parseVersion(v: string | undefined): [number, number] | null {
  const m = v?.match(/(\d+)(?:\.(\d+))?/)
  return m ? [Number(m[1]), Number(m[2] ?? 0)] : null
}

/** Installed version of a dependency, looking through parent node_modules too. */
export function installedVersion(root: string, pkg: string): string | undefined {
  const dir = installedPackageDir(root, pkg)
  const v = dir ? readJson(path.join(dir, 'package.json'))?.version : undefined
  return typeof v === 'string' ? v : undefined
}

/** Folder of an installed dependency, looking through parent node_modules (hoisting). */
export function installedPackageDir(root: string, pkg: string): string | undefined {
  let dir = path.resolve(root)
  for (;;) {
    const candidate = path.join(dir, 'node_modules', pkg)
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

const versionOf = (root: string, deps: Record<string, string>, pkg: string) =>
  installedVersion(root, pkg) ?? deps[pkg]

const STATE_DEPS: [StateLib, string[]][] = [
  ['redux', ['@reduxjs/toolkit', 'redux', 'react-redux']],
  ['zustand', ['zustand']],
  ['mobx', ['mobx']],
  ['pinia', ['pinia', '@pinia/nuxt']],
  ['vuex', ['vuex']],
  ['ngrx', ['@ngrx/store']],
]

const CSS_IN_JS = [
  '@emotion/react',
  '@emotion/css',
  'styled-components',
  '@stitches/react',
  'goober',
  'react-jss',
]

const ENTRY_CANDIDATES = [
  'src/main.tsx',
  'src/main.ts',
  'src/main.jsx',
  'src/main.js',
  'src/index.tsx',
  'src/index.ts',
  'src/index.jsx',
  'src/index.js',
]

/** Module script of a Vite `index.html`. */
function viteEntry(root: string): string | undefined {
  const html = readText(root, 'index.html')
  if (!html) return undefined
  for (const m of html.matchAll(/<script\b[^>]*>/gi)) {
    const tag = m[0]
    if (!/type\s*=\s*["']module["']/i.test(tag)) continue
    const src = tag.match(/src\s*=\s*["']([^"']+)["']/i)?.[1]
    if (!src || /^(https?:)?\/\//.test(src)) continue
    const rel = src.replace(/^\.?\//, '')
    if (exists(root, rel)) return rel
  }
  return undefined
}

function angularEntry(root: string): string | undefined {
  const cfg = readJson(path.join(root, 'angular.json'))
  const projects = cfg?.projects ?? {}
  const names = Object.keys(projects)
  const name =
    (cfg?.defaultProject && projects[cfg.defaultProject] ? cfg.defaultProject : undefined) ??
    names.find((n) => projects[n]?.projectType === 'application') ??
    names[0]
  const opts = name ? projects[name]?.architect?.build?.options : undefined
  const main = opts?.browser ?? opts?.main
  if (typeof main === 'string' && exists(root, main)) return toPosix(path.normalize(main))
  return firstExisting(root, ['src/main.ts'])
}

function nextInfo(root: string, version: string | undefined): NextInfo {
  const [major, minor] = parseVersion(version) ?? [0, 0]
  const appDir = firstExisting(root, ['app', 'src/app'])
  const pagesDir = firstExisting(root, ['pages', 'src/pages'])
  if (appDir) return { major, minor, router: 'app', dir: appDir }
  if (pagesDir) return { major, minor, router: 'pages', dir: pagesDir }
  return { major, minor, router: 'app', dir: isDir(root, 'src') ? 'src/app' : 'app' }
}

function nuxtDir(root: string, major: number): string {
  for (const f of ['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs']) {
    const src = readText(root, f)?.match(/srcDir\s*:\s*['"`]([^'"`]+)['"`]/)?.[1]
    if (src) return src.replace(/^\.\//, '').replace(/\/$/, '')
  }
  if (exists(root, 'app/app.vue') || isDir(root, 'app/pages')) return 'app'
  if (major >= 4 && isDir(root, 'app') && !exists(root, 'app.vue')) return 'app'
  return ''
}

function pickFramework(deps: Record<string, string>, hasPkg: boolean): Framework {
  if (!hasPkg) return 'html'
  if (deps.next) return 'next'
  if (deps.nuxt) return 'nuxt'
  if (deps['@angular/core']) return 'angular'
  if (deps['@react-router/dev']) return 'react-router'
  if (deps['@remix-run/react']) return 'remix'
  if (deps.react) return 'react'
  if (deps.vue) return 'vue'
  if (deps.vite) return 'vite'
  return 'js'
}

const NAMES: Record<Framework, string> = {
  next: 'Next.js',
  nuxt: 'Nuxt',
  angular: 'Angular',
  'react-router': 'React Router (framework mode)',
  remix: 'Remix',
  react: 'React',
  vue: 'Vue',
  vite: 'Vite',
  js: 'JavaScript app',
  html: 'Static HTML',
}

export const frameworkName = (f: Framework) => NAMES[f]

export function detect(rootArg: string, forced?: Framework): Project {
  const root = path.resolve(rootArg)
  const pkg = readJson(path.join(root, 'package.json'))
  const hasPackageJson = !!pkg
  const deps: Record<string, string> = { ...pkg?.devDependencies, ...pkg?.dependencies }
  const framework = forced ?? pickFramework(deps, hasPackageJson)
  const ts = exists(root, 'tsconfig.json') || !!deps.typescript
  const srcDir = isDir(root, 'src') ? 'src' : ''

  const project: Project = {
    root,
    framework,
    label: NAMES[framework],
    ts,
    pm: detectPm(root),
    hasPackageJson,
    deps,
    scripts: pkg?.scripts ?? {},
    configDir: srcDir,
    htmlFiles: [],
    state: STATE_DEPS.filter(([, names]) => names.some((n) => deps[n])).map(([lib]) => lib),
    cssInJs: CSS_IN_JS.filter((d) => deps[d]),
    trackerVersion: versionOf(root, deps, '@openreplay/tracker'),
    existing: [],
    testIds: [],
    iframes: false,
  }

  const version = (name: string) => {
    const v = parseVersion(versionOf(root, deps, name))
    return v ? `${v[0]}.${v[1]}` : ''
  }

  switch (framework) {
    case 'next': {
      const info = nextInfo(root, versionOf(root, deps, 'next'))
      project.next = info
      project.configDir = info.dir.startsWith('src/') ? 'src' : ''
      project.label = `Next.js ${version('next')} (${info.router === 'app' ? 'App' : 'Pages'} Router)`
      break
    }
    case 'nuxt': {
      const major = parseVersion(versionOf(root, deps, 'nuxt'))?.[0] ?? 0
      project.nuxtMajor = major
      project.nuxtDir = nuxtDir(root, major)
      project.configDir = project.nuxtDir
      project.label = `Nuxt ${major || ''}`.trim()
      break
    }
    case 'angular': {
      project.entry = angularEntry(root)
      project.configDir = project.entry ? path.posix.dirname(project.entry) : 'src'
      if (project.configDir === '.') project.configDir = ''
      project.label = `Angular ${version('@angular/core').split('.')[0]}`.trim()
      break
    }
    case 'react-router':
    case 'remix': {
      project.entry = firstExisting(root, [
        'app/entry.client.tsx',
        'app/entry.client.jsx',
        'app/entry.client.ts',
        'app/entry.client.js',
      ])
      project.configDir = 'app'
      const major = version(framework === 'remix' ? '@remix-run/react' : 'react-router').split(
        '.',
      )[0]
      project.label =
        framework === 'remix'
          ? `Remix ${major}`.trim()
          : `React Router ${major} (framework mode)`.replace('  ', ' ')
      break
    }
    case 'html': {
      project.configDir = ''
      break
    }
    default: {
      const cra = !!deps['react-scripts']
      const vite = !!deps.vite
      project.entry =
        (vite ? viteEntry(root) : undefined) ??
        (cra
          ? firstExisting(root, ['src/index.tsx', 'src/index.jsx', 'src/index.js', 'src/index.ts'])
          : undefined) ??
        firstExisting(root, ENTRY_CANDIDATES)
      if (project.entry) {
        const dir = path.posix.dirname(project.entry)
        project.configDir = dir === '.' ? '' : dir
      }
      if (framework === 'react' || framework === 'vue') {
        const tool = vite
          ? 'Vite'
          : cra
            ? 'Create React App'
            : framework === 'vue' && deps['@vue/cli-service']
              ? 'Vue CLI'
              : ''
        project.label = `${NAMES[framework]}${tool ? ` (${tool})` : ''}`
      }
    }
  }

  project.htmlFiles =
    framework === 'html'
      ? listFiles(root, [''], ['.html', '.htm'], 200, true)
      : listFiles(root, ['', 'public'], ['.html'], 200)
  scanSources(project)
  return project
}

const MARKERS = ['@openreplay/tracker', 'window.OpenReplay', 'static.openreplay.com']
const TEST_ID = /\bdata-(testid|test-id|test|cy|qa)\s*=/g
const IFRAME = /<iframe\b|createElement\(\s*['"]iframe['"]/i

/**
 * One pass over the sources: where OpenReplay is already wired in (so a second run doesn't
 * add a second tracker), test-id attributes and iframes.
 */
function scanSources(p: Project): void {
  const dirs = ['', 'src', 'app', 'pages', 'plugins', 'lib', 'utils', 'components', 'public']
  if (p.nuxtDir) dirs.push(`${p.nuxtDir}/plugins`)
  const files = listFiles(
    p.root,
    p.framework === 'html' ? [''] : dirs,
    [...SOURCE_EXTS, '.html', '.svelte'],
    3000,
    p.framework === 'html',
  )
  const testIds = new Map<string, number>()
  for (const f of files) {
    const text = readText(p.root, f)
    if (!text || text.length > 2_000_000) continue
    if (MARKERS.some((m) => text.includes(m))) p.existing.push(f)
    for (const m of text.matchAll(TEST_ID)) {
      const attr = `data-${m[1]}`
      testIds.set(attr, (testIds.get(attr) ?? 0) + 1)
    }
    if (!p.iframes && IFRAME.test(text)) p.iframes = true
  }
  p.testIds = [...testIds.entries()].sort((a, b) => b[1] - a[1]).map(([attr]) => attr)
}

/** Workspace packages (monorepo root) that look like a web app. */
export function workspaceApps(rootArg: string): string[] {
  const root = path.resolve(rootArg)
  const pkg = readJson(path.join(root, 'package.json'))
  let patterns: string[] = Array.isArray(pkg?.workspaces)
    ? pkg.workspaces
    : Array.isArray(pkg?.workspaces?.packages)
      ? pkg.workspaces.packages
      : []
  const pnpm = readText(root, 'pnpm-workspace.yaml')
  if (pnpm) {
    for (const m of pnpm.matchAll(/^\s*-\s*['"]?([^'"\n#]+?)['"]?\s*$/gm)) patterns.push(m[1])
  }
  patterns = patterns.filter((p) => !p.startsWith('!'))
  const dirs = new Set<string>()
  for (const pattern of patterns) {
    const base = pattern.replace(/\/\*\*?$/, '')
    if (base === pattern) {
      dirs.add(base)
      continue
    }
    try {
      for (const e of fs.readdirSync(path.join(root, base), { withFileTypes: true })) {
        if (e.isDirectory()) dirs.add(`${base}/${e.name}`)
      }
    } catch {}
  }
  return [...dirs]
    .filter((d) => {
      const child = readJson(path.join(root, d, 'package.json'))
      if (!child) return false
      const deps = { ...child.devDependencies, ...child.dependencies }
      return pickFramework(deps, true) !== 'js'
    })
    .sort()
}
