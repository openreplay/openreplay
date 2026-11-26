import { afterEach, describe, expect, jest, test } from '@jest/globals'
import AttributeSender from '../main/modules/attributeSender.js'
import TopObserver from '../main/app/observer/top_observer.js'
import Nodes from '../main/app/nodes/index.js'
import Sanitizer, { stringWiper } from '../main/app/sanitizer.js'
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
    options: {},
  })
  app.attributeSender = new AttributeSender({ app, isDictDisabled: false })
  return { app, sent, sanitize }
}
function makeObserver(core: string, app: any, inlineCss = 0) {
  const options = { disableThrottling: true, inlineCss }
  return new TopObserver({ app, options })
}

function observe(html: string, policy?: (data: any) => string | null, core = 'legacy') {
  const fixture = appFixture()
  if (policy) fixture.sanitize.mockImplementation(policy)
  document.documentElement.innerHTML = '<head></head><body>' + html + '</body>'
  const observer = makeObserver(core, fixture.app)
  cleanups.push(() => observer.disconnect())
  observer.observe()
  return fixture
}

function stubFetch(fetcher: (...args: any[]) => any) {
  const previous = globalThis.fetch
  ;(globalThis as any).fetch = fetcher
  cleanups.push(() => { globalThis.fetch = previous })
}
const SPRITE = '_$OPENREPLAY_SPRITE$_'
const spriteFile = (path: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg"><symbol id="icon"><path d="${path}"/></symbol></svg>`
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe.each(['legacy'])('%s native capture sanitizer boundaries', (core) => {
  test('rejects attribute value before dictionary insertion while preserving allowed class', () => {
    const { sent, sanitize } = observe(`<p title="${secret}" class="safe-panel"></p>`, undefined, core)
    expect(sanitize).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'attribute', name: 'title', value: secret }),
    )
    expect(JSON.stringify(sent)).not.toContain(secret)
    expect(sent.some((m) => m[0] === Type.StringDictGlobal && m[2] === 'safe-panel')).toBe(true)
  })

  test('rejecting a mutation removes a previously recorded value without adding it to the dictionary', async () => {
    const { sent } = observe('<p title="safe"></p>', (data) =>
      data.value === secret ? null : data.value, core)
    const node = document.querySelector('p')!
    node.setAttribute('title', secret)
    await Promise.resolve()
    expect(sent.some((message) => message[0] === Type.RemoveNodeAttribute && message[2] === 'title')).toBe(true)
    expect(JSON.stringify(sent)).not.toContain(secret)
  })

  test('removing a never-recorded attribute does not emit its name', async () => {
    const name = 'data-' + secret.toLowerCase()
    const { sent } = observe(`<p ${name}="hidden"></p>`, () => null, core)
    document.querySelector('p')!.removeAttribute(name)
    await Promise.resolve()
    expect(JSON.stringify(sent)).not.toContain(name)
  })

  test('replacing the document root resets previously emitted attribute names', async () => {
    const { app, sent } = observe('<p title="safe"></p>', (data) =>
      data.value === secret ? null : data.value, core)
    const p = document.querySelector('p')!
    const id = app.nodes.getID(p)
    const root = document.createElement('html')
    root.innerHTML = '<head></head><body></body>'
    p.setAttribute('title', secret)
    root.querySelector('body')!.appendChild(p)
    document.documentElement.replaceWith(root)
    await Promise.resolve()
    expect(app.nodes.getID(p)).toBe(id)
    expect(sent.some((message) => message[0] === Type.RemoveNodeAttribute)).toBe(false)
  })

  test('initial hidden-root attributes do not bypass policy or alter the real DOM', () => {
    const { sent, sanitize } = observe(
      `<section title="${secret}" data-openreplay-hidden><p>child</p></section>`,
      undefined,
      core,
    )
    expect(JSON.stringify(sent)).not.toContain(secret)
    expect(sanitize).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'attribute',
        name: 'title',
        value: stringWiper(secret),
        node: document.querySelector('section'),
      }),
    )
    expect(sent.some((m) => m[0] === Type.CreateElementNode && m[4] === 'SECTION')).toBe(true)
    expect(document.querySelector('section')!.getAttribute('title')).toBe(secret)
  })
  test('dynamic attribute mutation uses the same pre-dictionary policy', async () => {
    const { sent, sanitize } = observe('<p class="safe-panel"></p>', undefined, core)
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
      undefined,
      core,
    )
    expect(sanitize).toHaveBeenCalledWith(expect.objectContaining({ kind: 'css', source: 'text' }))
    expect(sanitize).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'css', source: 'attribute' }),
    )
    expect(sent.some((m) => m[0] === Type.CreateElementNode && m[4] === 'P')).toBe(true)
    expect(JSON.stringify(sent)).not.toContain(secret)
  })
})

describe('module capture sanitizer boundaries', () => {
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
      expect.objectContaining({ kind: 'resource', resourceType: 'image' }),
    )
    expect(JSON.stringify(sent)).not.toContain(secret)
  })
})

test.each(['legacy'])('%s callback sees existing alt/placeholder masking, blank href and truncated style', (core) => {
  const { sent, sanitize } = observe(
    `<div data-openreplay-obscured><img alt="${secret}"><input placeholder="${secret}"></div><a href="/${secret}"></a><p style="${'X'.repeat(100001)}"></p>`,
    (data) => data.value,
    core,
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
    expect.objectContaining({ kind: 'css', source: 'attribute', value: '' }),
  )
  expect(JSON.stringify(sent)).not.toContain(secret)
})

test.each(['legacy'].flatMap((core) => ['veto', 'blank', 'substitute'].map((o) => [core, o])))(
  '%s sprite policy outcome %s records no sprite and fetches nothing',
  async (core, outcome) => {
    const fetcher = jest.fn()
    stubFetch(fetcher)
    const { sent } = observe(
      `<svg><use href="https://static.invalid/${secret}.svg#icon"></use></svg>`,
      (data) => data.kind !== 'resource'
        ? data.value
        : outcome === 'veto' ? null : outcome === 'blank' ? '' : 'https://static.invalid/placeholder.svg#icon',
      core,
    )
    await tick()
    expect(fetcher).not.toHaveBeenCalled()
    expect(sent.some((m) => m[0] === Type.CreateElementNode && m[4] === 'use')).toBe(true)
    expect(JSON.stringify(sent)).not.toContain(secret)
    expect(JSON.stringify(sent)).not.toContain(SPRITE)
    if (outcome === 'blank') expect(sent).toContainEqual([Type.SetNodeAttribute, expect.any(Number), 'href', ''])
  },
)

test.each(['legacy'].flatMap((core) => [[core, 'none'], [core, 'token strip']]))(
  '%s reads a sprite file once for all its icons, policy: %s',
  async (core, mode) => {
    // sprite files are cached per URL across observers
    const file = `https://static.invalid/icons-${core}-${mode.replace(' ', '-')}.svg?token=example`
    const fetcher = jest.fn(async (_url: string) => ({ ok: true, text: async () => spriteFile('M0 0') }))
    stubFetch(fetcher)
    const policy = jest.fn((data: any) =>
      data.kind === 'svg' ? data.value.replace('M0 0', 'M1 1') : data.value.replace('?token=example', ''),
    )
    const { app, sent } = appFixture()
    app.captureSanitizer = mode === 'none' ? undefined : policy
    document.documentElement.innerHTML =
      '<head></head><body><svg>' + `<use href="${file}#icon"></use>`.repeat(30) + '</svg></body>'
    const observer = makeObserver(core, app)
    cleanups.push(() => observer.disconnect())
    observer.observe()
    await tick()

    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([file])
    const sprites = sent.filter((m) => m[0] === Type.SetNodeAttribute && String(m[3]).startsWith(SPRITE))
    expect(sprites).toHaveLength(30)
    expect(sprites[0][3]).toContain(mode === 'none' ? 'M0 0' : 'M1 1')
    if (mode === 'none') return
    expect(policy).toHaveBeenCalledWith(expect.objectContaining({ kind: 'svg', sourceUrl: file + '#icon' }))
    expect(policy.mock.calls.some(([data]) => data.value.startsWith(SPRITE))).toBe(false)
    expect(JSON.stringify(sent)).not.toContain('token=example')
  },
)

test.each(['legacy'])('%s approves only the effective SVG sprite reference', (core) => {
  const { sanitize } = observe(
    '<svg><use xlink:href="#fallback" href="#primary"></use></svg>',
    () => null,
    core,
  )
  const references = sanitize.mock.calls
    .map(([data]) => data)
    .filter((data) => data.kind === 'resource' && data.resourceType === 'svg')
    .map((data) => data.value)

  expect(references).toEqual(['#primary'])
})

test.each(['legacy'])('%s resolves a padded fragment locally without fetching', async (core) => {
  const fetcher = jest.fn()
  stubFetch(fetcher)
  const { sent } = observe(
    '<svg><symbol id="icon"><path d="M1 1"/></symbol><use href=" #icon "></use></svg>',
    (data) => data.value,
    core,
  )
  await tick()
  expect(fetcher).not.toHaveBeenCalled()
  expect(sent).toContainEqual([
    Type.SetNodeAttribute, expect.any(Number), 'href', expect.stringContaining(SPRITE),
  ])
})

test.each(['legacy'])('%s clears previously approved style text when an update is rejected', async (core) => {
  const { sent } = observe(
    '<style>p { color: blue; }</style>',
    (data) => data.kind === 'css' && data.value.includes('red') ? null : data.value,
    core,
  )
  const initial = sent.find((m) => m[0] === Type.SetCSSDataURLBased)
  expect(initial?.[2]).toContain('blue')
  sent.length = 0
  ;(document.querySelector('style')!.firstChild as Text).data = 'p { color: red; }'
  await Promise.resolve()

  expect(sent).toContainEqual([Type.SetCSSDataURLBased, initial![1], '', expect.any(String)])
  expect(JSON.stringify(sent)).not.toContain('red')
})

test('FontFace values pass the policy once, rejected fonts are never sent, the constructor is untouched', () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'FontFace')
  class NativeFont {
    constructor(public family: string, public source: string) {}
  }
  Object.defineProperty(window, 'FontFace', { configurable: true, writable: true, value: NativeFont })
  cleanups.push(() =>
    descriptor ? Object.defineProperty(window, 'FontFace', descriptor) : delete (window as any).FontFace,
  )
  const { app, sent, sanitize } = appFixture()
  app.observer = { attachContextCallback: jest.fn() }
  sanitize.mockImplementation((d: any) => (d.value.includes(secret) ? null : 'approved:' + d.value))
  fonts(app)
  const rejected = new (window as any).FontFace(secret, 'url(/a)', { style: 'normal' })
  const font = new (window as any).FontFace('Family', 'url(/safe)')
  expect(rejected.family).toBe(secret)
  expect(font.source).toBe('url(/safe)')
  for (const field of ['family', 'source', 'descriptors'])
    expect(sanitize).toHaveBeenCalledWith(expect.objectContaining({ kind: 'font', field }))
  const approved = [Type.LoadFontFace, 0, 'approved:Family', 'approved:url(/safe)', '']
  expect(sent).toEqual([approved])

  // a later document gets the approved values without a second callback
  sanitize.mockClear()
  sent.length = 0
  app.nodes.callNodeCallbacks(document, true)
  expect(sent).toEqual([approved])
  expect(sanitize).not.toHaveBeenCalled()
})

// Observer-level regression: raw relative hrefs must preserve the existing sheet/load path.
test.each(['legacy'].flatMap((core) =>
  ['absent', 'approve', 'rewrite', 'fallback', 'deny', 'substitute'].map((mode) => [core, mode]),
))(
  '%s relative linked stylesheet preserves source semantics: %s',
  async (core, mode) => {
    const { app, sent } = appFixture()
    const policy = jest.fn((d: any) =>
      d.kind === 'resource' && d.resourceType === 'stylesheet'
        ? mode === 'rewrite'
          ? './relative.css'
          : mode === 'substitute'
            ? './placeholder.css'
            : mode === 'deny'
              ? null
              : d.value
        : d.value,
    )
    app.captureSanitizer = mode === 'absent' ? undefined : policy
    document.documentElement.innerHTML =
      '<head><link rel="stylesheet" href="./relative.css?test=example"></head><body><p>structure</p></body>'
    const link = document.querySelector('link')!
    Object.defineProperty(link, 'baseURI', { value: 'https://static.invalid/nested/' })
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
    const observer = makeObserver(core, app, 1)
    try {
      observer.observe()
      await new Promise((r) => setTimeout(r, 15))
      if (mode === 'deny' || mode === 'substitute') {
        expect(read).not.toHaveBeenCalled()
        expect(fetcher).not.toHaveBeenCalled()
      } else if (mode === 'rewrite') {
        expect(read).toHaveBeenCalled()
        expect(fetcher).not.toHaveBeenCalled()
        expect(sent).toContainEqual([
          Type.AdoptedSSInsertRuleURLBased,
          expect.any(Number),
          'p{color:blue}',
          0,
          'https://static.invalid/nested/relative.css',
        ])
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
            m[2].includes('blue'),
        ),
      ).toBe(mode !== 'deny' && mode !== 'substitute')
      expect(sent.some((m) => m[0] === Type.CreateElementNode && m[4] === 'P')).toBe(true)
    } finally {
      observer.disconnect()
      ;(globalThis as any).fetch = previous
      log.mockRestore()
    }
  },
)

test('a new registration of a former iframe node cannot reuse prior attribute emissions', () => {
  const { app, sent } = appFixture()
  const oldDocument = document.implementation.createHTMLDocument('synthetic')
  const p = oldDocument.createElement('p')
  oldDocument.body.appendChild(p)
  app.nodes.registerNode(oldDocument)
  app.nodes.registerNode(oldDocument.documentElement)
  app.nodes.registerNode(oldDocument.body)
  const [id] = app.nodes.registerNode(p)
  app.attributeSender.sendSetAttribute(id, 'title', 'approved', false, p)
  jest.spyOn(oldDocument, 'contains').mockReturnValue(false)
  const observer = new TopObserver({ app, options: { disableThrottling: true } })
  ;(observer as any).handleIframeSrcChange({ contentDocument: oldDocument })
  const [newId] = app.nodes.registerNode(p)
  expect(newId).not.toBe(id)
  app.attributeSender.removeAttribute(newId, 'title', p)
  expect(sent.some((message) => message[0] === Type.RemoveNodeAttribute)).toBe(false)
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
      } else expect(log).toHaveBeenCalledWith('Openreplay: Error parsing <use> element:', error)
    } finally {
      observer.disconnect()
      ;(globalThis as any).fetch = previous
      log.mockRestore()
    }
  },
)

test.each(['legacy'].flatMap((core) =>
  ['timer', 'load', 'rewritten-load'].map((phase) => [core, phase]),
))(
  '%s changed stylesheet href cannot reuse earlier approval at deferred %s',
  async (core, phase) => {
    const { app, sent } = appFixture()
    const policy = jest.fn((d: any) =>
      d.kind === 'resource' && d.resourceType === 'stylesheet'
        ? d.value === './approved-A.css?test=example'
          ? phase === 'rewritten-load'
            ? './approved-A.css'
            : d.value
          : null
        : d.value,
    )
    app.captureSanitizer = policy
    document.documentElement.innerHTML =
      '<head><link rel="stylesheet" href="./approved-A.css?test=example"></head><body><p>structure</p></body>'
    const link = document.querySelector('link')!
    let loaded = phase === 'timer'
    const readB = jest.fn()
    Object.defineProperty(link, 'sheet', {
      get: () => {
        if (link.getAttribute('href') !== './approved-A.css?test=example') readB()
        return loaded ? { cssRules: [{ cssText: 'p{color:blue}' }], href: link.href } : null
      },
    })
    const previous = globalThis.fetch
    const fetcher = jest.fn(async (_url: string) => {
      throw Error('synthetic fetch denied')
    })
    ;(globalThis as any).fetch = fetcher
    const log = jest.spyOn(console, 'error').mockImplementation(() => {})
    const observer = makeObserver(core, app, 1)
    try {
      observer.observe()
      if (phase !== 'timer') {
        await new Promise((r) => setTimeout(r, 15))
        expect(fetcher).toHaveBeenCalledWith(link.href)
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
