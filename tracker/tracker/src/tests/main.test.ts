// @ts-nocheck
import { describe, expect, test, jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import Tracker, { Options } from '../main/index.js'
const conditions: string[] = [
  'Map',
  'Set',
  'MutationObserver',
  'performance',
  'timing',
  'startsWith',
  'Blob',
  'Worker',
]

jest.mock('@openreplay/network-proxy', () => ({ default: jest.fn(() => 'mocked network-proxy content') }));
// jest.mock('../main/modules/network', () => jest.fn(() => 'mocked network content'));

describe('Constructor Tests', () => {
  const options = {
    projectKey: 'test-project-key',
    ingestPoint: 'test-ingest-point',
    respectDoNotTrack: false,
    network: {},
    mouse: {},
    __DISABLE_SECURE_MODE: true
  };
  beforeAll(() => {
    // Mock the performance object and its timing property
    Object.defineProperty(window, 'performance', {
      value: {
        timing: {},
        now: jest.fn(() => 1000), // Mock performance.now() if needed
      },
    });
    Object.defineProperty(window, 'Worker', {
      value: jest.fn(() => 'mocked worker content')
    })
    globalThis.IntersectionObserver = jest.fn(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    }));
  });

  afterAll(() => {
    // Clean up the mock after tests if needed
    delete window.performance;
    delete window.Worker;
    delete globalThis.IntersectionObserver;
  });

  let errorSpy
  let logSpy
  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    delete window.__OPENREPLAY__
    delete navigator.doNotTrack
    jest.restoreAllMocks()
  })

  const setDNT = (value: string) =>
    Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value })

  test('doNotTrack with respectDoNotTrack prevents App creation and start rejects', async () => {
    setDNT('1')
    const tracker = new Tracker({ ...options, respectDoNotTrack: true } as unknown as Options)
    expect(tracker.app).toBeNull()
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('doNotTrack'))
    await expect(tracker.start()).rejects.toMatch('doNotTrack')
    expect(window.__OPENREPLAY__).toBeUndefined()
  })

  test('doNotTrack is ignored without respectDoNotTrack', () => {
    setDNT('1')
    const tracker = new Tracker(options as unknown as Options)
    expect(tracker.app).not.toBeNull()
    expect(tracker.app.projectKey).toBe('test-project-key')
  })

  test('non-https page without __DISABLE_SECURE_MODE does not create an App', async () => {
    expect(location.protocol).not.toBe('https:')
    const tracker = new Tracker({
      ...options,
      __DISABLE_SECURE_MODE: false,
    } as unknown as Options)
    expect(tracker.app).toBeNull()
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('running on SSL'))
    await expect(tracker.start()).rejects.toBeDefined()
  })

  test('a second instance on the same page is refused', () => {
    const first = new Tracker(options as unknown as Options)
    expect(first.app).not.toBeNull()
    const second = new Tracker(options as unknown as Options)
    expect(second.app).toBeNull()
    expect(errorSpy).toHaveBeenCalledWith(
      'OpenReplay: one tracker instance has been initialised already',
    )
  })

  test('start delegates to the app, applying userID first', async () => {
    const tracker = new Tracker(options as unknown as Options)
    const result = { success: true, sessionID: 'sid', sessionToken: 'tok', userUUID: 'u' }
    const appStart = jest.spyOn(tracker.app, 'start').mockResolvedValue(result)
    const setUserID = jest.spyOn(tracker.app.session, 'setUserID')

    await expect(tracker.start({ userID: 'user-1' })).resolves.toBe(result)
    expect(setUserID).toHaveBeenCalledWith('user-1')
    expect(appStart).toHaveBeenCalledWith({ userID: 'user-1' })
  })
})
