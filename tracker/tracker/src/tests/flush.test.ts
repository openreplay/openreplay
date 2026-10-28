// @ts-nocheck
import { describe, expect, test, jest, beforeAll, afterAll, beforeEach } from '@jest/globals'
import Tracker, { Options } from '../main/index.js'
import { Type as MType } from '../common/messages.gen.js'

jest.mock('@openreplay/network-proxy', () => ({
  default: jest.fn(() => 'mocked network-proxy content'),
}))
// src/common may also hold the compiled ESM build, which the worker test can't require.
jest.mock('../common/messages.gen', () => jest.requireActual('../common/messages.gen.ts'))

// App's ActivityState enum is not exported.
const ACTIVE = 2
const COLD_START = 3

const options = {
  projectKey: 'test-project-key',
  ingestPoint: 'test-ingest-point',
  respectDoNotTrack: false,
  network: {},
  mouse: {},
  __DISABLE_SECURE_MODE: true,
}

describe('forceFlushBatch', () => {
  let app: any

  beforeAll(() => {
    Object.defineProperty(window, 'performance', {
      value: { timing: {}, now: jest.fn(() => 1000) },
      configurable: true,
    })
    Object.defineProperty(window, 'Worker', {
      value: jest.fn(() => 'mocked worker content'),
      configurable: true,
    })
    globalThis.IntersectionObserver = jest.fn(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }))
    app = new Tracker(options as unknown as Options).app
  })

  afterAll(() => {
    delete window.performance
    delete window.Worker
    delete globalThis.IntersectionObserver
  })

  // The app clears its message array after posting, so keep a copy of what was sent.
  let posted: any[]

  beforeEach(() => {
    posted = []
    app.worker = {
      postMessage: jest.fn((data) => posted.push(Array.isArray(data) ? [...data] : data)),
    }
    app.activityState = ACTIVE
    app.messages.length = 0
  })

  test('hands pending messages to the worker before flushing', () => {
    app.send([MType.CustomEvent, 'checkout_submitted', '{}'])
    app.forceFlushBatch()

    expect(posted).toHaveLength(2)
    expect(posted[0].map((message) => message[0])).toEqual([
      MType.Timestamp,
      MType.TabData,
      MType.CustomEvent,
    ])
    expect(posted[1]).toBe('forceFlushBatch')
    expect(app.messages).toHaveLength(0)
  })

  test('only flushes when nothing is pending', () => {
    app.forceFlushBatch()
    expect(posted).toEqual(['forceFlushBatch'])
  })

  test('does not hand over messages before the tracker is active', () => {
    app.activityState = COLD_START
    app.messages.push([MType.CustomEvent, 'early', '{}'])
    app.forceFlushBatch()
    expect(posted).toEqual(['forceFlushBatch'])
    expect(app.messages).toHaveLength(1)
  })
})

describe('worker flushInterval', () => {
  const start = (extra = {}) => ({
    type: 'start',
    ingestPoint: 'test-ingest-point',
    pageNo: 0,
    timestamp: 0,
    url: 'https://example.com/',
    tabId: 'tab',
    ...extra,
  })

  const intervalFor = (extra) => {
    // The worker keeps its interval in module state, so load a fresh copy each time.
    jest.isolateModules(() => {
      require('../webworker/index')
    })
    const setIntervalSpy = jest.spyOn(globalThis, 'setInterval')
    self.onmessage({ data: start(extra) })
    const delay = setIntervalSpy.mock.calls[0]?.[1]
    clearInterval(setIntervalSpy.mock.results[0]?.value)
    setIntervalSpy.mockRestore()
    return delay
  }

  test('defaults to 30 seconds', () => {
    expect(intervalFor({})).toBe(30 * 1000)
  })

  test('uses the configured interval', () => {
    expect(intervalFor({ flushInterval: 1000 })).toBe(1000)
  })

  test('ignores invalid intervals', () => {
    expect(intervalFor({ flushInterval: 0 })).toBe(30 * 1000)
    expect(intervalFor({ flushInterval: -5 })).toBe(30 * 1000)
  })
})
