import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import setupPerfPlugin from '../main/modules/timing.js'
import * as TrackerMessages from '../main/app/messages.gen.js'
import { getTimeOrigin } from '../main/utils.js'

jest.mock('web-vitals', () => ({
  onCLS: jest.fn(),
  onINP: jest.fn(),
  onLCP: jest.fn(),
  onTTFB: jest.fn(),
}))

const RTSpy = jest.spyOn(TrackerMessages, 'ResourceTiming')
const PLTSpy = jest.spyOn(TrackerMessages, 'PageLoadTiming')
const PRTSpy = jest.spyOn(TrackerMessages, 'PageRenderTiming')

class MockPerformanceObserver {
  static instances: MockPerformanceObserver[] = []
  callback: (list: { getEntries: () => PerformanceEntry[] }) => void
  observe = jest.fn()
  disconnect = jest.fn()
  constructor(cb: any) {
    this.callback = cb
    MockPerformanceObserver.instances.push(this)
  }
  trigger(entries: any[]) {
    this.callback({ getEntries: () => entries })
  }
}
// @ts-ignore
globalThis.PerformanceObserver = MockPerformanceObserver as any

function makePerfEntry(
  partial: Partial<PerformanceResourceTiming> = {},
): PerformanceResourceTiming {
  return {
    name: 'https://example.com/asset.js',
    entryType: 'resource',
    startTime: 100,
    duration: 50,
    initiatorType: 'script',
    nextHopProtocol: 'h2',
    workerStart: 0,
    redirectStart: 0,
    redirectEnd: 0,
    fetchStart: 0,
    domainLookupStart: 0,
    domainLookupEnd: 0,
    connectStart: 0,
    secureConnectionStart: 0,
    connectEnd: 0,
    requestStart: 0,
    responseStart: 120,
    responseEnd: 150,
    transferSize: 500,
    encodedBodySize: 400,
    decodedBodySize: 400,
    toJSON: () => ({}),
    ...partial,
  } as PerformanceResourceTiming
}

class MockApp {
  send = jest.fn()
  isServiceURL = jest.fn((_url: string) => false)
  tickerCallbacks: Array<() => void> = []
  tickerAttach = jest.fn((cb: () => void) => {
    this.tickerCallbacks.push(cb)
  })

  active = jest.fn(() => true)
  sanitizer = { privateMode: false }
  ticker = { attach: this.tickerAttach }
  startCallbacks = []
  stopCallbacks = []
  attachStartCallback = jest.fn((cb) => {
    this.startCallbacks.push(cb)
  })
  attachStopCallback = jest.fn((cb) => {
    this.stopCallbacks.push(cb)
  })
}

const perfDescriptors = {
  timing: Object.getOwnPropertyDescriptor(performance, 'timing'),
  getEntriesByType: Object.getOwnPropertyDescriptor(performance, 'getEntriesByType'),
  now: Object.getOwnPropertyDescriptor(performance, 'now'),
}

function mockPerformance(timing: Record<string, number>, now = 1000, paints: any[] = []) {
  Object.defineProperty(performance, 'timing', { configurable: true, value: timing })
  Object.defineProperty(performance, 'getEntriesByType', {
    configurable: true,
    value: jest.fn(() => paints),
  })
  Object.defineProperty(performance, 'now', { configurable: true, value: jest.fn(() => now) })
}

function restorePerformance() {
  for (const [key, desc] of Object.entries(perfDescriptors)) {
    if (desc) Object.defineProperty(performance, key, desc)
    else delete (performance as any)[key]
  }
}

describe('Timing plugin', () => {
  let mockApp: MockApp

  beforeEach(() => {
    jest.clearAllMocks()
    MockPerformanceObserver.instances.length = 0
    mockApp = new MockApp()
  })

  afterEach(() => {
    restorePerformance()
  })

  const startAndTrigger = (opts: any, entry: any) => {
    setupPerfPlugin(mockApp as any, opts)
    mockApp.startCallbacks[0]({ sessionID: 's1' })
    MockPerformanceObserver.instances[0].trigger([entry])
  }

  test('does not initialize PerformanceObserver when captureResourceTimings=false', () => {
    setupPerfPlugin(mockApp as any, { captureResourceTimings: false })
    expect(MockPerformanceObserver.instances.length).toBe(0)
    expect(mockApp.ticker.attach).not.toHaveBeenCalled()
  })

  test('sends ResourceTiming message for a valid resource entry', () => {
    startAndTrigger({}, makePerfEntry())

    expect(MockPerformanceObserver.instances[0].observe).toHaveBeenCalledWith({
      type: 'resource',
      buffered: true,
    })
    expect(mockApp.send).toHaveBeenCalledTimes(1)
    expect(mockApp.send.mock.calls[0][0]).toEqual([
      TrackerMessages.Type.ResourceTiming,
      100 + getTimeOrigin(), // timestamp
      50, // duration
      120, // ttfb
      100, // header size = transfer - encoded
      400, // encoded
      400, // decoded
      'https://example.com/asset.js',
      'script',
      500, // transferred
      false, // cached
      0, // queueing
      0, // dns
      0, // initial connection
      0, // ssl
      30, // content download
      50, // total
      0, // stalled
    ])
  })

  test('skips non-http and service urls', () => {
    setupPerfPlugin(mockApp as any, {})
    mockApp.startCallbacks[0]({ sessionID: 's1' })
    mockApp.isServiceURL.mockImplementation((url: string) => url.includes('ingest'))
    MockPerformanceObserver.instances[0].trigger([
      makePerfEntry({ name: 'data:text/plain,abc' }),
      makePerfEntry({ name: 'https://ingest.example.com/v1/web/i' }),
      makePerfEntry({ duration: -1 }),
    ])
    expect(mockApp.send).not.toHaveBeenCalled()
  })

  test('ignores resource when it matches excludedResourceUrls', () => {
    startAndTrigger({ excludedResourceUrls: ['https://example.com/'] }, makePerfEntry())
    expect(mockApp.send).not.toHaveBeenCalled()
  })

  test('applies resourceNameSanitizer before sending', () => {
    startAndTrigger({ resourceNameSanitizer: () => 'sanitized' }, makePerfEntry())
    expect(RTSpy.mock.calls[0][6]).toBe('sanitized')
  })

  test('masks the resource url in private mode', () => {
    mockApp.sanitizer.privateMode = true
    startAndTrigger({}, makePerfEntry({ name: 'https://a.io/x' }))
    expect(RTSpy.mock.calls[0][6]).toBe('**************')
  })

  test.each([
    ['304 status', { responseStatus: 304 }],
    ['deliveryType cache', { deliveryType: 'cache' }],
    ['zero transfer with a decoded body', { transferSize: 0, decodedBodySize: 10 }],
  ])('marks resource as cached on %s', (_, partial) => {
    startAndTrigger({}, makePerfEntry(partial as any))
    expect(RTSpy.mock.calls[0][9]).toBe(true)
  })

  test('marks failed requests (status >= 400) with decoded size -111', () => {
    startAndTrigger({}, makePerfEntry({ responseStatus: 404 } as any))
    expect(RTSpy.mock.calls[0][5]).toBe(-111)
    expect(RTSpy.mock.calls[0][9]).toBe(false)
  })

  test('disconnects the observer on stop', () => {
    setupPerfPlugin(mockApp as any, {})
    mockApp.stopCallbacks[0]()
    expect(MockPerformanceObserver.instances[0].disconnect).toHaveBeenCalled()
  })

  test('sends PageLoadTiming once the load event has ended', () => {
    setupPerfPlugin(mockApp as any, { capturePageRenderTimings: false })
    expect(mockApp.tickerCallbacks).toHaveLength(1)
    const tick = mockApp.tickerCallbacks[0]

    const timing: Record<string, number> = {
      navigationStart: 1000,
      requestStart: 1010,
      responseStart: 1020,
      responseEnd: 1030,
      domContentLoadedEventStart: 1040,
      domContentLoadedEventEnd: 1050,
      loadEventStart: 1060,
      loadEventEnd: 0,
    }
    mockPerformance(timing, 1000, [
      { name: 'first-paint', startTime: 11 },
      { name: 'first-contentful-paint', startTime: 22 },
    ])

    tick()
    expect(PLTSpy).not.toHaveBeenCalled()

    timing.loadEventEnd = 1070
    tick()
    expect(PLTSpy).toHaveBeenCalledTimes(1)
    expect(PLTSpy).toHaveBeenCalledWith(10, 20, 30, 40, 50, 60, 70, 11, 22)

    tick()
    expect(PLTSpy).toHaveBeenCalledTimes(1)
  })

  test('sends PageLoadTiming after 30s even if the page never finished loading', () => {
    setupPerfPlugin(mockApp as any, { capturePageRenderTimings: false })
    mockPerformance({ navigationStart: 1000, loadEventEnd: 0 }, 30001)
    mockApp.tickerCallbacks[0]()
    expect(PLTSpy).toHaveBeenCalledWith(0, 0, 0, 0, 0, 0, 0, 0, 0)
  })

  test('with capturePageLoadTimings=false only render timing is sent', () => {
    setupPerfPlugin(mockApp as any, {
      capturePageLoadTimings: false,
      capturePageRenderTimings: true,
    })
    expect(mockApp.tickerCallbacks).toHaveLength(1)
    mockPerformance(
      { navigationStart: 1000, domContentLoadedEventEnd: 1500, loadEventEnd: 2000 },
      30001,
    )
    mockApp.tickerCallbacks[0]()
    expect(PLTSpy).not.toHaveBeenCalled()
    expect(PRTSpy).toHaveBeenCalledTimes(1)
    // no paint blocks yet and the interactive window is still open
    expect(PRTSpy).toHaveBeenCalledWith(0, 0, 0)
    mockApp.tickerCallbacks[0]()
    expect(PRTSpy).toHaveBeenCalledTimes(1)
  })

  test('with both page timings disabled no ticker is attached', () => {
    setupPerfPlugin(mockApp as any, {
      capturePageLoadTimings: false,
      capturePageRenderTimings: false,
    })
    expect(mockApp.ticker.attach).not.toHaveBeenCalled()
  })
})
