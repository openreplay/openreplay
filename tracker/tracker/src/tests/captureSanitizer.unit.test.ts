import { describe, expect, test, jest, afterEach } from '@jest/globals'
import { sanitizeCapture, type CaptureData } from '../main/app/captureSanitizer.js'
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
function appFor(policy?: any) {
  const messages: any[][] = []
  const app: any = {
    captureSanitizer: policy,
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
  test.each([undefined, false, 0, {}, Promise.resolve('unsafe')])(
    'invalid callback return fails closed: %p',
    (result) => {
      expect(sanitizeCapture((() => result) as any, attribute)).toBeNull()
    },
  )
  test('throws and invalid supplied callback fail closed without logging', () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(
      sanitizeCapture(() => {
        throw Error(value)
      }, attribute),
    ).toBeNull()
    expect(sanitizeCapture(null as any, attribute)).toBeNull()
    expect(log).not.toHaveBeenCalled()
  })
  test.each([false, true])(
    'each attribute method invokes attribute policy exactly once, dict disabled=%p',
    (disabled) => {
      const policy = jest.fn((d: CaptureData) => d.value)
      const { app, messages } = appFor(policy)
      app.attributeSender = new AttributeSender({ app, isDictDisabled: disabled })
      const el = document.createElement('p')
      const [id] = app.nodes.registerNode(el)
      app.attributeSender.sendSetAttribute(id, 'class', 'safe')
      expect(policy.mock.calls.filter(([d]) => d.kind === 'attribute')).toHaveLength(1)
      expect(policy).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'attribute', node: el, value: 'safe' }),
      )
      policy.mockClear()
      app.attributeSender.sendURLBasedAttribute(id, 'href', 'https://static.invalid/safe.css', {
        resourceType: 'stylesheet',
      })
      expect(policy.mock.calls.filter(([d]) => d.kind === 'attribute')).toHaveLength(1)
      expect(policy).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'resource', resourceType: 'stylesheet' }),
      )
      expect(
        messages.some((m) => m[0] === Type.SetNodeAttributeURLBased && m[3].endsWith('safe.css')),
      ).toBe(true)
    },
  )
  test('rejection removes previous attribute; only approved replacement enters dictionary and decisions are not cached', () => {
    let allowed = true
    const policy = jest.fn(() => (allowed ? 'safe' : null))
    const { app, messages } = appFor(policy)
    app.attributeSender.sendSetAttribute(1, 'title', value)
    allowed = false
    app.attributeSender.sendSetAttribute(1, 'title', value)
    expect(policy).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(messages)).not.toContain(value)
    expect(messages).toContainEqual([Type.RemoveNodeAttribute, 1, 'title'])
    expect(messages).toContainEqual([Type.StringDictGlobal, expect.any(Number), 'safe'])
  })
  test('DOM lookalikes cannot request generated-constant exemptions', () => {
    const policy = jest.fn(() => null)
    const { app, messages } = appFor(policy)
    app.attributeSender.sendSetAttribute(0, 'orloaded', 'true')
    expect(policy).toHaveBeenCalledTimes(1)
    expect(messages).toEqual([])
    app.attributeSender.sendSetAttribute(0, 'orloaded', 'true', { generated: true })
    expect(policy).toHaveBeenCalledTimes(1)
    expect(messages).toContainEqual([Type.SetNodeAttribute, 0, 'orloaded', 'true'])
    app.attributeSender.sendSetAttribute(0, 'orloaded', value, { generated: true })
    expect(policy).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(messages)).not.toContain(value)
  })
})
describe('image privacy floor without any new policy', () => {
  test.each([SanitizeLevel.Hidden, SanitizeLevel.Obscured])(
    'completed error and src/srcset mutations do not reveal source, level=%p',
    async (level) => {
      const { app, messages } = appFor()
      const img = document.createElement('img')
      img.src = 'https://example.invalid/' + value
      Object.defineProperty(img, 'complete', { value: true })
      const [id] = app.nodes.registerNode(img)
      app.sanitizer.setLevel(id, level)
      images(app)
      app.nodes.callNodeCallbacks(img, true)
      img.dispatchEvent(new Event('error'))
      img.src = 'https://example.invalid/' + value + '-changed'
      img.srcset = img.src + ' 2x'
      await Promise.resolve()
      expect(JSON.stringify(messages)).not.toContain(value)
      expect(messages.some((m) => m[0] === Type.ResourceTiming)).toBe(false)
      expect(messages).toContainEqual([
        Type.StringDictGlobal,
        expect.any(Number),
        'https://static.openreplay.com/tracker/placeholder.jpeg',
      ])
      expect(messages).toContainEqual([Type.RemoveNodeAttribute, id, 'srcset'])
    },
  )
  test('oversized plain source sends placeholder and returns; normal source still records', () => {
    const { app, messages } = appFor()
    const img = document.createElement('img')
    img.src = 'data:image/png;base64,' + 'A'.repeat(100001)
    Object.defineProperty(img, 'complete', { value: false })
    app.nodes.registerNode(img)
    images(app)
    app.nodes.callNodeCallbacks(img, true)
    img.src = img.src + 'A'
    // Flush MutationObserver in a separate task below.
    return Promise.resolve()
      .then(() => {
        expect(messages.some((m) => m[0] === Type.SetNodeAttributeURLBased)).toBe(false)
        expect(messages).toContainEqual([
          Type.StringDictGlobal,
          expect.any(Number),
          'https://static.openreplay.com/tracker/placeholder.jpeg',
        ])
        img.src = 'https://static.invalid/allowed.png'
        return Promise.resolve()
      })
      .then(() =>
        expect(
          messages.some((m) => m[0] === Type.SetNodeAttributeURLBased && m[3] === img.src),
        ).toBe(true),
      )
  })
  test('ordinary image errors invoke timing resource policy; allowed resource remains useful', () => {
    const policy = jest.fn((d: CaptureData) => (d.value.includes(value) ? null : d.value))
    const { app, messages } = appFor(policy)
    const img = document.createElement('img')
    img.src = 'https://example.invalid/' + value
    Object.defineProperty(img, 'complete', { value: true })
    app.nodes.registerNode(img)
    images(app)
    app.nodes.callNodeCallbacks(img, true)
    expect(policy).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'resource', resourceType: 'timing', node: img }),
    )
    expect(JSON.stringify(messages)).not.toContain(value)
    img.src = 'https://static.invalid/safe.png'
    img.dispatchEvent(new Event('error'))
    expect(messages.some((m) => m[0] === Type.ResourceTiming && m.includes(img.src))).toBe(true)
  })
})
describe('stylesheet pre-fetch and content policy', () => {
  test('fetch uses approved URL; fetched CSS has separate semantic check and safe positive survives', async () => {
    const fetcher = jest.fn(async (_url: string) => ({
      ok: true,
      text: async () => 'p{color:red}',
    }))
    ;(globalThis as any).fetch = fetcher
    const policy = jest.fn((d: CaptureData) =>
      d.kind === 'resource' ? 'https://static.invalid/safe.css' : 'p{color:blue}',
    )
    const link = document.createElement('link')
    link.href = 'https://example.invalid/private.css'
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
    expect(fetcher).toHaveBeenCalledWith('https://static.invalid/safe.css')
    expect(policy).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'css', source: 'text', value: 'p{color:red}' }),
    )
    expect(insert).toHaveBeenCalledWith(2, 'p{color:blue}', 0, '')
  })
})

test('newly rejected attribute names never escape in removal messages', () => {
  const policy = jest.fn((_d: CaptureData) => null)
  const { app, messages } = appFor(policy)
  app.attributeSender.sendSetAttribute(1, 'data-' + value, value)
  app.attributeSender.removeAttribute(1, 'data-' + value)
  expect(policy).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'attribute', name: 'data-' + value }),
  )
  expect(messages).toHaveLength(0)
  expect(JSON.stringify(messages)).not.toContain(value)
})

test('rewritten stylesheet URL never reads the original DOM sheet', async () => {
  const originalFetch = globalThis.fetch
  const fetcher = jest.fn(async (_url: string) => ({ ok: true, text: async () => 'p{color:blue}' }))
  ;(globalThis as any).fetch = fetcher
  const read = jest.fn(() => {
    throw Error('original sheet must not be read')
  })
  const link = document.createElement('link')
  link.href = 'https://example.invalid/private.css'
  Object.defineProperty(link, 'sheet', { get: read })
  const policy = jest.fn((d: CaptureData) =>
    d.kind === 'resource' ? 'https://static.invalid/safe.css' : d.value,
  )
  const insert = jest.fn((_id: number, _css: string, _index: number, _base: string) => [])
  try {
    inlineRemoteCss(
      link,
      1,
      '',
      () => 2,
      insert,
      () => [],
      false,
      false,
      undefined,
      { sanitizer: policy, href: 'https://static.invalid/safe.css', original: link.href },
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(read).not.toHaveBeenCalled()
    expect(fetcher).toHaveBeenCalledWith('https://static.invalid/safe.css')
    expect(policy).toHaveBeenCalledWith(expect.objectContaining({ kind: 'css', source: 'text' }))
    expect(insert).toHaveBeenCalledWith(2, 'p{color:blue}', 0, '')
  } finally {
    globalThis.fetch = originalFetch
  }
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

test('an invalid async callback fails closed and consumes its rejection without captured-data logging', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  const unhandled = jest.fn()
  window.addEventListener('unhandledrejection', unhandled)
  try {
    expect(sanitizeCapture((() => Promise.reject(Error(value))) as any, attribute)).toBeNull()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(unhandled).not.toHaveBeenCalled()
    expect(log).not.toHaveBeenCalled()
  } finally {
    window.removeEventListener('unhandledrejection', unhandled)
  }
})

test('placeholder removes recorded srcset through the same attribute bookkeeping', async () => {
  const { app, messages } = appFor((d: CaptureData) => d.value)
  const image = document.createElement('img')
  Object.defineProperty(image, 'complete', { value: true })
  Object.defineProperty(image, 'naturalHeight', { value: 10 })
  const [id] = app.nodes.registerNode(image)
  images(app)
  app.nodes.callNodeCallbacks(image, true)
  image.srcset = 'https://static.invalid/safe.png 1x'
  await Promise.resolve()
  app.sanitizer.setLevel(id, SanitizeLevel.Hidden)
  image.src = 'https://static.invalid/private.png'
  await Promise.resolve()
  expect(
    messages.filter((m) => m[0] === Type.RemoveNodeAttribute && m[1] === id && m[2] === 'srcset'),
  ).toHaveLength(1)
  app.attributeSender.removeAttribute(id, 'srcset')
  expect(
    messages.filter((m) => m[0] === Type.RemoveNodeAttribute && m[1] === id && m[2] === 'srcset'),
  ).toHaveLength(1)
})

test.each(['cross-realm-promise', 'thenable'])(
  'invalid %s rejection is consumed without logging',
  async (kind) => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {})
    const rejectedThen = jest.fn((_resolve: unknown, reject: (error: Error) => void) =>
      reject(Error(value)),
    )
    const result =
      kind === 'cross-realm-promise'
        ? (jest.requireActual('vm') as any).runInNewContext(
            'Promise.reject(Error("synthetic-private"))',
          )
        : { then: rejectedThen }
    expect(sanitizeCapture((() => result) as any, attribute)).toBeNull()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(log).not.toHaveBeenCalled()
    if (kind === 'thenable') expect(rejectedThen).toHaveBeenCalledTimes(1)
  },
)

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
