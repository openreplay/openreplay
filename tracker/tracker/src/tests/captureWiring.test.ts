/** @jest-environment-options {"url":"https://example.invalid/"} */
import { test, expect, jest, afterEach } from '@jest/globals'
jest.mock('@openreplay/network-proxy', () => ({
  __esModule: true,
  default: jest.fn(() => {
    throw Error('disabled network proxy must not initialise')
  }),
}))
import Tracker from '../main/index.js'
import Analytics from '../main/modules/analytics/index.js'
import { FramesUploader } from '../common/canvas.js'
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

// discard(): final for the page. Nothing buffered is sent, start() refuses, stored ids are cleared,
// and teardown runs once the calling code has returned.
const teardown = () => Promise.resolve()
const startResponse = {
  status: 200,
  json: async () => ({ token: 'synthetic-token', userUUID: 'synthetic-uuid', sessionID: 'synthetic-id', delay: 0 }),
}

test('discard terminates the worker without a stop, clears only owned storage and refuses start', async () => {
  const { tracker } = create()
  const worker = app.worker
  app.session.setSessionToken('synthetic-token', 'synthetic-unit-project')
  localStorage.setItem(app.options.local_uuid_key, 'synthetic-uuid')
  sessionStorage.setItem('application-owned', 'keep')
  tracker.discard()
  await teardown()

  expect(worker.terminate).toHaveBeenCalledTimes(1)
  expect(worker.postMessage).not.toHaveBeenCalled()
  expect(app.activityState).toBe(0)
  expect(app.tagWatcher.interval).toBeNull()
  expect(sessionStorage.getItem(app.options.session_token_key)).toBeNull()
  expect(localStorage.getItem(app.options.local_uuid_key)).toBeNull()
  expect(sessionStorage.getItem('application-owned')).toBe('keep')
  expect(await app.start()).toMatchObject({ success: false })
  const error = jest.spyOn(console, 'error').mockImplementation(() => {})
  new Tracker({ projectKey: 'synthetic-unit-project', ingestPoint: 'https://example.invalid/ingest' })
  expect(error).toHaveBeenCalledWith('OpenReplay: one tracker instance has been initialised already')
  sessionStorage.removeItem('application-owned')
})

test('discard inside a start callback cancels the start before later callbacks', async () => {
  const { tracker, fetcher } = create()
  app.activityState = 0
  app.startCallbacks = []
  const later = jest.fn()
  app.startCallbacks.push(() => tracker.discard(), later)
  ;(fetcher as any).mockResolvedValue(startResponse)
  const result = await app._start()
  expect(result.success).toBe(false)
  expect(later).not.toHaveBeenCalled()
  expect(app.activityState).toBe(0)
})

test('a start response that arrives after discard writes no token and authorizes nothing', async () => {
  const { tracker, fetcher } = create()
  app.activityState = 0
  let resolve: (value: any) => void = () => {}
  ;(fetcher as any).mockImplementation(() => new Promise((r) => { resolve = r }))
  const worker = app.worker
  const pending = app._start()
  tracker.discard()
  resolve(startResponse)
  expect((await pending).success).toBe(false)
  expect(worker.postMessage.mock.calls.some(([m]: any[]) => m?.type === 'auth')).toBe(false)
  expect(sessionStorage.getItem(app.options.session_token_key)).toBeNull()
})

test('a pending restart cannot restart a discarded tracker', async () => {
  const { tracker } = create()
  let release: (value: boolean) => void = () => {}
  jest.spyOn(app, 'waitStatus').mockImplementation(() => new Promise<boolean>((r) => { release = r }))
  const start = jest.spyOn(app, 'start')
  app.restart()
  tracker.discard()
  release(true)
  await teardown()
  expect(start).not.toHaveBeenCalled()
})

test.each([false, true])('discard from a policy callback mid-capture records nothing more, nextObserver=%s', async (nextObserver) => {
  let tracker: Tracker
  tracker = create((data) => {
    if (data.kind === 'attribute' && data.name === 'title') tracker.discard()
    return data.value
  }, false, true, false, 0, nextObserver).tracker
  document.body.innerHTML = '<p title="first"></p><p class="later"></p>'
  expect(() => app.observer.observe()).not.toThrow()
  expect(app.messages).toEqual([])
  await teardown()
  expect(app.activityState).toBe(0)
  document.body.appendChild(document.createElement('section'))
  await teardown()
  expect(app.messages).toEqual([])
})

test('a discarded parent tells each polling cross-domain child to discard; a stopped one does not', async () => {
  const { tracker } = create()
  const child = { parent: window, postMessage: jest.fn() }
  const poll = () =>
    app.crossDomainIframeListener({
      source: child,
      origin: 'https://child.example',
      data: { line: 'hello-how-are-you-im-under-the-water-please-help-me', context: 'child-1' },
    })
  tracker.stop()
  poll()
  expect(child.postMessage).not.toHaveBeenCalled()

  tracker.discard()
  await teardown()
  poll()
  expect(child.postMessage).toHaveBeenCalledWith(
    { line: 'stop tracker inside frame', discard: true },
    'https://child.example',
  )
})

test('a cross-domain child discards itself on its parent\'s discard, and only stops on a plain kill', async () => {
  create()
  const worker = app.worker
  const fromParent = (data: object) => app.parentCrossDomainFrameListener({ source: window.parent, data })
  fromParent({ line: 'stop tracker inside frame' })
  await teardown()
  expect(app.isDisposed()).toBe(false)
  expect(app.activityState).toBe(0)

  app.session.setSessionToken('synthetic-token', 'synthetic-unit-project')
  fromParent({ line: 'stop tracker inside frame', discard: true })
  await teardown()
  expect(app.isDisposed()).toBe(true)
  expect(worker.terminate).toHaveBeenCalled()
  expect(sessionStorage.getItem(app.options.session_token_key)).toBeNull()
  expect(await app.start()).toMatchObject({ success: false })
})

test('discard with analytics active drops its queue and never sends it', async () => {
  const { tracker, fetcher } = create(undefined, false, true, true)
  ;(fetcher as any).mockResolvedValue({ ok: true, status: 200 })
  tracker.setAnalyticsToken('synthetic-analytics-token')
  tracker.track('synthetic-event', { safe: 'synthetic' })
  const batcher = (tracker.analytics as any).batcher
  tracker.discard()
  document.dispatchEvent(new Event('visibilitychange'))
  await jest.advanceTimersByTimeAsync(6000)
  tracker.analytics!.track('late-synthetic', {}, { send_immediately: true })
  expect(fetcher).not.toHaveBeenCalled()
  expect(batcher.getBatches()).toEqual({ data: { user_actions: [], events: [] } })
})

test('discard while not recording still drops analytics and keeps its ids out of storage', async () => {
  const { tracker, fetcher } = create(undefined, false, true, true)
  app.activityState = 0
  ;(fetcher as any).mockResolvedValue({ ok: true, status: 200 })
  tracker.setAnalyticsToken('synthetic-analytics-token')
  tracker.track('before-discard', { safe: 'synthetic' })
  tracker.discard()
  tracker.analytics!.track('after-discard', {}, { send_immediately: true })
  tracker.analytics!.people.reset(true)
  tracker.analytics!.people.identify('synthetic-late')
  await jest.advanceTimersByTimeAsync(6000)

  expect(fetcher).not.toHaveBeenCalled()
  expect(localStorage.getItem('$__or__distinct_device_id__$')).toBeNull()
  expect(sessionStorage.getItem('$__or__user_id__$')).toBeNull()
  expect(await tracker.start()).toEqual({ success: false, reason: 'Tracker discarded' })
})

test('ordinary stop with analytics active still flushes its queued batch', () => {
  const { tracker, fetcher } = create(undefined, false, true, true)
  ;(fetcher as any).mockResolvedValue({ ok: true, status: 200 })
  tracker.setAnalyticsToken('synthetic-analytics-token')
  tracker.track('synthetic-event', { safe: 'synthetic' })
  tracker.stop()
  expect(fetcher).toHaveBeenCalledTimes(1)
})

test('discard clears the stored analytics identity', async () => {
  const { tracker } = create(undefined, false, true, true)
  const analytics = tracker.analytics!
  sessionStorage.setItem('$__or__initial_ref__$', 'synthetic-referrer')
  analytics.constantProperties.setUserId('synthetic')
  analytics.constantProperties.saveSuperProperties({ name: 'synthetic' })
  expect(localStorage.getItem('$__or__distinct_device_id__$')).toBeTruthy()
  tracker.discard()
  await teardown()
  for (const key of ['$__or__distinct_device_id__$', '$__or__super_properties__$'])
    expect(localStorage.getItem(key)).toBeNull()
  for (const key of ['$__or__user_id__$', '$__or__initial_ref__$'])
    expect(sessionStorage.getItem(key)).toBeNull()
})

test('standalone analytics discards its saved token without changing unrelated storage', () => {
  const values = new Map([
    ['__or_sdk_analytics_token', 'synthetic-token'],
    ['unrelated', 'keep'],
  ])
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
  const analytics = new Analytics({
    ingestPoint: 'https://example.invalid',
    projectKey: 'synthetic',
    localStorage: storage,
    sessionStorage: storage,
  })
  analytics.onDiscard()
  expect(values.has('__or_sdk_analytics_token')).toBe(false)
  expect(values.get('unrelated')).toBe('keep')
})

test('a discarded canvas uploader aborts the upload in flight and takes no new batches', async () => {
  const error = jest.fn()
  const uploader = new FramesUploader({ error, unauthorized: jest.fn() })
  const signals: AbortSignal[] = []
  install(globalThis, 'fetch', jest.fn((_url: string, init: RequestInit) => {
    signals.push(init.signal!)
    return new Promise((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(new DOMException('', 'AbortError')))
    })
  }))
  const batch = { images: [{ id: 1, data: new Blob(['x']) }], canvasId: 1, createdAt: 1 } as any
  const target = { url: 'https://example.invalid/ingest/v1/web/images', token: 't', framesSupport: false }
  uploader.push(batch, target)
  await new Promise((resolve) => setTimeout(resolve, 0))
  uploader.discard()
  uploader.push(batch, target)
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(signals).toHaveLength(1)
  expect(signals[0].aborted).toBe(true)
  expect(error).not.toHaveBeenCalled()
})
