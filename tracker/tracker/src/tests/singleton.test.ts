// @ts-nocheck
import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals'

const trackerInstances: any[] = []
let startImpl: () => Promise<any>

jest.mock('../main/index.js', () => {
  class MockTracker {
    options: any
    analytics = { track: jest.fn() }
    start = jest.fn(() => startImpl())
    stop = jest.fn(() => 'hash')
    setUserID = jest.fn()
    getSessionID = jest.fn(() => 'sid')
    constructor(options: any) {
      this.options = options
      trackerInstances.push(this)
    }
  }
  return { __esModule: true, default: MockTracker }
})

function loadSingleton() {
  let singleton: any
  jest.isolateModules(() => {
    singleton = require('../main/singleton.js').default
  })
  return singleton
}

describe('Tracker singleton', () => {
  let warn: jest.SpiedFunction<typeof console.warn>
  let error: jest.SpiedFunction<typeof console.error>
  const options = { projectKey: 'test-project-key', ingestPoint: 'test-ingest-point' }

  beforeEach(() => {
    trackerInstances.length = 0
    startImpl = () => Promise.resolve({ success: true, sessionID: 'sid', sessionToken: 't' })
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    error = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('configure creates exactly one tracker; a second call warns', () => {
    const singleton = loadSingleton()
    singleton.configure(options)
    singleton.configure({ projectKey: 'other' })
    expect(trackerInstances).toHaveLength(1)
    expect(singleton.options).toEqual(options)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('already configured'))
  })

  test('configure without projectKey errors and stays unconfigured', async () => {
    const singleton = loadSingleton()
    singleton.configure({ ingestPoint: 'x' })
    expect(error).toHaveBeenCalledWith('OpenReplay: Missing required projectKey option')
    expect(trackerInstances).toHaveLength(0)
    expect(singleton.getInstance()).toBeNull()
    await expect(singleton.start()).resolves.toEqual({
      success: false,
      reason: 'Tracker not configured',
    })
  })

  test('methods before configure are safe no-ops that warn', async () => {
    const singleton = loadSingleton()
    await expect(singleton.start()).resolves.toEqual({
      success: false,
      reason: 'Tracker not configured',
    })
    expect(singleton.stop()).toBeUndefined()
    expect(singleton.getSessionID()).toBeNull()
    expect(singleton.isActive()).toBe(false)
    expect(typeof singleton.trackWs('ch')).toBe('function')
    expect(singleton.use((app) => app)).toBeNull()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('must be configured'))
  })

  test('start resolves with the tracker result', async () => {
    const singleton = loadSingleton()
    singleton.configure(options)
    await expect(singleton.start({ userID: 'u' })).resolves.toEqual({
      success: true,
      sessionID: 'sid',
      sessionToken: 't',
    })
    expect(trackerInstances[0].start).toHaveBeenCalledWith({ userID: 'u' })
  })

  test('a rejected Tracker.start is normalized to {success:false, reason}', async () => {
    const singleton = loadSingleton()
    singleton.configure(options)
    startImpl = () => Promise.reject('doNotTrack is enabled')
    await expect(singleton.start()).resolves.toEqual({
      success: false,
      reason: 'doNotTrack is enabled',
    })
    startImpl = () => Promise.reject(new Error('boom'))
    await expect(singleton.start()).resolves.toEqual({ success: false, reason: 'Error: boom' })
  })

  test('track routes to analytics; identify routes to setUserID', () => {
    const singleton = loadSingleton()
    singleton.configure(options)
    singleton.track('purchase', { amount: 1 }, { send_immediately: true })
    expect(trackerInstances[0].analytics.track).toHaveBeenCalledWith(
      'purchase',
      { amount: 1 },
      { send_immediately: true },
    )
    singleton.identify('user-1')
    expect(trackerInstances[0].setUserID).toHaveBeenCalledWith('user-1')
    expect(singleton.stop()).toBe('hash')
    expect(singleton.getSessionID()).toBe('sid')
  })
})
