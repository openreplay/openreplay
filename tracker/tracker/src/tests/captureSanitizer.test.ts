import { afterEach, describe, expect, jest, test } from '@jest/globals'
import AttributeSender from '../main/modules/attributeSender.js'
import TopObserver from '../main/app/observer/top_observer.js'
import Nodes from '../main/app/nodes/index.js'
import Sanitizer, { SanitizeLevel } from '../main/app/sanitizer.js'
import images from '../main/modules/img.js'
import fonts from '../main/modules/fonts.js'
import { Type } from '../common/messages.gen.js'

// Native hook contract. No SDK/worker is started; these exercise real modules in jsdom.
const secret = 'SYNTHETIC_SENSITIVE_VALUE'
const cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn())
  jest.restoreAllMocks()
})
function appFixture() {
  const sent: any[][] = []
  const sanitize = jest.fn((data: any) =>
    (data.kind === 'resource' &&
      data.resourceType === 'image' &&
      data.value === 'https://static.openreplay.com/tracker/placeholder.jpeg') ||
    (data.kind === 'attribute' &&
      ((data.name === 'class' && data.value === 'safe-panel') || data.name === 'style'))
      ? data.value
      : null,
  )
  const app: any = {
    options: { forceNgOff: true, captureSanitizer: sanitize },
    captureSanitizer: sanitize,
    safe: (fn: any) => fn,
    send: (message: any[]) => sent.push(message),
    isDisposed: () => false,
    getBaseHref: () => 'https://example.invalid/',
    timestamp: () => 1,
    active: () => true,
    attachStopCallback: (fn: () => void) => cleanups.push(fn),
    attachResanitizeCallback: jest.fn(),
    callResanitizeCallbacks: jest.fn(),
    debug: { log: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() },
  }
  app.nodes = new Nodes({
    node_id: '__openreplay_id',
    forceNgOff: true,
    maintainer: { enabled: false },
  })
  app.sanitizer = new Sanitizer({
    app,
    options: { privateMode: true, domSanitizer: () => SanitizeLevel.Obscured },
  })
  app.attributeSender = new AttributeSender({ app, isDictDisabled: false })
  return { app, sent, sanitize }
}
function observe(html: string, policy?: (data: any) => string | null) {
  const fixture = appFixture()
  if (policy) fixture.sanitize.mockImplementation(policy)
  document.documentElement.innerHTML = '<head></head><body>' + html + '</body>'
  const observer = new TopObserver({ app: fixture.app, options: { disableThrottling: true } })
  cleanups.push(() => observer.disconnect())
  observer.observe()
  return fixture
}

describe('native capture sanitizer boundaries', () => {
  test('rejects attribute value before dictionary insertion while preserving allowed class', () => {
    const { app, sent, sanitize } = appFixture()
    app.attributeSender.sendSetAttribute(1, 'title', secret)
    app.attributeSender.sendSetAttribute(1, 'class', 'safe-panel')
    expect(sanitize).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'attribute', name: 'title', value: secret }),
    )
    expect(JSON.stringify(sent)).not.toContain(secret)
    expect(sent.some((m) => m[0] === Type.StringDictGlobal && m[2] === 'safe-panel')).toBe(true)
  })
  test('initial hidden-root attributes do not bypass policy or alter the real DOM', () => {
    const { sent, sanitize } = observe(
      `<section title="${secret}" data-openreplay-hidden><p>child</p></section>`,
    )
    expect(JSON.stringify(sent)).not.toContain(secret)
    expect(sanitize).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'attribute',
        name: 'title',
        node: document.querySelector('section'),
      }),
    )
    expect(sent.some((m) => m[0] === Type.CreateElementNode && m[4] === 'SECTION')).toBe(true)
    expect(document.querySelector('section')!.getAttribute('title')).toBe(secret)
  })
  test('dynamic attribute mutation uses the same pre-dictionary policy', async () => {
    const { sent, sanitize } = observe('<p class="safe-panel"></p>')
    sent.length = 0
    document.querySelector('p')!.setAttribute('aria-label', secret)
    await Promise.resolve()
    expect(sanitize).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'attribute', name: 'aria-label' }),
    )
    expect(JSON.stringify(sent)).not.toContain(secret)
  })
  test('inline CSS text and style attributes are filtered before emission', () => {
    const { sent, sanitize } = observe(
      `<style>p::after{content:"${secret}"}</style><p style="background:url(/${secret})"></p>`,
    )
    expect(sanitize).toHaveBeenCalledWith(expect.objectContaining({ kind: 'css', source: 'text' }))
    expect(sanitize).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'css', source: 'attribute' }),
    )
    expect(sent.some((m) => m[0] === Type.CreateElementNode && m[4] === 'P')).toBe(true)
    expect(JSON.stringify(sent)).not.toContain(secret)
  })
  test('image-error URL is filtered even when the node is Hidden', () => {
    const { app, sent, sanitize } = appFixture()
    const image = document.createElement('img')
    image.src = 'https://example.invalid/' + secret
    Object.defineProperty(image, 'complete', { value: true })
    const [id] = app.nodes.registerNode(image)
    app.sanitizer.setLevel(id, SanitizeLevel.Hidden)
    images(app)
    app.nodes.callNodeCallbacks(image, true)
    expect(
      sent.some(
        (m) =>
          m[0] === Type.StringDictGlobal &&
          m[2] === 'https://static.openreplay.com/tracker/placeholder.jpeg',
      ),
    ).toBe(true)
    expect(sent.some((m) => m[0] === Type.ResourceTiming)).toBe(false)
    expect(JSON.stringify(sent)).not.toContain(secret)
  })
  test('image mutation URL is filtered before emission', async () => {
    const { app, sent, sanitize } = appFixture()
    const image = document.createElement('img')
    Object.defineProperty(image, 'complete', { value: false })
    app.nodes.registerNode(image)
    images(app)
    app.nodes.callNodeCallbacks(image, true)
    sent.length = 0
    image.src = 'https://example.invalid/' + secret
    await Promise.resolve()
    expect(sanitize).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'attribute', name: 'src' }),
    )
    expect(JSON.stringify(sent)).not.toContain(secret)
  })
  test('FontFace source/family/descriptor do not bypass policy', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'FontFace')
    Object.defineProperty(window, 'FontFace', {
      configurable: true,
      writable: true,
      value: class {
        constructor(..._args: any[]) {}
      },
    })
    cleanups.push(() =>
      descriptor
        ? Object.defineProperty(window, 'FontFace', descriptor)
        : delete (window as any).FontFace,
    )
    const { app, sent, sanitize } = appFixture()
    app.observer = { attachContextCallback: jest.fn() }
    fonts(app)
    const font = new (window as any).FontFace(secret, `url(/${secret})`, { family: secret })
    expect(font).toBeInstanceOf((window as any).FontFace)
    for (const field of ['family', 'source', 'descriptors'])
      expect(sanitize).toHaveBeenCalledWith(expect.objectContaining({ kind: 'font', field }))
    expect(JSON.stringify(sent)).not.toContain(secret)
  })
})

test('callback sees existing alt/placeholder masking, blank href and truncated style rather than original values', () => {
  const { sent, sanitize } = observe(
    `<head></head><img alt="${secret}"><input placeholder="${secret}"><a href="/${secret}"></a><p style="${'X'.repeat(100001)}"></p>`,
    (data) => data.value,
  )
  expect(sanitize).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'attribute', name: 'alt', value: '*'.repeat(secret.length) }),
  )
  expect(sanitize).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: 'attribute',
      name: 'placeholder',
      value: '*'.repeat(secret.length),
    }),
  )
  expect(sanitize).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'attribute', name: 'href', value: '' }),
  )
  expect(sanitize).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'attribute', name: 'style', value: '' }),
  )
  expect(JSON.stringify(sent)).not.toContain(secret)
})

test('SVG sprite resource veto runs before fetch while the structural use node remains', async () => {
  const fetcher = jest.fn()
  const previous = globalThis.fetch
  ;(globalThis as any).fetch = fetcher
  cleanups.push(() => {
    globalThis.fetch = previous
  })
  const { sent, sanitize } = observe(
    `<svg><use href="https://example.invalid/${secret}.svg#icon"></use></svg>`,
  )
  await Promise.resolve()
  expect(sanitize).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: 'resource',
      resourceType: 'svg',
      value: expect.stringContaining(secret),
    }),
  )
  expect(fetcher).not.toHaveBeenCalled()
  expect(sent.some((m) => m[0] === Type.CreateElementNode && m[4] === 'use')).toBe(true)
  expect(JSON.stringify(sent)).not.toContain(secret)
})

test('FontFace buffer stores approved fields only, rechecks each replay and leaves native constructor untouched', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'FontFace')
  class NativeFont {
    constructor(
      public family: string,
      public source: string,
    ) {}
  }
  Object.defineProperty(window, 'FontFace', {
    configurable: true,
    writable: true,
    value: NativeFont,
  })
  cleanups.push(() =>
    original
      ? Object.defineProperty(window, 'FontFace', original)
      : delete (window as any).FontFace,
  )
  const { app, sent, sanitize } = appFixture()
  app.observer = { attachContextCallback: jest.fn() }
  app.active = () => false
  sanitize.mockImplementation((d: any) => d.value.replaceAll(secret, 'safe'))
  fonts(app)
  const font = new (window as any).FontFace(secret, `url(/${secret})`)
  expect(font.family).toBe(secret)
  expect(font.source).toBe(`url(/${secret})`)
  expect(sent).toHaveLength(0)
  sanitize.mockClear()
  app.nodes.callNodeCallbacks(document, true)
  expect(sent).toContainEqual([Type.LoadFontFace, 0, 'safe', 'url(/safe)', ''])
  expect(sanitize.mock.calls.every(([d]: any) => !d.value.includes(secret))).toBe(true)
  expect(sanitize).toHaveBeenCalledTimes(3)
  sent.length = 0
  sanitize.mockImplementation(() => null)
  app.nodes.callNodeCallbacks(document, true)
  expect(sent).toHaveLength(0)
})

// Observer-level regression: raw relative hrefs must preserve the existing sheet/load path.
test.each(['absent', 'approve', 'rewrite', 'fallback', 'deny'])(
  'relative linked stylesheet preserves source semantics: %s',
  async (mode) => {
    const { app, sent } = appFixture()
    const policy = jest.fn((d: any) =>
      d.kind === 'resource' && d.resourceType === 'stylesheet'
        ? mode === 'rewrite'
          ? 'https://static.invalid/approved.css'
          : mode === 'deny'
            ? null
            : d.value
        : d.value,
    )
    app.captureSanitizer = mode === 'absent' ? undefined : policy
    document.documentElement.innerHTML =
      '<head><link rel="stylesheet" href="./relative.css"></head><body><p>structure</p></body>'
    const link = document.querySelector('link')!
    let sheet: any =
      mode === 'fallback' ? null : { cssRules: [{ cssText: 'p{color:blue}' }], href: link.href }
    const read = jest.fn(() => sheet)
    Object.defineProperty(link, 'sheet', { get: read })
    const fetcher = jest.fn(async (_url: string) => {
      if (mode === 'fallback') throw Error('synthetic fetch denied')
      return { ok: true, text: async () => 'p{color:green}' }
    })
    const previous = globalThis.fetch
    ;(globalThis as any).fetch = fetcher
    const log = jest.spyOn(console, 'error').mockImplementation(() => {})
    const observer = new TopObserver({ app, options: { disableThrottling: true, inlineCss: 1 } })
    try {
      observer.observe()
      await new Promise((r) => setTimeout(r, 15))
      if (mode === 'deny') {
        expect(read).not.toHaveBeenCalled()
        expect(fetcher).not.toHaveBeenCalled()
      } else if (mode === 'rewrite') {
        expect(read).not.toHaveBeenCalled()
        expect(fetcher).toHaveBeenCalledTimes(1)
        expect(fetcher).toHaveBeenCalledWith('https://static.invalid/approved.css')
      } else if (mode === 'fallback') {
        expect(fetcher).toHaveBeenCalledWith(link.href)
        sheet = { cssRules: [{ cssText: 'p{color:blue}' }], href: link.href }
        link.dispatchEvent(new Event('load'))
      } else {
        expect(read).toHaveBeenCalled()
        expect(fetcher).not.toHaveBeenCalled()
      }
      if (mode !== 'absent')
        expect(
          policy.mock.calls.filter(
            ([d]: any) => d.kind === 'resource' && d.resourceType === 'stylesheet',
          ),
        ).toHaveLength(1)
      expect(
        sent.some(
          (m) =>
            m[0] === Type.AdoptedSSInsertRuleURLBased &&
            m[2].includes(mode === 'rewrite' ? 'green' : 'blue'),
        ),
      ).toBe(mode !== 'deny')
      expect(sent.some((m) => m[0] === Type.CreateElementNode && m[4] === 'P')).toBe(true)
    } finally {
      observer.disconnect()
      ;(globalThis as any).fetch = previous
      log.mockRestore()
    }
  },
)

test('font replay never applies a rewriting callback twice or bypasses revocation', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'FontFace')
  Object.defineProperty(window, 'FontFace', { configurable: true, writable: true, value: class {} })
  const { app, sent, sanitize } = appFixture()
  app.observer = { attachContextCallback: jest.fn() }
  sanitize.mockImplementation((d: any) => 'approved:' + d.value)
  fonts(app)
  new (window as any).FontFace('Family', 'url(/safe)')
  expect(sent).toContainEqual([
    Type.LoadFontFace,
    0,
    'approved:Family',
    'approved:url(/safe)',
    'approved:',
  ])
  sent.length = 0
  app.nodes.callNodeCallbacks(document, true)
  expect(sent).toHaveLength(0)
  if (original) Object.defineProperty(window, 'FontFace', original)
  else delete (window as any).FontFace
})

test('iframe node unregistration forgets approved attribute names', () => {
  const { app } = appFixture()
  const oldDocument = document.implementation.createHTMLDocument('synthetic')
  const p = oldDocument.createElement('p')
  oldDocument.body.appendChild(p)
  app.nodes.registerNode(oldDocument)
  app.nodes.registerNode(oldDocument.documentElement)
  app.nodes.registerNode(oldDocument.body)
  const [id] = app.nodes.registerNode(p)
  const forgot = jest.spyOn(app.attributeSender, 'forgetNode')
  jest.spyOn(oldDocument, 'contains').mockReturnValue(false)
  const observer = new TopObserver({ app, options: { disableThrottling: true } })
  ;(observer as any).handleIframeSrcChange({ contentDocument: oldDocument })
  expect(forgot).toHaveBeenCalledWith(id)
  observer.disconnect()
})

test.each([false, true])(
  'SVG fetch errors retain default diagnostics only without capture policy: %s',
  async (policyEnabled) => {
    const { app } = appFixture()
    app.captureSanitizer = policyEnabled ? (d: any) => d.value : undefined
    document.documentElement.innerHTML =
      '<head></head><body><svg><use href="/synthetic-error.svg#symbol"></use></svg></body>'
    const previous = globalThis.fetch
    const error = Error(secret)
    ;(globalThis as any).fetch = jest.fn(async () => {
      throw error
    })
    const log = jest.spyOn(console, 'error').mockImplementation(() => {})
    const observer = new TopObserver({ app, options: { disableThrottling: true } })
    try {
      observer.observe()
      await new Promise((r) => setTimeout(r, 0))
      if (policyEnabled) {
        expect(log).toHaveBeenCalledWith('OpenReplay: failed to capture SVG sprite')
        expect(JSON.stringify(log.mock.calls)).not.toContain(secret)
        expect(log.mock.calls.every((args) => args.length === 1)).toBe(true)
      } else expect(log).toHaveBeenCalledWith('Openreplay: Error processing <use> element:', error)
    } finally {
      observer.disconnect()
      ;(globalThis as any).fetch = previous
      log.mockRestore()
    }
  },
)

test.each(['timer', 'load', 'rewritten-load'])(
  'a changed stylesheet href cannot reuse earlier approval at deferred %s',
  async (phase) => {
    const { app, sent } = appFixture()
    const policy = jest.fn((d: any) =>
      d.kind === 'resource' && d.resourceType === 'stylesheet'
        ? d.value === './approved-A.css'
          ? phase === 'rewritten-load'
            ? 'https://static.invalid/rewritten-A.css'
            : d.value
          : null
        : d.value,
    )
    app.captureSanitizer = policy
    document.documentElement.innerHTML =
      '<head><link rel="stylesheet" href="./approved-A.css"></head><body><p>structure</p></body>'
    const link = document.querySelector('link')!
    let loaded = phase === 'timer'
    const readB = jest.fn()
    Object.defineProperty(link, 'sheet', {
      get: () => {
        if (link.getAttribute('href') !== './approved-A.css') readB()
        return loaded ? { cssRules: [{ cssText: 'p{color:blue}' }], href: link.href } : null
      },
    })
    const previous = globalThis.fetch
    const fetcher = jest.fn(async (_url: string) => {
      throw Error('synthetic fetch denied')
    })
    ;(globalThis as any).fetch = fetcher
    const log = jest.spyOn(console, 'error').mockImplementation(() => {})
    const observer = new TopObserver({ app, options: { disableThrottling: true, inlineCss: 1 } })
    try {
      observer.observe()
      if (phase !== 'timer') {
        await new Promise((r) => setTimeout(r, 15))
        expect(fetcher).toHaveBeenCalledWith(
          phase === 'rewritten-load' ? 'https://static.invalid/rewritten-A.css' : link.href,
        )
      }
      link.setAttribute('href', './denied-B.css')
      loaded = true
      if (phase !== 'timer') link.dispatchEvent(new Event('load'))
      await new Promise((r) => setTimeout(r, 15))
      expect(readB).not.toHaveBeenCalled()
      expect(fetcher.mock.calls.every(([url]) => !url.includes('denied-B'))).toBe(true)
      expect(sent.some((m) => m[0] === Type.AdoptedSSInsertRuleURLBased)).toBe(false)
      expect(sent.some((m) => m[0] === Type.CreateElementNode && m[4] === 'P')).toBe(true)
    } finally {
      observer.disconnect()
      ;(globalThis as any).fetch = previous
      log.mockRestore()
    }
  },
)
