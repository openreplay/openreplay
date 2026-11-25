import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, test } from 'bun:test'

import { detect, workspaceApps } from '../src/detect'
import { buildPlan, shipsDocs, targetTracker } from '../src/plan'
import type { Answers, Plan } from '../src/types'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'or-wizard-'))
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

let n = 0
function fixture(files: Record<string, string | object>): string {
  const root = path.join(tmp, String(n++))
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content, null, 2))
  }
  return root
}

const answers = (over: Partial<Answers> = {}): Answers => ({
  projectKey: 'KEY123',
  method: 'npm',
  privacy: 'default',
  features: ['localhost'],
  assist: false,
  state: [],
  htmlFiles: [],
  testIdAttributes: [],
  ...over,
})

const file = (plan: Plan, rel: string) => plan.files.find((f) => f.path === rel)

const VITE_MAIN = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`

describe('React + Vite', () => {
  const root = fixture({
    'package.json': {
      dependencies: {
        react: '^19.2.0',
        'react-dom': '^19.2.0',
        '@reduxjs/toolkit': '^2.9.0',
        'react-redux': '^9',
      },
      devDependencies: { vite: '^7.1.0', typescript: '~5.9.0', '@emotion/react': '^11' },
    },
    'tsconfig.json': '{}',
    'bun.lock': '',
    'index.html': '<div id="root"></div>\n<script type="module" src="/src/main.tsx"></script>\n',
    'src/main.tsx': VITE_MAIN,
    'src/app/store.ts': `import { configureStore } from '@reduxjs/toolkit'\nimport counter from './counter'\n\nexport const store = configureStore({\n  reducer: { counter },\n})\n`,
  })

  test('detects', () => {
    const p = detect(root)
    expect(p).toMatchObject({
      framework: 'react',
      label: 'React (Vite)',
      ts: true,
      pm: 'bun',
      entry: 'src/main.tsx',
      configDir: 'src',
      state: ['redux'],
      cssInJs: ['@emotion/react'],
    })
  })

  test('plan: config module, entry import, RTK middleware', () => {
    const plan = buildPlan(
      detect(root),
      answers({
        assist: true,
        state: ['redux'],
        host: 'https://or.example.com',
        features: ['localhost', 'network'],
      }),
    )
    expect(plan.packages).toEqual([
      '@openreplay/tracker',
      '@openreplay/tracker-assist',
      '@openreplay/tracker-redux',
    ])
    expect(file(plan, 'src/openreplay.ts')?.after).toMatchSnapshot()
    expect(file(plan, 'src/main.tsx')?.after.split('\n')[0]).toBe(`import './openreplay'`)
    expect(file(plan, 'src/app/store.ts')?.after).toBe(
      `import { configureStore } from '@reduxjs/toolkit'\nimport counter from './counter'\nimport { openReplayMiddleware } from '../openreplay'\n\nexport const store = configureStore({\n  reducer: { counter },\n  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(openReplayMiddleware),\n})\n`,
    )
    expect(plan.manual).toEqual([])
    expect(plan.notes.join('\n')).toContain('scanInMemoryCSS')
  })
})

describe('Next.js', () => {
  const layout = `import "./globals.css";\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>\n        {children}\n      </body>\n    </html>\n  );\n}\n`

  test('15.3+: instrumentation-client', () => {
    const root = fixture({
      'package.json': { dependencies: { next: '16.0.1', react: '19' } },
      'tsconfig.json': '{}',
      'src/app/layout.tsx': layout,
    })
    const p = detect(root)
    expect(p.label).toBe('Next.js 16.0 (App Router)')
    const plan = buildPlan(p, answers())
    expect(plan.files.map((f) => f.path).sort()).toEqual([
      'src/instrumentation-client.ts',
      'src/openreplay.ts',
    ])
    expect(file(plan, 'src/instrumentation-client.ts')?.after).toBe(`import "./openreplay";\n`)
    expect(file(plan, 'src/openreplay.ts')?.after).toContain(
      `__DISABLE_SECURE_MODE: process.env.NODE_ENV === "development"`,
    )
  })

  test('existing instrumentation-client gets the import', () => {
    const root = fixture({
      'package.json': { dependencies: { next: '^15.5.0' } },
      'app/layout.js': layout,
      'instrumentation-client.js': `import * as Sentry from "@sentry/nextjs";\n\nSentry.init({});\n`,
    })
    const plan = buildPlan(detect(root), answers())
    expect(file(plan, 'instrumentation-client.js')?.after).toBe(
      `import "./openreplay";\nimport * as Sentry from "@sentry/nextjs";\n\nSentry.init({});\n`,
    )
  })

  test('< 15.3 App Router: client component in the root layout', () => {
    const root = fixture({
      'package.json': { dependencies: { next: '14.2.3' } },
      'tsconfig.json': '{}',
      'app/layout.tsx': layout,
    })
    const plan = buildPlan(detect(root), answers())
    expect(file(plan, 'app/openreplay-client.tsx')?.after).toBe(
      `"use client";\n\nimport "../openreplay";\n\nexport default function OpenReplay() {\n  return null;\n}\n`,
    )
    const out = file(plan, 'app/layout.tsx')!.after
    expect(out).toContain(
      `import "./globals.css";\nimport OpenReplay from "./openreplay-client";\n`,
    )
    expect(out).toContain(`      <body>\n        <OpenReplay />\n        {children}`)
  })

  test('< 15.3 Pages Router without _app: creates it', () => {
    const root = fixture({
      'package.json': { dependencies: { next: '13.5.0' } },
      'tsconfig.json': '{}',
      'pages/index.tsx': 'export default () => null\n',
    })
    const plan = buildPlan(detect(root), answers())
    expect(file(plan, 'pages/_app.tsx')?.after).toMatchSnapshot()
  })
})

describe('Nuxt', () => {
  test('Nuxt 4 + @pinia/nuxt: client plugin wires Pinia', () => {
    const root = fixture({
      'package.json': { dependencies: { nuxt: '^4.1.0', pinia: '^3', '@pinia/nuxt': '^0.11' } },
      'tsconfig.json': '{}',
      'app/app.vue': '<template><NuxtPage /></template>\n',
    })
    const p = detect(root)
    expect(p).toMatchObject({ framework: 'nuxt', nuxtDir: 'app', label: 'Nuxt 4' })
    const plan = buildPlan(p, answers({ state: ['pinia'], assist: true }))
    expect(plan.files.map((f) => f.path)).toEqual(['app/plugins/openreplay.client.ts'])
    expect(plan.files[0].after).toMatchSnapshot()
  })
})

describe('Angular', () => {
  const root = fixture({
    'package.json': { dependencies: { '@angular/core': '^20.3.0', '@ngrx/store': '^20' } },
    'tsconfig.json': '{}',
    'angular.json': {
      projects: {
        shop: {
          projectType: 'application',
          architect: { build: { options: { browser: 'src/main.ts' } } },
        },
      },
    },
    'src/main.ts': `import { bootstrapApplication } from '@angular/platform-browser';\nimport { appConfig } from './app/app.config';\nimport { App } from './app/app';\n\nbootstrapApplication(App, appConfig)\n  .catch((err) => console.error(err));\n`,
    'src/app/app.config.ts': `import { provideStore } from '@ngrx/store';\nexport const appConfig = { providers: [provideStore()] };\n`,
  })
  test('imports in main.ts, ngrx left as a manual step', () => {
    const plan = buildPlan(detect(root), answers({ state: ['ngrx'] }))
    const config = file(plan, 'src/openreplay.ts')!.after
    expect(config.split('\n').find((l) => !l.startsWith('//'))).toBe(
      `import { isDevMode } from '@angular/core';`,
    )
    expect(config).toContain('__DISABLE_SECURE_MODE: isDevMode(),')
    expect(config).toContain('export const openReplayMetaReducer = tracker.use(trackerNgRx());')
    expect(file(plan, 'src/main.ts')!.after.split('\n')[0]).toBe(`import './openreplay';`)
    expect(plan.manual).toHaveLength(1)
    expect(plan.manual[0].file).toBe('src/app/app.config.ts')
  })
})

describe('Vue + Vite (JS) with Pinia', () => {
  test('wires createPinia() in main.js', () => {
    const root = fixture({
      'package.json': {
        dependencies: { vue: '^3.5', pinia: '^3' },
        devDependencies: { vite: '^7' },
      },
      'package-lock.json': '{}',
      'index.html': '<script type="module" src="/src/main.js"></script>',
      'src/main.js': `import { createApp } from 'vue'\nimport { createPinia } from 'pinia'\nimport App from './App.vue'\n\nconst app = createApp(App)\napp.use(createPinia())\napp.mount('#app')\n`,
    })
    const plan = buildPlan(detect(root), answers({ state: ['pinia'] }))
    expect(file(plan, 'src/main.js')!.after).toBe(
      `import { openReplayPinia } from './openreplay'\nimport { createApp } from 'vue'\nimport { createPinia } from 'pinia'\nimport App from './App.vue'\n\nconst app = createApp(App)\napp.use(createPinia().use(openReplayPinia))\napp.mount('#app')\n`,
    )
    expect(file(plan, 'src/openreplay.js')!.after).toContain(
      `export const openReplayPinia = ({ store }) => openReplayVuex(store.$id)(store)`,
    )
    expect(plan.packages).toEqual(['@openreplay/tracker', '@openreplay/tracker-vuex'])
  })
})

describe('React Router framework mode', () => {
  test('creates app/entry.client.tsx with the import', () => {
    const root = fixture({
      'package.json': {
        dependencies: { 'react-router': '^7.9', react: '19' },
        devDependencies: { '@react-router/dev': '^7.9', vite: '^7' },
      },
      'tsconfig.json': '{}',
      'app/root.tsx': 'export default 1\n',
    })
    const plan = buildPlan(detect(root), answers())
    expect(file(plan, 'app/openreplay.ts')?.after).toContain('import.meta.env.DEV')
    expect(file(plan, 'app/entry.client.tsx')?.after).toMatchSnapshot()
  })
})

describe('Create React App', () => {
  test('src/index.js, NODE_ENV flag', () => {
    const root = fixture({
      'package.json': { dependencies: { react: '^18', 'react-scripts': '5.0.1' } },
      'yarn.lock': '',
      'src/index.js': `import React from 'react';\nimport ReactDOM from 'react-dom/client';\n\nReactDOM.createRoot(document.getElementById('root')).render(<App />);\n`,
    })
    const p = detect(root)
    expect(p).toMatchObject({
      label: 'React (Create React App)',
      entry: 'src/index.js',
      pm: 'yarn',
      ts: false,
    })
    const plan = buildPlan(p, answers({ privacy: 'relaxed' }))
    const config = file(plan, 'src/openreplay.js')!.after
    expect(config).toContain(`__DISABLE_SECURE_MODE: process.env.NODE_ENV === 'development',`)
    expect(config).toContain('defaultInputMode: 0,')
  })
})

describe('static HTML', () => {
  const root = fixture({
    'index.html': `<!doctype html>\n<html>\n  <head>\n    <title>Home</title>\n  </head>\n  <body></body>\n</html>\n`,
    'about/index.html': `<html><head></head><body></body></html>`,
    'node_modules/x/index.html': '',
  })
  test('detects pages, injects the snippet', () => {
    const p = detect(root)
    expect(p.framework).toBe('html')
    expect(p.htmlFiles.sort()).toEqual(['about/index.html', 'index.html'])
    const plan = buildPlan(
      p,
      answers({ method: 'script', htmlFiles: p.htmlFiles, assist: true, privacy: 'strict' }),
    )
    expect(plan.packages).toEqual([])
    const html = file(plan, 'index.html')!.after
    expect(html).toMatchSnapshot()
    expect(html).toContain('https://static.openreplay.com/latest/openreplay-assist.js')
    const again = buildPlan({ ...p, root }, answers({ method: 'script', htmlFiles: [] }))
    expect(again.manual[0].code).toContain('window.OpenReplay=')
  })
})

describe('existing setup and upgrades', () => {
  test('flags files that already use the tracker; old tracker gets upgraded', () => {
    const root = fixture({
      'package.json': { dependencies: { react: '18', '@openreplay/tracker': '^14.0.0' } },
      'src/index.js': `import Tracker from '@openreplay/tracker'\n`,
    })
    const p = detect(root)
    expect(p.existing).toEqual(['src/index.js'])
    expect(buildPlan(p, answers()).packages).toEqual(['@openreplay/tracker@latest'])
  })
})

describe('monorepo', () => {
  test('lists workspace apps', () => {
    const root = fixture({
      'package.json': { private: true, workspaces: ['apps/*', 'packages/*'] },
      'apps/web/package.json': { dependencies: { next: '16' } },
      'apps/docs/package.json': { dependencies: { vue: '3' } },
      'packages/utils/package.json': { dependencies: {} },
    })
    expect(detect(root).framework).toBe('js')
    expect(workspaceApps(root)).toEqual(['apps/docs', 'apps/web'])
  })
})

describe('nextObserver (tracker 20+)', () => {
  const root = fixture({
    'package.json': { dependencies: { react: '19' }, devDependencies: { vite: '7' } },
    'index.html': '<script type="module" src="/src/main.js"></script>',
    'src/main.js': `import './app'\n`,
  })
  const withObserver = answers({ features: ['localhost', 'next-observer'] })
  const config = (major?: number) =>
    file(
      buildPlan(detect(root), withObserver, { major, docs: false, partialNetwork: false }),
      'src/openreplay.js',
    )!.after

  test('written for a v20 install, left out below 20 or when unknown', () => {
    expect(config(20)).toContain('  nextObserver: true,\n')
    expect(config(19)).not.toContain('nextObserver')
    expect(config(undefined)).not.toContain('nextObserver')
    // unchecked on 20+ must opt out explicitly, the tracker defaults to the new observer
    const off = buildPlan(detect(root), answers(), { major: 20, docs: true, partialNetwork: true })
    expect(file(off, 'src/openreplay.js')!.after).toContain('  nextObserver: false,\n')
  })

  test('target: existing tracker wins, new or too old ones get the latest', () => {
    const p = detect(root)
    expect(targetTracker(p, '20.0.1')).toEqual({ major: 20, docs: true, partialNetwork: true })
    expect(targetTracker(p, '19.1.2')).toEqual({ major: 19, docs: false, partialNetwork: false })
    expect(targetTracker(p, undefined)).toEqual({
      major: undefined,
      docs: false,
      partialNetwork: false,
    })
    const has = (deps: string, trackerVersion: string) => ({
      ...p,
      deps: { '@openreplay/tracker': deps },
      trackerVersion,
    })
    expect(targetTracker(has('^19.1.0', '19.1.3'), '20.0.0')).toEqual({
      major: 19,
      docs: true,
      partialNetwork: true,
    })
    expect(targetTracker(has('^14.0.0', '14.0.4'), '20.0.0')).toEqual({
      major: 20,
      docs: true,
      partialNetwork: true,
    })
  })

  test('Nuxt plugin', () => {
    const nuxt = fixture({
      'package.json': { dependencies: { nuxt: '^4.1.0' } },
      'app/app.vue': '',
    })
    expect(
      buildPlan(detect(nuxt), withObserver, { major: 20, docs: true, partialNetwork: true })
        .files[0].after,
    ).toContain('    nextObserver: true,\n')
  })

  test('script tag follows the answer (CDN serves the latest build)', () => {
    const site = fixture({ 'index.html': '<html><head></head><body></body></html>' })
    const plan = buildPlan(detect(site), {
      ...withObserver,
      method: 'script',
      htmlFiles: ['index.html'],
    })
    expect(file(plan, 'index.html')!.after).toContain('      nextObserver: true,\n')
    const off = buildPlan(detect(site), { ...answers(), method: 'script', htmlFiles: ['index.html'] })
    expect(file(off, 'index.html')!.after).toContain('      nextObserver: false,\n')
  })
})

describe('docs header', () => {
  const root = fixture({
    'package.json': { dependencies: { vue: '3' }, devDependencies: { vite: '7' } },
    'index.html': '<script type="module" src="/src/main.ts"></script>',
    'src/main.ts': `import { createApp } from 'vue'\n`,
  })
  test('points at the packaged .md files when the tracker ships them', () => {
    const out = file(
      buildPlan(detect(root), answers(), { major: 20, docs: true, partialNetwork: true }),
      'src/openreplay.js',
    )
    expect(out!.after.split('\n').slice(0, 4)).toEqual([
      '// OpenReplay tracker docs, also meant for coding agents:',
      '//   node_modules/@openreplay/tracker/docs/usage.md  setup, privacy, frameworks, troubleshooting',
      '//   node_modules/@openreplay/tracker/docs/api.md    every method and option',
      `import { tracker } from '@openreplay/tracker'`,
    ])
  })
  test('docs site otherwise', () => {
    const out = file(
      buildPlan(detect(root), answers(), { major: 19, docs: false, partialNetwork: false }),
      'src/openreplay.js',
    )
    expect(out!.after.split('\n').slice(0, 2)).toEqual([
      '// OpenReplay tracker docs: https://docs.openreplay.com/en/sdk/',
      '// Docs for agents: @openreplay/tracker/docs/usage.md and @openreplay/tracker/docs/api.md',
    ])
  })
  test('shipsDocs', () => {
    expect([
      shipsDocs('19.1.2'),
      shipsDocs('19.1.3'),
      shipsDocs('19.2.0'),
      shipsDocs('20.0.0-beta.1'),
    ]).toEqual([false, true, true, true])
  })
})

describe('extra options', () => {
  const root = fixture({
    'package.json': { dependencies: { react: '19' }, devDependencies: { vite: '7' } },
    'tsconfig.json': '{}',
    'index.html': '<script type="module" src="/src/main.tsx"></script>',
    'src/main.tsx': `import App from './App'\n`,
    'src/App.tsx': `export default () => <div data-testid="a"><button data-cy="b" data-testid="c" /><iframe src="https://w.example.com" /></div>\n`,
  })

  test('detects test ids (most used first) and iframes', () => {
    expect(detect(root)).toMatchObject({ testIds: ['data-testid', 'data-cy'], iframes: true })
  })

  test('writes every selected option', () => {
    const a = answers({
      features: ['test-ids', 'dnt', 'inline-css', 'iframes', 'backend-header', 'network'],
      testIdAttributes: ['data-testid', 'data-cy'],
      apiUrl: 'https://api.example.com/',
    })
    const plan = buildPlan(detect(root), a, { major: 20, docs: true, partialNetwork: true })
    expect(file(plan, 'src/openreplay.ts')!.after).toMatchSnapshot()
    expect(plan.manual.map((m) => m.title)).toEqual([
      'Run a tracker inside the cross-origin iframe too',
    ])
    expect(plan.notes.join('\n')).toContain('Access-Control-Allow-Headers')
  })

  test('tracker 19 + TypeScript: network object with every field', () => {
    const a = answers({ features: ['backend-header'] })
    const out = file(
      buildPlan(detect(root), a, { major: 19, docs: false, partialNetwork: false }),
      'src/openreplay.ts',
    )!.after
    expect(out).toContain(`    tokenUrlMatcher: (url) => url.startsWith(location.origin + '/'),\n`)
    expect(out).toContain(`    ignoreHeaders: ['cookie', 'set-cookie', 'authorization'],\n`)
    expect(out).toContain('    capturePayload: false,\n')
    expect(out).not.toContain('sessionTokenHeader: false')
  })
})
