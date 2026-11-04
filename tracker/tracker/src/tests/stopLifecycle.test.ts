// @ts-nocheck
import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals'
import App from '../main/app/index.js'

const NOT_ACTIVE = 0
const COLD_START = 3

const START_OK = {
  token: 'tok',
  userUUID: 'uuid',
  sessionID: 'sid',
  delay: 0,
  beaconSizeLimit: 1000,
}

const okResponse = (body: any = START_OK) => ({
  status: 200,
  json: async () => body,
  text: async () => '',
})

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

describe('stop() is final for pending starts and restarts', () => {
  let app: any
  let fetchMock: jest.Mock
  let workerMsgs: any[]

  const startRequests = () =>
    fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/v1/web/start'))
  const workerAuths = () => workerMsgs.filter((m) => m?.type === 'auth')

  const startActive = async () => {
    const pending = app.start()
    await jest.advanceTimersByTimeAsync(100)
    expect((await pending).success).toBe(true)
    expect(app.active()).toBe(true)
    fetchMock.mockClear()
  }

  beforeEach(() => {
    jest.useFakeTimers()
    ;(global as any).IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    fetchMock = jest.fn(async () => okResponse())
    window.fetch = fetchMock
    app = new App(
      'key',
      undefined,
      { ingestPoint: 'https://ingest.test', __debug_report_edp: null } as any,
      () => {},
      false,
    ) as any
    workerMsgs = []
    app.worker = { postMessage: (m: any) => workerMsgs.push(m), terminate() {} }
    app.allowAppStart()
    jest.spyOn(app.observer, 'observe').mockImplementation(() => {})
    jest.spyOn(app.ticker, 'start').mockImplementation(() => {})
  })

  afterEach(() => {
    app.stop()
    jest.clearAllTimers()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  describe('start()', () => {
    test('a start response arriving after stop() does not activate the tracker', async () => {
      const res = deferred<any>()
      fetchMock.mockImplementation((url) =>
        String(url).endsWith('/v1/web/start') ? res.promise : Promise.resolve(okResponse()),
      )
      const startCb = jest.fn()
      app.attachStartCallback(startCb)

      const pending = app.start()
      await jest.advanceTimersByTimeAsync(100)
      expect(startRequests()).toHaveLength(1)

      app.stop()
      res.resolve(okResponse())

      expect(await pending).toEqual({ success: false, reason: 'canceled' })
      expect(app.active()).toBe(false)
      expect(app.activityState).toBe(NOT_ACTIVE)
      expect(startCb).not.toHaveBeenCalled()
      expect(app.observer.observe).not.toHaveBeenCalled()
      expect(workerAuths()).toHaveLength(0)
    })

    test('stop() while start() waits for the tab handshake cancels it', async () => {
      app.canStart = false
      const pending = app.start()
      app.stop()
      app.allowAppStart()
      await jest.advanceTimersByTimeAsync(100)

      expect(await pending).toEqual({ success: false, reason: 'canceled' })
      expect(startRequests()).toHaveLength(0)
    })

    test('stop() while the page is hidden cancels the start once it becomes visible', async () => {
      let hidden = true
      const desc = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden')
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
      try {
        const pending = app.start()
        app.stop()
        hidden = false
        document.dispatchEvent(new Event('visibilitychange'))
        await jest.advanceTimersByTimeAsync(100)

        expect(await pending).toEqual({ success: false, reason: 'canceled' })
        expect(startRequests()).toHaveLength(0)
      } finally {
        delete (document as any).hidden
        if (desc) Object.defineProperty(Document.prototype, 'hidden', desc)
      }
    })

    test('an explicit start() after a canceled one still works', async () => {
      const res = deferred<any>()
      fetchMock.mockImplementationOnce(() => res.promise)
      const canceled = app.start()
      await jest.advanceTimersByTimeAsync(100)
      app.stop()

      const restarted = app.start()
      await jest.advanceTimersByTimeAsync(100)
      res.resolve(okResponse({ ...START_OK, token: 'stale' }))

      expect(await canceled).toEqual({ success: false, reason: 'canceled' })
      expect(await restarted).toMatchObject({ success: true, sessionToken: 'tok' })
      expect(app.active()).toBe(true)
      expect(workerAuths()).toEqual([expect.objectContaining({ token: 'tok' })])
    })
  })

  describe('worker restart (a_stop -> a_start)', () => {
    test('stop() between a_stop and a_start prevents the restart', async () => {
      await startActive()
      app.handleWorkerMsg('a_stop')
      app.stop()
      app.handleWorkerMsg('a_start')
      await jest.advanceTimersByTimeAsync(1000)

      expect(startRequests()).toHaveLength(0)
      expect(app.active()).toBe(false)
    })

    test('a_stop arriving after stop() does not arm a restart', async () => {
      await startActive()
      app.stop()
      app.handleWorkerMsg('a_stop')
      app.handleWorkerMsg('a_start')
      await jest.advanceTimersByTimeAsync(1000)

      expect(startRequests()).toHaveLength(0)
      expect(app.active()).toBe(false)
    })

    test('stop() after a later explicit start() does not fire the stale restart', async () => {
      await startActive()
      app.handleWorkerMsg('a_stop')
      await startActive()
      app.handleWorkerMsg('a_start')
      app.stop()
      await jest.advanceTimersByTimeAsync(1000)

      expect(startRequests()).toHaveLength(0)
      expect(app.active()).toBe(false)
    })

    test('without stop() the worker restart still starts a new session', async () => {
      await startActive()
      app.handleWorkerMsg('a_stop')
      app.handleWorkerMsg('a_start')
      await jest.advanceTimersByTimeAsync(1000)

      expect(startRequests()).toHaveLength(1)
      expect(app.active()).toBe(true)
    })
  })

  describe('internal restarts', () => {
    test('stop() cancels the retry after a commit error', async () => {
      await startActive()
      app.onCommitError(new Error('boom'))
      app.stop()
      await jest.advanceTimersByTimeAsync(1000)

      expect(startRequests()).toHaveLength(0)
      expect(app.active()).toBe(false)
    })

    test('a commit error without stop() still retries', async () => {
      await startActive()
      app.onCommitError(new Error('boom'))
      await jest.advanceTimersByTimeAsync(1000)

      expect(startRequests()).toHaveLength(1)
      expect(app.active()).toBe(true)
    })

    test('restart() leaves a stopped tracker alone', async () => {
      await startActive()
      app.stop()
      app.restart()
      await jest.advanceTimersByTimeAsync(1000)

      expect(startRequests()).toHaveLength(0)
      expect(app.active()).toBe(false)
    })

    test('cold start does not resume buffering after stop()', async () => {
      await app.coldStart()
      expect(app.activityState).toBe(COLD_START)
      expect(app.observer.observe).toHaveBeenCalledTimes(1)

      app.stop()
      await jest.advanceTimersByTimeAsync(61_000)

      expect(app.activityState).toBe(NOT_ACTIVE)
      expect(app.observer.observe).toHaveBeenCalledTimes(1)
    })

    test('cold start keeps cycling until stopped', async () => {
      await app.coldStart()
      await jest.advanceTimersByTimeAsync(30_000)

      expect(app.activityState).toBe(COLD_START)
      expect(app.observer.observe).toHaveBeenCalledTimes(2)
    })

    test('stop() during the conditional start request prevents the cold start', async () => {
      const res = deferred<any>()
      fetchMock.mockImplementation((url) =>
        String(url).endsWith('/v1/web/start') ? res.promise : Promise.resolve(okResponse({})),
      )
      const startCb = jest.fn()
      app.attachStartCallback(startCb)

      const pending = app.coldStart({}, true)
      await jest.advanceTimersByTimeAsync(0)
      app.stop()
      res.resolve(okResponse({ token: 'cond', projectID: '1' }))
      await pending
      await jest.advanceTimersByTimeAsync(31_000)

      expect(startCb).not.toHaveBeenCalled()
      expect(app.activityState).toBe(NOT_ACTIVE)
      expect(app.observer.observe).not.toHaveBeenCalled()
    })
  })
})
