import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import setupPerfPlugin from '../main/modules/timing.js'
import * as TrackerMessages from '../main/app/messages.gen.js'

jest.mock('web-vitals', () => ({
  onCLS: jest.fn(),
  onINP: jest.fn(),
  onLCP: jest.fn(),
  onTTFB: jest.fn(),
}))

const RTSpy = jest.spyOn(TrackerMessages, 'ResourceTiming')

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
global.PerformanceObserver = MockPerformanceObserver as any

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
  isServiceURL = jest.fn(() => false)
  tickerAttach = jest.fn()

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

describe('Performance plugin', () => {
  let mockApp: MockApp

  beforeEach(() => {
    jest.clearAllMocks()
    MockPerformanceObserver.instances.length = 0
    mockApp = new MockApp()
  })

  test('does not initialize PerformanceObserver when captureResourceTimings=false', () => {
    setupPerfPlugin(mockApp as any, { captureResourceTimings: false })
    expect(MockPerformanceObserver.instances.length).toBe(0)
  })

  test('sends ResourceTiming message for a valid resource entry', () => {
    setupPerfPlugin(mockApp as any, {})

    const startCb = mockApp.startCallbacks[0]
    startCb({ sessionID: 's1' })

    const observer = MockPerformanceObserver.instances[0]
    observer.trigger([makePerfEntry()]) // triggers callback with entry

    expect(mockApp.send).toHaveBeenCalledWith(expect.arrayContaining([
      TrackerMessages.Type.ResourceTiming,
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      "https://example.com/asset.js", // sanitized name
      "script",
      500,
      expect.any(Boolean),
    ]))
  })

  test('ignores resource when it matches excludedResourceUrls', () => {
    setupPerfPlugin(mockApp as any, { excludedResourceUrls: ['https://example.com/'] })

    const startCb = mockApp.startCallbacks[0]
    startCb({ sessionID: 's1' })

    const observer = MockPerformanceObserver.instances[0]
    observer.trigger([makePerfEntry()])

    expect(mockApp.send).not.toHaveBeenCalled()
  })

  test('applies resourceNameSanitizer before sending', () => {
    const sanitizerFn = () => 'sanitized'
    setupPerfPlugin(mockApp as any, { resourceNameSanitizer: sanitizerFn })
    const startCb = mockApp.startCallbacks[0]
    startCb({ sessionID: 's1' })

    const observer = MockPerformanceObserver.instances[0]
    observer.trigger([makePerfEntry()])


    expect(RTSpy).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      'sanitized', // sanitized name
      expect.any(String),
      expect.any(Number),
      expect.any(Boolean),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    )
  })

  test('does not attach page‑load ticker when capturePageLoadTimings=false', () => {
    setupPerfPlugin(mockApp as any, {
      capturePageLoadTimings: false,
      capturePageRenderTimings: false,
    })
    expect(mockApp.ticker.attach).not.toHaveBeenCalled()
  })

  test('attaches ticker when only capturePageRenderTimings=true', () => {
    setupPerfPlugin(mockApp as any, {
      capturePageLoadTimings: false,
      capturePageRenderTimings: true,
    })
    expect(mockApp.ticker.attach).toHaveBeenCalledTimes(1)
  })
})
