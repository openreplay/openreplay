import { describe, expect, test } from 'bun:test'

import {
  addImport,
  detectStyle,
  injectIntoHead,
  insertJsxChild,
  wirePinia,
  wireReduxToolkit,
} from '../src/transforms'

const style = { quote: "'" as const, semi: false, indent: '  ' }
const semiStyle = { quote: '"' as const, semi: true, indent: '  ' }

describe('detectStyle', () => {
  test('single quotes, no semicolons, 2 spaces', () => {
    expect(
      detectStyle(`import { a } from 'a'\nimport './b.css'\n\nfunction x() {\n  return 1\n}\n`),
    ).toEqual(style)
  })
  test('double quotes, semicolons, 4 spaces', () => {
    expect(detectStyle(`import a from "a";\nimport b from "b";\nif (a) {\n    b();\n}\n`)).toEqual({
      quote: '"',
      semi: true,
      indent: '    ',
    })
  })
  test('tabs', () => {
    expect(detectStyle(`import a from 'a';\nif (a) {\n\tb();\n}\n`).indent).toBe('\t')
  })
})

describe('addImport', () => {
  const main = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<App />)
`
  test('first: before the other imports, idempotent', () => {
    const out = addImport(main, 'src/main.tsx', { source: './openreplay' }, style, 'first')!
    expect(out.split('\n')[0]).toBe(`import './openreplay'`)
    expect(out.split('\n')[1]).toBe(`import { StrictMode } from 'react'`)
    expect(addImport(out, 'src/main.tsx', { source: './openreplay' }, style, 'first')).toBe(out)
  })

  test('first: keeps a glued comment with its import, header comment stays on top', () => {
    const code = `/* license */\n\n// eslint-disable-next-line\nimport a from 'a'\n`
    const out = addImport(code, 'x.ts', { source: './openreplay' }, style, 'first')!
    expect(out).toBe(
      `/* license */\n\nimport './openreplay'\n// eslint-disable-next-line\nimport a from 'a'\n`,
    )
  })

  test('last: after the last import', () => {
    const out = addImport(main, 'src/main.tsx', { source: './x', named: ['a'] }, style)!
    expect(out).toContain(`import App from './App.tsx'\nimport { a } from './x'\n`)
  })

  test('merges named imports into an existing declaration', () => {
    const code = `import { a } from './openreplay';\nfoo();\n`
    expect(addImport(code, 'x.ts', { source: './openreplay', named: ['b'] }, semiStyle)).toBe(
      `import { a, b } from './openreplay';\nfoo();\n`,
    )
    expect(addImport(code, 'x.ts', { source: './openreplay', named: ['a'] }, semiStyle)).toBe(code)
  })

  test('after directives when there are no imports', () => {
    const out = addImport(`'use client'\n\nexport default 1\n`, 'x.tsx', { source: './o' }, style)!
    expect(out).toBe(`'use client'\n\nimport './o'\n\nexport default 1\n`)
  })

  test('empty file', () => {
    expect(addImport('', 'x.ts', { source: './o' }, semiStyle)).toBe(`import "./o";\n`)
  })

  test('JSX in .js files (CRA)', () => {
    const code = `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nReactDOM.createRoot(root).render(<App />);\n`
    const out = addImport(
      code,
      'src/index.js',
      { source: './openreplay' },
      { ...style, semi: true },
      'first',
    )!
    expect(out.startsWith(`import './openreplay';\nimport React`)).toBe(true)
  })
})

describe('insertJsxChild', () => {
  const layout = `export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={\`\${geistSans.variable} \${geistMono.variable} antialiased\`}
      >
        {children}
      </body>
    </html>
  );
}
`
  test('first child of a multi-line body', () => {
    const out = insertJsxChild(layout, 'app/layout.tsx', 'body', '<OpenReplay />', semiStyle)!
    expect(out).toContain(`      >\n        <OpenReplay />\n        {children}\n`)
    expect(insertJsxChild(out, 'app/layout.tsx', 'body', '<OpenReplay />', semiStyle)).toBe(out)
  })
  test('inline body', () => {
    const out = insertJsxChild(
      `export default ({ children }) => <html><body>{children}</body></html>\n`,
      'app/layout.jsx',
      'body',
      '<OpenReplay />',
      style,
    )
    expect(out).toContain('<body><OpenReplay />{children}</body>')
  })
  test('no body', () => {
    expect(
      insertJsxChild(`export default () => <div />\n`, 'a.tsx', 'body', '<X />', style),
    ).toBeNull()
  })
})

describe('wirePinia', () => {
  test('chains .use() on createPinia()', () => {
    const code = `const app = createApp(App)\napp.use(createPinia())\n`
    const out = wirePinia(code, 'src/main.ts', 'openReplayPinia')!
    expect(out).toContain('app.use(createPinia().use(openReplayPinia))')
    expect(wirePinia(out, 'src/main.ts', 'openReplayPinia')).toBe(out)
  })
  test('no pinia', () => {
    expect(wirePinia(`createApp(App).mount('#app')`, 'src/main.ts', 'x')).toBeNull()
  })
})

describe('wireReduxToolkit', () => {
  const mw = 'openReplayMiddleware'
  test('multi-line, no trailing comma', () => {
    const code = `export const store = configureStore({\n  reducer: {\n    counter: counterReducer,\n  }\n})\n`
    expect(wireReduxToolkit(code, 's.ts', mw)).toBe(
      `export const store = configureStore({\n  reducer: {\n    counter: counterReducer,\n  },\n  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(${mw})\n})\n`,
    )
  })
  test('multi-line with trailing comma', () => {
    const code = `export const store = configureStore({\n  reducer,\n})\n`
    expect(wireReduxToolkit(code, 's.ts', mw)).toBe(
      `export const store = configureStore({\n  reducer,\n  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(${mw}),\n})\n`,
    )
  })
  test('single line', () => {
    expect(wireReduxToolkit(`const s = configureStore({ reducer })`, 's.js', mw)).toBe(
      `const s = configureStore({ reducer, middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(${mw}) })`,
    )
  })
  test('leaves stores that already set middleware to the user', () => {
    expect(
      wireReduxToolkit(
        `configureStore({ reducer, middleware: (g) => g().concat(logger) })`,
        's.ts',
        mw,
      ),
    ).toBeNull()
  })
})

describe('injectIntoHead', () => {
  test('indented like the head content', () => {
    const html = `<!doctype html>\n<html>\n  <head>\n    <title>x</title>\n  </head>\n  <body></body>\n</html>\n`
    expect(injectIntoHead(html, '<script>\n  a()\n</script>')).toBe(
      `<!doctype html>\n<html>\n  <head>\n    <title>x</title>\n    <script>\n      a()\n    </script>\n  </head>\n  <body></body>\n</html>\n`,
    )
  })
  test('no head', () => {
    expect(injectIntoHead('<html><body>hi</body></html>', '<script></script>')).toBe(
      '<html><head>\n  <script></script>\n</head>\n<body>hi</body></html>',
    )
  })
})

describe('normalizeApiUrl', () => {
  test('origin + path with a trailing slash, http(s) only', async () => {
    const { normalizeApiUrl } = await import('../src/args')
    expect(normalizeApiUrl('https://api.example.com')).toBe('https://api.example.com/')
    expect(normalizeApiUrl(' https://api.example.com/v1?x=1 ')).toBe('https://api.example.com/v1/')
    expect(normalizeApiUrl('ftp://x')).toBeUndefined()
    expect(normalizeApiUrl('api.example.com')).toBeUndefined()
  })
})
