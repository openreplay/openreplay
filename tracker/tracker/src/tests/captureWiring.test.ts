/** @jest-environment-options {"url":"https://example.invalid/"} */
import { test, expect, jest, afterEach } from '@jest/globals'
jest.mock('@openreplay/network-proxy', () => ({
  __esModule: true,
  default: jest.fn(() => {
    throw Error('disabled network proxy must not initialise')
  }),
}))
import Tracker from '../main/index.js'
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
  app?.observer.disconnect()
  app?.stop(false)
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
})
function create(policy?: (d: CaptureData) => string | null, retainFontFace = false, singleTab = true, analyticsActive = false) {
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
  install(CSSStyleSheet.prototype, 'replaceSync', function (this: CSSStyleSheet, text: string) {
    while (this.cssRules.length) this.deleteRule(0)
    this.insertRule(text, 0)
  })
  install(CSSStyleSheet.prototype, 'replace', function (this: CSSStyleSheet, text: string) {
    this.replaceSync(text)
    return Promise.resolve(this)
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
    inlineCss: 0,
  })
  tracker.use((current) => {
    app = current
  })
  expect(app).not.toBeNull()
  app.activityState = 2 // Source wiring only: never call tracker.start / worker / ingest.
  return { tracker, fetcher }
}
test('real Tracker native wiring filters attributes/CSS/image/font before App buffers and preserves structural events', async () => {
  const secret = 'SYNTHETIC_PRIVATE'
  const policy = jest.fn((d: CaptureData) => {
    if (d.kind === 'attribute')
      return d.name === 'style' || (d.name === 'class' && d.value === 'safe-panel') ? d.value : null
    if (d.kind === 'css') return d.value.includes(secret) ? null : d.value
    if (
      d.kind === 'font' &&
      ['SafeFont', 'url(https://static.invalid/safe.woff2)', ''].includes(d.value)
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
  const { fetcher } = create(policy)
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
  expect(
    app.messages.some(
      (m: any[]) =>
        m[0] === Type.StringDictGlobal &&
        m[2] === 'https://static.openreplay.com/tracker/placeholder.jpeg',
    ),
  ).toBe(true)
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
  app.attributeSender.sendSetAttribute(1, 'title', secret)
  expect(JSON.stringify(app.messages)).not.toContain(secret)

  const conditions = { processMessage: jest.fn() },
    previous = app.conditionsManager
  app.conditionsManager = conditions
  app.activityState = 3
  app.attributeSender.sendSetAttribute(1, 'title', secret)
  app.attributeSender.sendSetAttribute(1, 'class', 'safe-panel')
  expect(JSON.stringify(app.bufferedMessages1)).not.toContain(secret)
  expect(JSON.stringify(conditions.processMessage.mock.calls)).not.toContain(secret)
  expect(conditions.processMessage).toHaveBeenCalled()
  app.conditionsManager = previous
  app.activityState = 2

  const warning = jest.spyOn(app.debug, 'warn').mockImplementation(() => {})
  app.options.crossdomain = { enabled: true }
  const before = app.messages.length
  for (let i = 0; i < 2; i++)
    app.crossDomainIframeListener({
      data: { line: 'batch of messages from an iframe window', messages: [[34, 1, secret]] },
    })
  expect(app.messages).toHaveLength(before)
  expect(warning).toHaveBeenCalledTimes(1)
  expect(JSON.stringify(warning.mock.calls)).not.toContain(secret)
})

test('real Tracker without the new option preserves ordinary attribute and CSS collection', () => {
  create()
  document.documentElement.innerHTML =
    '<head><style>p{color:red}</style></head><body><p title="legacy-value" style="color:blue"></p></body>'
  app.observer.observe()
  expect(
    app.messages.some((m: any[]) => m[0] === Type.StringDictGlobal && m[2] === 'legacy-value'),
  ).toBe(true)
  expect(
    app.messages.some((m: any[]) => m[0] === Type.SetCSSDataURLBased && m[2] === 'p{color:red}'),
  ).toBe(true)
})

test('rejected resource base returns null without parsing or exposing the supplied URL', () => {
  create(() => null)
  expect(app.getBaseHref()).toBe('')
  expect(app.resolveResourceURL('https://static.invalid/private')).toBeNull()
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
  app.sessionStorage.setItem('application-owned', 'keep')
  app.stopCallbacks.unshift(() => { throw Error('synthetic detach failure') })
  const later = jest.fn()
  app.stopCallbacks.push(later)
  expect(typeof (tracker as any).discard).toBe('function')
  ;(tracker as any).discard()
  expect(later).toHaveBeenCalledTimes(1)
  keys.forEach((key) => expect(app.sessionStorage.getItem(key)).toBeNull())
  expect(app.localStorage.getItem(opts.local_uuid_key)).toBeNull()
  expect(app.sessionStorage.getItem('application-owned')).toBe('keep')
  app.sessionStorage.removeItem('application-owned')
})


test('discard from initial sanitizer observation cannot start ticker or fetch tags', async () => {
  let tracker: Tracker
  const created = create((data) => {
    ;(tracker as any).discard()
    return null
  })
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


test('a sanitizer discard cannot repopulate the cleared attribute dictionary', () => {
  let tracker: Tracker
  tracker = create((data) => { (tracker as any).discard(); return data.value }).tracker
  app.attributeSender.sendSetAttribute(1, 'title', 'synthetic-private')
  expect(app.attributeSender.dict.totalChars).toBe(0)
  expect(app.attributeSender.emittedAttributes.size).toBe(0)
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
    expect(policy).toHaveBeenCalledTimes(3)
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
  policy.mockClear()
  await pending
  expect(policy).not.toHaveBeenCalled()
  expect(sheet.cssRules[0].cssText).toContain('red')
  expect(app.messages).toEqual([])
})
