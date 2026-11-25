// @ts-nocheck
import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals'
import App from '../main/app/index.js'

const START_OK = {
  token: 'tok',
  userUUID: 'uuid',
  sessionID: 'sid',
  delay: 0,
  beaconSizeLimit: 1000,
}

describe('page url handed to the worker for batch headers', () => {
  let app: any
  let workerMsgs: any[]

  const startWith = async (options: any = {}) => {
    app = new App(
      'key',
      undefined,
      { ingestPoint: 'https://ingest.test', __debug_report_edp: null, ...options } as any,
      () => {},
      false,
    ) as any
    workerMsgs = []
    app.worker = { postMessage: (m: any) => workerMsgs.push(m), terminate() {} }
    app.allowAppStart()
    jest.spyOn(app.observer, 'observe').mockImplementation(() => {})
    jest.spyOn(app.ticker, 'start').mockImplementation(() => {})
    const pending = app.start()
    await jest.advanceTimersByTimeAsync(100)
    expect((await pending).success).toBe(true)
    return workerMsgs.find((m) => m?.type === 'start').url
  }

  beforeEach(() => {
    jest.useFakeTimers()
    ;(global as any).IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.fetch = jest.fn(async () => ({
      status: 200,
      json: async () => START_OK,
      text: async () => '',
    })) as any
    history.replaceState(null, '', '/reset-password?token=abc&lang=en')
  })

  afterEach(() => {
    app.stop()
    history.replaceState(null, '', '/')
    jest.clearAllTimers()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  test('goes through the default urlSanitizer', async () => {
    expect(await startWith()).toBe('http://localhost/reset-password?token=***&lang=en')
  })

  test('goes through a custom urlSanitizer', async () => {
    const urlSanitizer = (u: string) => u.split('?')[0]
    expect(await startWith({ urls: { urlSanitizer } })).toBe('http://localhost/reset-password')
  })

  test('is wiped in privateMode', async () => {
    expect(await startWith({ privateMode: true })).toMatch(/^\*+$/)
  })

  test('is empty when the urlSanitizer throws, and the start goes on', async () => {
    const urlSanitizer = () => {
      throw new Error('boom')
    }
    expect(await startWith({ urls: { urlSanitizer } })).toBe('')
  })

  test('a throwing urlSanitizer gives an empty URL to error stacks too', async () => {
    const urlSanitizer = () => {
      throw new Error('boom')
    }
    await startWith({ urls: { urlSanitizer } })
    expect(app.sanitizeURL('https://shop.test/cart?token=abc')).toBe('')
  })
})
