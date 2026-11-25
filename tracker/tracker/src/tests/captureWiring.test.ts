/** @jest-environment-options {"url":"https://example.invalid/"} */
import { test, expect, jest, afterEach } from '@jest/globals'
jest.mock('@openreplay/network-proxy', () => ({
  __esModule: true,
  default: jest.fn(() => {
    throw Error('disabled network proxy must not initialise')
  }),
}))
import Tracker from '../main/index.js'
import NextObserver from '../main/app/observer/next_observer.js'
import TopObserver from '../main/app/observer/top_observer.js'
import { styleSheetIDMap } from '../main/modules/constructedStyleSheets.js'
import { Type } from '../common/messages.gen.js'
import { type CaptureData } from '../main/app/captureSanitizer.js'

let app: any
const restores: Array<() => void> = []
const install = (object: any, name: string, value: any) => {
  const old = Object.getOwnPropertyDescriptor(object, name)
  Object.defineProperty(object, name, { configurable: true, writable: true, value })
  restores.push(() => (old ? Object.defineProperty(object, name, old) : delete object[name]))
}
afterEach(() => {
  const tracker = (window as any).__OPENREPLAY__ as Tracker | undefined
  tracker?.discard()
  app?.discard()
  app = undefined
  restores
    .splice(0)
    .reverse()
    .forEach((fn) => fn())
  delete (window as any).__OPENREPLAY__
  delete (window as any).__css_tracking_patched__
  delete (window as any).__openreplay_adpss_patched__
  jest.restoreAllMocks()
  jest.clearAllTimers()
  jest.useRealTimers()
  document.documentElement.innerHTML = '<head></head><body></body>'
})
function create(
  policy?: (d: CaptureData) => string | null,
  retainFontFace = false,
  singleTab = true,
  analyticsActive = false,
  inlineCss = 0,
  nextObserver = false,
) {
  jest.useFakeTimers()
  install(
    window,
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  install(
    window,
    'Worker',
    class {
      postMessage = jest.fn()
      terminate = jest.fn()
    },
  )
  install(URL, 'createObjectURL', () => 'blob:synthetic-unit-test')
  install(URL, 'revokeObjectURL', jest.fn())
  install(performance, 'timing', { navigationStart: Date.now() })
  const adopted = new WeakMap<Document, CSSStyleSheet[]>()
  const oldAdopted = Object.getOwnPropertyDescriptor(Document.prototype, 'adoptedStyleSheets')
  Object.defineProperty(Document.prototype, 'adoptedStyleSheets', {
    configurable: true,
    get() {
      return adopted.get(this) ?? []
    },
    set(value) {
      adopted.set(this, value)
    },
  })
  restores.push(() =>
    oldAdopted
      ? Object.defineProperty(Document.prototype, 'adoptedStyleSheets', oldAdopted)
      : delete (Document.prototype as any).adoptedStyleSheets,
  )
  const { insertRule, deleteRule } = CSSStyleSheet.prototype
  const replaceSync = function (this: CSSStyleSheet, text: string) {
    while (this.cssRules.length) deleteRule.call(this, 0)
    insertRule.call(this, text, 0)
  }
  install(CSSStyleSheet.prototype, 'replaceSync', replaceSync)
  install(CSSStyleSheet.prototype, 'replace', function (this: CSSStyleSheet, text: string) {
    return Promise.resolve().then(() => {
      replaceSync.call(this, text)
      return this
    })
  })
  if (!retainFontFace) install(
    window,
    'FontFace',
    class {
      constructor(
        public family: string,
        public source: string,
      ) {}
    },
  )
  if (!(window as any).CSSGroupingRule)
    install(
      window,
      'CSSGroupingRule',
      class {
        insertRule() {
          return 0
        }
        deleteRule() {}
      },
    )
  for (const name of ['insertRule', 'deleteRule']) {
    const descriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, name)!
    restores.push(() => Object.defineProperty(CSSStyleSheet.prototype, name, descriptor))
  }
  const fetcher = jest.fn(() => Promise.reject(Error('unit test must not fetch')))
  install(globalThis, 'fetch', fetcher)
  const tracker = new Tracker({
    projectKey: 'synthetic-unit-project',
    ingestPoint: 'https://example.invalid/ingest',
    privateMode: true,
    captureSanitizer: policy,
    forceSingleTab: singleTab,
    captureIFrames: false,
    consoleMethods: [],
    captureExceptions: false,
    capturePerformance: false,
    captureResourceTimings: false,
    capturePageLoadTimings: false,
    capturePageRenderTimings: false,
    network: {
      disabled: true,
      sessionTokenHeader: false,
      failuresOnly: false,
      ignoreHeaders: true,
      capturePayload: false,
      captureInIframes: false,
    },
    analytics: { active: analyticsActive },
    canvas: { disableCanvas: true },
    css: { scanInMemoryCSS: false },
    inlineCss,
    nextObserver,
  })
  tracker.use((current) => {
    app = current
  })
  expect(app).not.toBeNull()
  expect(app.observer).toBeInstanceOf(nextObserver ? NextObserver : TopObserver)
  app.activityState = 2 // Source wiring only: never call tracker.start / worker / ingest.
  return { tracker, fetcher }
}
test.each([false, true])('capture filtering preserves replay structure with nextObserver=%s', async (nextObserver) => {
  const secret = 'SYNTHETIC_PRIVATE'
  const policy = jest.fn((d: CaptureData) => {
    if (d.kind === 'attribute')
      return d.name === 'style' || (d.name === 'class' && d.value === 'safe-panel') ? d.value : null
    if (d.kind === 'css') return d.value.includes(secret) ? null : d.value
    if (
      d.kind === 'font' &&
      ['SafeFont', 'url("https://static.invalid/safe.woff2")', ''].includes(d.value)
    )
      return d.value
    if (
      d.kind === 'resource' &&
      d.resourceType === 'image' &&
      d.value === 'https://static.openreplay.com/tracker/placeholder.jpeg'
    )
      return d.value
    if (d.kind === 'resource' && d.resourceType === 'base') return 'https://static.invalid/'
    return null
  })
  const { fetcher } = create(policy, false, true, false, 0, nextObserver)
  document.documentElement.innerHTML = `<head><style>p::after{content:"${secret}"}</style></head><body><p class="safe-panel" title="${secret}" style="background:url(/${secret})"></p><img src="/${secret}"></body>`
  Object.defineProperty(document.querySelector('img')!, 'complete', { value: true })
  app.observer.observe()
  new (window as any).FontFace(secret, `url(/${secret})`)
  document.querySelector('p')!.setAttribute('aria-label', secret)
  await Promise.resolve()
  expect(JSON.stringify(app.messages)).not.toContain(secret)
  expect(app.messages.some((m: any[]) => m[0] === Type.CreateElementNode && m[4] === 'P')).toBe(
    true,
  )
  expect(
    app.messages.some((m: any[]) => m[0] === Type.StringDictGlobal && m[2] === 'safe-panel'),
  ).toBe(true)
  expect(policy).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'resource', resourceType: 'timing', value: expect.stringContaining(secret) }),
  )
  expect(policy).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'attribute', name: 'aria-label' }),
  )
  expect(policy).toHaveBeenCalledWith(expect.objectContaining({ kind: 'css', source: 'text' }))
  expect(policy).toHaveBeenCalledWith(expect.objectContaining({ kind: 'css', source: 'attribute' }))
  expect(policy).toHaveBeenCalledWith(expect.objectContaining({ kind: 'font', field: 'source' }))
  const sheet = document.querySelector('style')!.sheet!
  styleSheetIDMap.set(sheet, 101)
  sheet.insertRule('.private{content:"' + secret + '"}', 0)
  sheet.insertRule('.safe{color:blue}', 0)
  expect(policy).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: 'css',
      source: 'rule',
      value: expect.stringContaining(secret),
    }),
  )
  expect(
    app.messages.some(
      (m: any[]) => m[0] === Type.AdoptedSSInsertRuleURLBased && m[2].includes('blue'),
    ),
  ).toBe(true)
  const adopted = new CSSStyleSheet()
  adopted.insertRule('.safe{color:green}', 0)
  ;(document as any).adoptedStyleSheets = [adopted]
  jest.advanceTimersByTime(20)
  expect(policy).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: 'css',
      source: 'adopted',
      value: expect.stringContaining('green'),
    }),
  )
  adopted.replaceSync('.private{content:"' + secret + '"}')
  expect(JSON.stringify(app.messages)).not.toContain(secret)
  new (window as any).FontFace('SafeFont', 'url(https://static.invalid/safe.woff2)')
  expect(app.messages.some((m: any[]) => m[0] === Type.LoadFontFace && m[2] === 'SafeFont')).toBe(
    true,
  )
  expect(app.messages).toContainEqual([Type.SetNodeAttribute, 0, 'orloaded', 'true'])
  expect(fetcher).not.toHaveBeenCalled()

  // Original options mutation cannot replace the construction-time callback.
  app.options.captureSanitizer = () => secret
  document.querySelector('p')!.setAttribute('title', secret + '-changed')
  await Promise.resolve()
  expect(JSON.stringify(app.messages)).not.toContain(secret)

  const conditions = { processMessage: jest.fn() },
    previous = app.conditionsManager
  app.conditionsManager = conditions
  app.activityState = 3
  const node = document.createElement('p')
  node.title = secret
  node.className = 'safe-panel'
  document.body.append(node)
  await Promise.resolve()
  expect(JSON.stringify(app.bufferedMessages1)).not.toContain(secret)
  expect(JSON.stringify(conditions.processMessage.mock.calls)).not.toContain(secret)
  expect(conditions.processMessage).toHaveBeenCalled()
  app.conditionsManager = previous
  app.activityState = 2

  const before = app.messages.length
  const child = { postMessage: jest.fn() }
  for (const line of [
    'tracker inside a child iframe',
    'hello-how-are-you-im-under-the-water-please-help-me',
    'batch of messages from an iframe window',
  ]) {
    app.crossDomainIframeListener({
      source: child,
      data: { line, context: 'child', messages: [[34, 1, secret]] },
    })
  }
  expect(app.messages).toHaveLength(before)
  expect(child.postMessage).not.toHaveBeenCalled()
})

test.each([false, true])('ordinary capture is preserved with nextObserver=%s', (nextObserver) => {
  create(undefined, false, true, false, 0, nextObserver)
  document.documentElement.innerHTML =
    '<head><style>p{color:red}</style></head><body><p class="legacy-value" style="color:blue"></p></body>'
  app.observer.observe()
  expect(
    app.messages.some((m: any[]) => m[0] === Type.StringDictGlobal && m[2] === 'legacy-value'),
  ).toBe(true)
  expect(
    app.messages.some((m: any[]) => m[0] === Type.SetCSSDataURLBased && m[2] === 'p{color:red}'),
  ).toBe(true)
})

test('omitting a CSS rule preserves the index of the following rule', () => {
  create((data) => {
    if (data.value.includes('withheld')) return null
    if (data.value.includes('multiplied')) return '.first {} .second {}'
    return data.value
  })
  const sheet = new CSSStyleSheet()
  styleSheetIDMap.set(sheet, 101)

  sheet.insertRule('.withheld { color: red; }', 0)
  sheet.insertRule('.visible { color: blue; }', 1)
  sheet.deleteRule(1)
  sheet.insertRule('.multiplied { color: green; }', 1)

  expect(app.messages.filter((message: any[]) => message[1] === 101)).toEqual([
    [Type.AdoptedSSInsertRuleURLBased, 101, ':not(*) {}', 0, expect.any(String)],
    [Type.AdoptedSSInsertRuleURLBased, 101, '.visible { color: blue; }', 1, expect.any(String)],
    [Type.AdoptedSSDeleteRule, 101, 1],
    [Type.AdoptedSSInsertRuleURLBased, 101, ':not(*) {}', 1, expect.any(String)],
  ])
})

test('a rejected resource base is cached until the document base changes', () => {
  const policy = jest.fn(() => null)
  create(policy)
  expect(app.getBaseHref()).toBeNull()
  expect(app.getBaseHref()).toBeNull()
  expect(policy).toHaveBeenCalledTimes(1)
  document.head.innerHTML = '<base href="https://static.invalid/next/">'
  expect(app.getBaseHref()).toBeNull()
  expect(policy).toHaveBeenCalledTimes(2)
})

test('a rejected base suppresses dependent capture while preserving CSS rule indices', async () => {
  const { fetcher } = create((data) =>
    data.kind === 'resource' && data.resourceType === 'base' ? null : data.value,
    false, true, false, 1,
  )
  document.documentElement.innerHTML =
    '<head><style>p { color: blue; }</style><link rel="stylesheet" href="/theme.css"></head>' +
    '<body><img src="/image.png" srcset="/image.png 1x"><p style="color:red">text</p></body>'
  Object.defineProperty(document.querySelector('img')!, 'complete', { value: false })
  app.observer.observe()
  const sheet = new CSSStyleSheet()
  styleSheetIDMap.set(sheet, 102)
  sheet.insertRule('.withheld { color: green; }', 0)
  await jest.advanceTimersByTimeAsync(0)

  expect(fetcher).not.toHaveBeenCalled()
  expect(app.messages.some((message: any[]) =>
    message[0] === Type.SetNodeAttributeURLBased && message[2] === 'src',
  )).toBe(false)
  expect(JSON.stringify(app.messages)).not.toMatch(/theme\.css|image\.png|color:\s*(red|blue|green)/)
  expect(app.messages).toContainEqual([Type.AdoptedSSInsertRuleURLBased, 102, ':not(*) {}', 0, ''])
})

test.each([false, true])('discard during style filtering skips base approval with nextObserver=%s', (nextObserver) => {
  const policy = jest.fn((data: CaptureData) => {
    if (data.kind === 'css' && data.source === 'text') tracker.discard()
    return data.value
  })
  const { tracker } = create(policy, false, true, false, 0, nextObserver)
  document.head.innerHTML = '<style>p { color: blue; }</style>'
  app.observer.observe()

  expect(policy).toHaveBeenCalledWith(expect.objectContaining({ kind: 'css', source: 'text' }))
  expect(app.getBaseHref()).toBeNull()
  expect(policy).not.toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'base' }))
})

test('a discarded tracker has no resource base without a capture policy', () => {
  const { tracker } = create()
  expect(app.getBaseHref()).toBe(document.baseURI)
  tracker.discard()
  expect(app.getBaseHref()).toBeNull()
})

test('discard clears analytics memory without changing analytics persistence', () => {
  const { tracker } = create(undefined, false, true, true)
  const analytics = tracker.analytics!
  const identityKey = '$__or__distinct_device_id__$'
  const userKey = '$__or__user_id__$'
  const propsKey = '$__or__super_properties__$'
  analytics.constantProperties.setUserId('synthetic')
  analytics.constantProperties.saveSuperProperties({ name: 'synthetic' })
  analytics.people.setProperties('name', 'synthetic')
  expect(analytics.people.ownProperties).toEqual({ name: 'synthetic' })
  expect(localStorage.getItem(identityKey)).toBeTruthy()
  const identity = localStorage.getItem(identityKey)
  expect(sessionStorage.getItem(userKey)).toBe('synthetic')

  tracker.discard()
  expect(analytics.people.ownProperties).toEqual({})
  analytics.people.identify('synthetic-late')
  analytics.people.setProperties('late', 'synthetic-late')
  analytics.people.reset(true)
  analytics.people.deleteUser()
  expect(analytics.people.ownProperties).toEqual({})
  analytics.constantProperties.saveSuperProperties({ name: 'synthetic-late' })
  expect(localStorage.getItem(identityKey)).toBe(identity)
  expect(localStorage.getItem(propsKey)).toBe('{"name":"synthetic"}')
  expect(sessionStorage.getItem(userKey)).toBe('synthetic')
})

test.each(['conditional', 'offline'])('%s recording settles when discard aborts its request', async (path) => {
  const { tracker, fetcher } = create()
  fetcher.mockImplementation(((_url: string, init: RequestInit) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')))
    })) as typeof fetcher)
  const start = path === 'conditional' ? app.coldStart({}, true) : tracker.uploadOfflineRecording()
  expect(fetcher).toHaveBeenCalledTimes(1)

  tracker.discard()

  await expect(start).resolves.toBeUndefined()
  expect(app.coldInterval).toBeNull()
})

test.each([false, true])('discard during stylesheet approval prevents a fetch with nextObserver=%s', async (nextObserver) => {
  const { tracker, fetcher } = create((data) => {
    if (data.kind === 'resource' && data.resourceType === 'stylesheet') tracker.discard()
    return data.value
  }, false, true, false, 2, nextObserver)
  document.head.innerHTML = '<link rel="stylesheet" href="https://static.invalid/fixture.css">'
  app.observer.observe()
  await jest.advanceTimersByTimeAsync(1000)
  expect(fetcher).not.toHaveBeenCalled()
  expect(app.isDisposed()).toBe(true)
})

test('discard during adopted rule approval stops the rest of the sheet update', () => {
  const { tracker } = create((data) => {
    if (data.kind === 'css' && data.source === 'adopted') tracker.discard()
    return data.value
  })
  const first = new CSSStyleSheet()
  first.insertRule('.first {}', 0)
  const second = new CSSStyleSheet()
  second.insertRule('.second {}', 0)

  document.adoptedStyleSheets = [first, second]
  jest.advanceTimersByTime(20)

  expect(app.isDisposed()).toBe(true)
  expect(styleSheetIDMap.has(first)).toBe(false)
  expect(styleSheetIDMap.has(second)).toBe(false)
})


test('discard releases only its singleton and allows a fresh real Tracker', () => {
  const first = create().tracker
  const oldApp = app
  expect(typeof (first as any).discard).toBe('function')
  ;(first as any).discard()
  expect((window as any).__OPENREPLAY__).toBeUndefined()
  const second = create().tracker
  expect(app).not.toBe(oldApp)
  expect((window as any).__OPENREPLAY__).toBe(second)
  ;(first as any).discard()
  expect((window as any).__OPENREPLAY__).toBe(second)
  ;(second as any).discard()
})

test('discard tears down a never-started real App and never posts stop', () => {
  const { tracker } = create()
  app.activityState = 0
  const worker = app.worker
  const interval = app.tagWatcher.interval
  expect(interval).not.toBeNull()
  expect(typeof (tracker as any).discard).toBe('function')
  ;(tracker as any).discard()
  expect(worker.terminate).toHaveBeenCalledTimes(1)
  expect(worker.postMessage).not.toHaveBeenCalled()
  expect(app.worker).toBeUndefined()
  expect(app.tagWatcher.interval).toBeNull()
})

test('discard inside a real start callback prevents later callbacks and Active state', async () => {
  const { tracker, fetcher } = create()
  app.activityState = 0
  app.startCallbacks = []
  const later = jest.fn()
  app.startCallbacks.push(() => (tracker as any).discard(), later)
  ;(fetcher as any).mockResolvedValue({ status: 200, json: async () => ({
    token: 'synthetic-token', userUUID: 'synthetic-uuid', sessionID: 'synthetic-id', delay: 0,
  }) })
  const result = await app._start()
  expect(result.success).toBe(false)
  expect(later).not.toHaveBeenCalled()
  expect(app.activityState).toBe(0)
  expect(app.worker).toBeUndefined()
})

test('pending restart wait cannot restart a discarded real App', async () => {
  const { tracker } = create()
  let release: (value: boolean) => void = () => {}
  jest.spyOn(app, 'waitStatus').mockImplementation(() => new Promise<boolean>((r) => { release = r }))
  const start = jest.spyOn(app, 'start')
  app.restart()
  expect(typeof (tracker as any).discard).toBe('function')
  ;(tracker as any).discard()
  release(true)
  await Promise.resolve()
  expect(start).not.toHaveBeenCalled()
})


test('single-tab construction never creates a BroadcastChannel', () => {
  const channel = jest.fn()
  install(window, 'BroadcastChannel', channel)
  create()
  expect(channel).not.toHaveBeenCalled()
})

test('discard fences a delayed start response and does not write token or auth', async () => {
  const { tracker, fetcher } = create()
  app.activityState = 0
  let resolve: (value: any) => void = () => {}
  ;(fetcher as any).mockImplementation(() => new Promise((r) => { resolve = r }))
  const worker = app.worker
  const signalError = jest.spyOn(app, 'signalError')
  const pending = app._start()
  expect(typeof (tracker as any).discard).toBe('function')
  ;(tracker as any).discard()
  resolve({status: 200, json: async () => ({ token: 'late-synthetic-token' })})
  const result = await pending
  expect(result.success).toBe(false)
  expect(signalError).not.toHaveBeenCalled()
  expect(app.activityState).toBe(0)
  expect(worker.postMessage.mock.calls.some(([m]: any[]) => m?.type === 'auth')).toBe(false)
  expect(app.sessionStorage.getItem(app.options.session_token_key)).toBeNull()
})

test('discard settles hidden start and removes its visibility listener', async () => {
  const { tracker, fetcher } = create()
  app.activityState = 0
  install(document, 'hidden', true)
  const pending = app.start()
  expect(typeof (tracker as any).discard).toBe('function')
  ;(tracker as any).discard()
  const result = await pending
  expect(result.success).toBe(false)
  document.dispatchEvent(new Event('visibilitychange'))
  expect(fetcher).not.toHaveBeenCalled()
})

test('discard continues teardown after one throwing stop callback and clears only owned keys', () => {
  const { tracker } = create()
  const opts = app.options
  const keys = [opts.session_token_key, opts.session_pageno_key, opts.session_tabid_key,
    opts.session_reset_key, `${opts.session_token_key}_version`, '__or__watched_tags__']
  keys.forEach((key) => app.sessionStorage.setItem(key, 'synthetic'))
  app.localStorage.setItem(opts.local_uuid_key, 'synthetic')
  app.localStorage.setItem('or_buffer_1', 'synthetic')
  app.sessionStorage.setItem('application-owned', 'keep')
  app.stopCallbacks.unshift(() => { throw Error('synthetic detach failure') })
  const later = jest.fn()
  app.stopCallbacks.push(later)
  expect(typeof (tracker as any).discard).toBe('function')
  ;(tracker as any).discard()
  expect(later).toHaveBeenCalledTimes(1)
  keys.forEach((key) => expect(app.sessionStorage.getItem(key)).toBeNull())
  expect(app.localStorage.getItem(opts.local_uuid_key)).toBeNull()
  expect(app.localStorage.getItem('or_buffer_1')).toBeNull()
  expect(app.sessionStorage.getItem('application-owned')).toBe('keep')
  app.sessionStorage.removeItem('application-owned')
})


test.each([false, true])('discard during initial capture fences startup with nextObserver=%s', async (nextObserver) => {
  let tracker: Tracker
  const created = create((data) => {
    ;(tracker as any).discard()
    return null
  }, false, true, false, 0, nextObserver)
  tracker = created.tracker
  app.activityState = 0
  app.startCallbacks = []
  document.documentElement.innerHTML = '<head></head><body><p title="synthetic">safe</p></body>'
  ;(created.fetcher as any).mockResolvedValue({status:200,json:async()=>({
    token:'synthetic-token',userUUID:'synthetic-uuid',sessionID:'synthetic-id',delay:0,
  })})
  expect(typeof (tracker as any).discard).toBe('function')
  const result = await app._start()
  expect(result.success).toBe(false)
  expect(app.activityState).toBe(0)
  expect(app.ticker.timer).toBeNull()
  expect(created.fetcher).toHaveBeenCalledTimes(1)
  app.ticker.start()
  expect(app.ticker.timer).toBeNull()
})


test.each([false, true])('discard prevents dictionary writes with nextObserver=%s', (nextObserver) => {
  let tracker: Tracker
  tracker = create((data) => { tracker.discard(); return data.value }, false, true, false, 0, nextObserver).tracker
  document.body.innerHTML = '<p title="synthetic-private"></p>'
  app.observer.observe()
  expect(app.attributeSender.dict.totalChars).toBe(0)
  expect(app.attributeSender.emittedAttributes.has(document.querySelector('p'))).toBe(false)
  expect(app.messages).toEqual([])
})

test('three discard/new cycles leave only the current FontFace wrapper capturing', () => {
  const policies: any[] = []
  const apps: any[] = []
  for (let i = 0; i < 3; i++) {
    const policy = jest.fn((data: CaptureData) => data.value)
    const { tracker } = create(policy, i > 0)
    policies.push(policy); apps.push(app)
    policies.forEach((p) => p.mockClear())
    new (window as any).FontFace('SafeFont', 'url(https://example.invalid/safe.woff2)')
    expect(policy).toHaveBeenCalledTimes(2)
    policies.slice(0, -1).forEach((p) => expect(p).not.toHaveBeenCalled())
    expect(app.messages.some((m: any[]) => m[0] === Type.LoadFontFace)).toBe(true)
    ;(tracker as any).discard()
    expect(app.messages).toEqual([])
  }
})


test('never-started discard closes its channel and revokes only its owned worker URL', () => {
  const channel = { postMessage: jest.fn(), close: jest.fn(), onmessage: null }
  install(window, 'BroadcastChannel', jest.fn(() => channel))
  const { tracker } = create(undefined, false, false)
  app.activityState = 0
  expect(channel.postMessage).toHaveBeenCalledTimes(1)
  ;(tracker as any).discard()
  expect(channel.close).toHaveBeenCalledTimes(1)
  expect(channel.onmessage).toBeNull()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-unit-test')
  const plugin = jest.fn()
  tracker.use(plugin)
  expect(plugin).toHaveBeenCalledWith(null, tracker.options)
})

test('discard fences JSON already being read and suppresses stale worker callbacks', async () => {
  const { tracker, fetcher } = create()
  app.activityState = 0
  let resolve: (value: any) => void = () => {}
  const json = jest.fn(() => new Promise((r) => { resolve = r }))
  ;(fetcher as any).mockResolvedValue({ status: 200, json })
  const worker = app.worker
  const callback = worker.onmessage
  const pending = app._start()
  await Promise.resolve()
  expect(json).toHaveBeenCalledTimes(1)
  ;(tracker as any).discard()
  const calls = worker.postMessage.mock.calls.length
  callback({data: 'a_start'})
  resolve({token:'late-synthetic',userUUID:'late-uuid',sessionID:'late-id',delay:0})
  expect((await pending).success).toBe(false)
  await Promise.resolve()
  expect(worker.postMessage).toHaveBeenCalledTimes(calls)
  expect(app.sessionStorage.getItem(app.options.session_token_key)).toBeNull()
  expect(app.activityState).toBe(0)
})

test('discard settles both polling waits and refuses direct cold/offline/save/flush access', async () => {
  const { tracker } = create()
  app.activityState = 0
  app.canStart = false
  const ready = app.waitStart(), active = app.waitStarted()
  const save = jest.spyOn(Storage.prototype, 'setItem')
  ;(tracker as any).discard()
  await expect(ready).resolves.toBe(false)
  await expect(active).resolves.toBe(false)
  await app.coldStart()
  app.offlineRecording({}, jest.fn())
  await app.uploadOfflineRecording()
  app.setBuffer([[0,1]])
  app.saveBuffer(); app.forceFlushBatch()
  expect(save).not.toHaveBeenCalled()
  expect(app.getBuffer()).toEqual([])
  expect(app.activityState).toBe(0)
})


test('discard with analytics active drops its queue and never flushes or sends', async () => {
  const { tracker, fetcher } = create(undefined, false, true, true)
  ;(fetcher as any).mockResolvedValue({ok:true,status:200})
  tracker.setAnalyticsToken('synthetic-analytics-token')
  tracker.track('synthetic-event', {safe:'synthetic'})
  const batcher = (tracker.analytics as any).batcher
  const flush = jest.spyOn(batcher, 'flush')
  ;(tracker as any).discard()
  document.dispatchEvent(new Event('visibilitychange'))
  await jest.advanceTimersByTimeAsync(6000)
  tracker.track('late-synthetic', {}, {send_immediately:true})
  expect(tracker.getAnalyticsToken()).toBe('')
  expect(flush).not.toHaveBeenCalled()
  expect(fetcher).not.toHaveBeenCalled()
  expect(batcher.getBatches()).toEqual({data:{user_actions:[],events:[]}})
  expect(batcher.intervalId).toBeNull()
})

test('ordinary stop with analytics active still flushes its queued batch', () => {
  const { tracker, fetcher } = create(undefined, false, true, true)
  ;(fetcher as any).mockResolvedValue({ok:true,status:200})
  tracker.setAnalyticsToken('synthetic-analytics-token')
  tracker.track('synthetic-event', {safe:'synthetic'})
  tracker.stop()
  expect(fetcher).toHaveBeenCalledTimes(1)
})

test.each(['start tracker inside frame','getting node id for child iframe'])('retired parent listener ignores %s and cannot restore identity', (line) => {
  const { tracker, fetcher } = create()
  const listener = app.parentCrossDomainFrameListener
  window.addEventListener('message', listener)
  const remove = jest.spyOn(window, 'removeEventListener')
  ;(tracker as any).discard()
  listener({source:{},data:{line,token:'synthetic-old-token',id:7,frameOrderNumber:1,frameLevel:1}})
  expect(app.sessionStorage.getItem(app.options.session_token_key)).toBeNull()
  expect(app.rootId).toBeNull()
  expect(app.parentActive).toBe(false)
  expect(fetcher).not.toHaveBeenCalled()
  expect(remove).toHaveBeenCalledWith('message', listener)
})

test.each(['event','issue'])('%s payload serialization may discard without throwing or emitting', (method) => {
  const { tracker } = create()
  expect(() => (tracker as any)[method]('synthetic',{toJSON(){(tracker as any).discard();return {safe:true}}})).not.toThrow()
  expect(app.messages).toEqual([])
})

test('DOM sanitizer discard does not retain nodes or attach new per-node listeners', () => {
  const { tracker } = create()
  app.sanitizer.options.domSanitizer = () => { (tracker as any).discard(); return 1 }
  document.documentElement.innerHTML='<head></head><body><div><input><iframe></iframe><slot></slot></div></body>'
  app.observer.observe()
  expect(app.nodes.nodes.size).toBe(0)
  expect(app.nodes.elementListeners.size).toBe(0)
  expect(app.observer.iframeObserversArr).toEqual([])
})


test.each(['insertRule', 'replaceSync', 'replace'] as const)(
  'retired CSS %s wrappers do not call the capture policy',
  async (method) => {
    const policy = jest.fn((data: CaptureData) => data.value)
    const { tracker } = create(policy)
    const sheet = new CSSStyleSheet()
    styleSheetIDMap.set(sheet, 101)
    await sheet[method]('.before { color: blue; }')
    expect(policy).toHaveBeenCalled()

    tracker.discard()
    // A later tracker can register this sheet in the shared map.
    styleSheetIDMap.set(sheet, 102)
    policy.mockClear()
    await sheet[method]('.after { color: red; }')
    expect(policy).not.toHaveBeenCalled()
    expect(sheet.cssRules[0].cssText).toContain('red')
    expect(app.messages).toEqual([])
  },
)

test('discard fences a pending CSS replacement before its policy callback', async () => {
  const policy = jest.fn((data: CaptureData) => data.value)
  const { tracker } = create(policy)
  const sheet = new CSSStyleSheet()
  styleSheetIDMap.set(sheet, 101)
  const pending = sheet.replace('.after { color: red; }')
  tracker.discard()
  styleSheetIDMap.set(sheet, 102)
  await pending
  expect(policy).not.toHaveBeenCalled()
  expect(sheet.cssRules[0].cssText).toContain('red')
  expect(app.messages).toEqual([])
})
