// @ts-nocheck
import { describe, expect, test, jest, beforeAll, afterAll, beforeEach } from '@jest/globals'
import Tracker, { Options } from '../main/index.js'

jest.mock('@openreplay/network-proxy', () => ({
  default: jest.fn(() => 'mocked network-proxy content'),
}))

const TOKEN_KEY = '__openreplay_token'
const VERSION_KEY = '__openreplay_token_version'
const RESET_KEY = '__openreplay_reset'
const PROJECT_KEY = 'test-project-key'

const RESP = 'never-gonna-let-you-down'
const ASK = 'never-gonna-give-you-up'

const options = {
  projectKey: PROJECT_KEY,
  ingestPoint: 'test-ingest-point',
  respectDoNotTrack: false,
  network: {},
  mouse: {},
  __DISABLE_SECURE_MODE: true,
}

/** what another tab of the same build would have stored */
const currentVersion = (app: any) => app.getSessionVersionHash()

const storeToken = (token: string) =>
  sessionStorage.setItem(TOKEN_KEY, `${token}_$_${PROJECT_KEY}`)

describe('session continuation across tabs', () => {
  // the tracker is a singleton, so one instance is shared by every test
  let app: any

  beforeAll(() => {
    Object.defineProperty(window, 'performance', {
      value: { timing: {}, now: jest.fn(() => 1000) },
    })
    Object.defineProperty(window, 'Worker', {
      value: jest.fn(() => 'mocked worker content'),
    })
    globalThis.IntersectionObserver = jest.fn(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }))
    // jsdom has no BroadcastChannel, and without one the app skips the
    // cross-tab handshake entirely
    globalThis.BroadcastChannel = class {
      onmessage: ((ev: any) => void) | null = null
      postMessage = jest.fn()
      close = jest.fn()
      constructor(public name: string) {}
    }
    app = new Tracker(options as unknown as Options).app
  })

  afterAll(() => {
    delete window.performance
    delete window.Worker
    delete globalThis.IntersectionObserver
  })

  beforeEach(() => {
    sessionStorage.clear()
    // Session caches the token in memory as well as in storage
    app.session.token = undefined
  })

  test('no token at all starts a new session', () => {
    expect(app.checkSessionToken()).toBe(true)
  })

  test('token without a stored version starts a new session', () => {
    storeToken('tok')
    expect(app.checkSessionToken()).toBe(true)
  })

  test('token from a different tracker version starts a new session', () => {
    storeToken('tok')
    sessionStorage.setItem(VERSION_KEY, '1xold-build')
    expect(app.checkSessionToken()).toBe(true)
  })

  test('token from the same version continues', () => {
    storeToken('tok')
    sessionStorage.setItem(VERSION_KEY, currentVersion(app))
    expect(app.checkSessionToken()).toBe(false)
  })

  // the version branch used to overwrite the flag instead of adding to it
  test('forceNew wins over a matching version', () => {
    storeToken('tok')
    sessionStorage.setItem(VERSION_KEY, currentVersion(app))
    expect(app.checkSessionToken(true)).toBe(true)
  })

  test('a pending reset wins over a matching version', () => {
    storeToken('tok')
    sessionStorage.setItem(VERSION_KEY, currentVersion(app))
    sessionStorage.setItem(RESET_KEY, 't')
    expect(app.checkSessionToken()).toBe(true)
  })

  describe('BroadcastChannel handshake', () => {
    const send = (data: any) =>
      app.bc.onmessage({
        data: { source: 'other-tab', context: 'other-ctx', projectKey: PROJECT_KEY, ...data },
      })

    test('a tab answering an ask sends its version alongside the token', () => {
      storeToken('tok')
      app.bc.postMessage.mockClear()

      send({ line: ASK })

      expect(app.bc.postMessage).toHaveBeenCalledTimes(1)
      expect(app.bc.postMessage.mock.calls[0][0]).toMatchObject({
        token: 'tok',
        version: currentVersion(app),
      })
    })

    // a fresh tab has empty sessionStorage: without the version riding along
    // it can never continue, it can only ever start a new session
    test('adopting a same-version session lets a fresh tab continue', () => {
      expect(sessionStorage.getItem(TOKEN_KEY)).toBe(null)

      send({ line: RESP, token: 'tok', version: currentVersion(app) })

      expect(app.checkSessionToken()).toBe(false)
    })

    test('adopting a different-version session still starts new', () => {
      send({ line: RESP, token: 'tok', version: '1xold-build' })

      expect(app.checkSessionToken()).toBe(true)
    })

    test('a versionless answer from an old tracker still starts new', () => {
      send({ line: RESP, token: 'tok' })

      expect(app.checkSessionToken()).toBe(true)
    })
  })
})
