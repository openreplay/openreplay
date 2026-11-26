import { describe, expect, test, jest, afterEach } from '@jest/globals'
import {
  isSameAsset,
  sanitizeCapture,
  sanitizeStyleRule,
  type CaptureData,
} from '../main/app/captureSanitizer.js'
import AttributeSender from '../main/modules/attributeSender.js'
import { Type } from '../common/messages.gen.js'
import images from '../main/modules/img.js'
import Nodes from '../main/app/nodes/index.js'
import Sanitizer, { SanitizeLevel } from '../main/app/sanitizer.js'
import { inlineRemoteCss } from '../main/app/observer/cssInliner.js'

const callbacks: Array<() => void> = []
afterEach(() => {
  callbacks.splice(0).forEach((fn) => fn())
  jest.restoreAllMocks()
})
const value = 'synthetic-private'

test('an inline asset is the same file only when query parameters were removed', () => {
  const base = 'https://static.invalid/'
  const original = 'icons.svg?test=example&theme=light#one'
  expect(isSameAsset(original, original, base)).toBe(true)
  expect(isSameAsset(original, 'icons.svg?theme=light#one', base)).toBe(true)
  expect(isSameAsset(original, 'icons.svg?theme=dark#one', base)).toBe(false)
  expect(isSameAsset(original, 'icons.svg?theme=light#two', base)).toBe(false)
  expect(isSameAsset(original, 'https://other.invalid/icons.svg#one', base)).toBe(false)
})

test.each([
  '@import url(https://static.invalid/theme.css?key=example);',
  '/* comment */ @import url(https://static.invalid/theme.css?key=example);',
  '@import/* comment */url(https://static.invalid/theme.css?key=example);',
  'p { background: url(https://static.invalid/image.png?key=example); }',
])('rewrites %s without constructing a stylesheet', (rule) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'CSSStyleSheet')!
  Object.defineProperty(globalThis, 'CSSStyleSheet', { ...original, value: undefined })
  try {
    expect(sanitizeStyleRule(({ value }) => value.replace('?key=example', ''), rule, 'rule'))
      .toBe(rule.replace('?key=example', ''))
  } finally {
    Object.defineProperty(globalThis, 'CSSStyleSheet', original)
  }
})

test.each([
  ['omitted with a leading comment', () => null, '/* retained */ @import "theme.css";'],
  ['replaced by an empty import', () => '@import ;', '@import "theme.css";'],
])('an import %s keeps an inert import slot', (_case, policy, rule) => {
  expect(sanitizeStyleRule(policy, rule, 'rule')).toBe('@import url("data:text/css,") not all;')
})

function appFor(policy?: any) {
  const messages: any[][] = []
  const app: any = {
    captureSanitizer: policy,
    isDisposed: () => false,
    options: { forceNgOff: true },
    safe: (fn: any) => fn,
    send: (m: any[]) => messages.push(m),
    getBaseHref: () => 'https://static.invalid/',
    timestamp: () => 1,
    attachStopCallback: (fn: () => void) => callbacks.push(fn),
    attachResanitizeCallback: jest.fn(),
  }
  app.nodes = new Nodes({
    node_id: '__openreplay_id',
    forceNgOff: true,
    maintainer: { enabled: false },
  })
  app.sanitizer = new Sanitizer({ app, options: {} })
  app.attributeSender = new AttributeSender({ app, isDictDisabled: false })
  return { app, messages }
}
const attribute: CaptureData = { kind: 'attribute', name: 'title', value, node: null }
describe('capture sanitizer contract', () => {
  test('absent callback preserves value; replacement or null is respected', () => {
    expect(sanitizeCapture(undefined, attribute)).toBe(value)
    expect(sanitizeCapture(() => 'safe', attribute)).toBe('safe')
    expect(sanitizeCapture(() => null, attribute)).toBeNull()
  })

  test.each([
    ['undefined', () => undefined],
    ['a number', () => 0],
    ['an object', () => ({})],
    ['a throw', () => { throw Error(value) }],
    ['a rejected promise', () => Promise.reject(Error(value))],
    ['a cross-realm rejected promise', () =>
      (jest.requireActual('vm') as any).runInNewContext('Promise.reject(Error("synthetic-private"))')],
    ['a rejecting thenable', () => ({ then: (_ok: unknown, reject: (e: Error) => void) => reject(Error(value)) })],
    ['a non-function callback', null],
  ])('%s fails closed, without logging or an unhandled rejection', async (_case, callback) => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {})
    const unhandled = jest.fn()
    window.addEventListener('unhandledrejection', unhandled)
    callbacks.push(() => window.removeEventListener('unhandledrejection', unhandled))
    expect(sanitizeCapture(callback as any, attribute)).toBeNull()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(unhandled).not.toHaveBeenCalled()
    expect(log).not.toHaveBeenCalled()
  })
})

describe('stylesheet pre-fetch and content policy', () => {
  test('fetch uses the page URL and emits sanitized CSS with the approved base', async () => {
    const previousFetch = globalThis.fetch
    callbacks.push(() => { globalThis.fetch = previousFetch })
    const fetcher = jest.fn(async (_url: string) => ({
      ok: true,
      text: async () => 'p{color:red}',
    }))
    ;(globalThis as any).fetch = fetcher
    const policy = jest.fn((d: CaptureData) =>
      d.kind === 'resource' ? 'https://static.invalid/safe.css' : 'p{color:blue}',
    )
    const link = document.createElement('link')
    link.href = 'https://static.invalid/safe.css?test=example'
    const insert = jest.fn((_id: number, _css: string, _index: number, _base: string) => [])
    inlineRemoteCss(
      link,
      1,
      '',
      () => 2,
      insert,
      () => [],
      true,
      false,
      undefined,
      { sanitizer: policy, href: 'https://static.invalid/safe.css', original: link.href },
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetcher).toHaveBeenCalledWith(link.href)
    expect(policy).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'css', source: 'text', value: 'p{color:red}', sourceUrl: link.href }),
    )
    expect(insert).toHaveBeenCalledWith(2, 'p{color:blue}', 0, 'https://static.invalid/safe.css')
  })
})

test('plain srcset keeps the legacy dictionary representation without a policy', async () => {
  const { app, messages } = appFor()
  const image = document.createElement('img')
  Object.defineProperty(image, 'complete', { value: false })
  const [id] = app.nodes.registerNode(image)
  images(app)
  app.nodes.callNodeCallbacks(image, true)
  const srcset = 'https://static.invalid/a.png 1x, https://static.invalid/b.png 2x'
  image.srcset = srcset
  await Promise.resolve()
  expect(messages).toContainEqual([Type.StringDictGlobal, expect.any(Number), srcset])
  expect(
    messages.some(
      (m) => m[0] === Type.SetNodeAttributeURLBased && m[1] === id && m[2] === 'srcset',
    ),
  ).toBe(false)
})

test('generated image placeholders still obey resource policy and can use a fixed non-network representation', () => {
  const placeholder = 'https://static.openreplay.com/tracker/placeholder.jpeg'
  const safeImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  const policy = jest.fn((d: CaptureData) =>
    d.kind === 'resource' && d.resourceType === 'image' && d.value === placeholder
      ? safeImage
      : null,
  )
  const { app, messages } = appFor(policy)
  const image = document.createElement('img')
  image.src = 'https://static.invalid/' + value
  Object.defineProperty(image, 'complete', { value: true })
  Object.defineProperty(image, 'naturalWidth', { value: 10 })
  const [id] = app.nodes.registerNode(image)
  app.sanitizer.setLevel(id, SanitizeLevel.Hidden)
  images(app)
  app.nodes.callNodeCallbacks(image, true)
  expect(policy).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: 'resource',
      resourceType: 'image',
      value: placeholder,
      node: image,
    }),
  )
  expect(messages).toContainEqual([Type.StringDictGlobal, expect.any(Number), safeImage])
  expect(JSON.stringify(messages)).not.toContain(placeholder)
  expect(JSON.stringify(messages)).not.toContain(value)
  expect(image.src).toContain(value)
})
