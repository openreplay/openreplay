import viewportModule from '../main/modules/viewport'
import { SetPageLocation, SetViewportSize, SetPageVisibility, Type } from '../main/app/messages.gen.js'
import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals'

function createApp() {
  return {
    send: jest.fn(),
    safe: (fn: any) => fn,
    attachStartCallback: jest.fn(),
    attachEventListener: jest.fn((t: any, e: string, cb: EventListener) => t.addEventListener(e, cb)),
    ticker: { attach: jest.fn() },
    sanitizer: { privateMode: false },
  } as any
}

const locations = (app: any) =>
  app.send.mock.calls.map((c: any) => c[0]).filter((m: any) => m[0] === Type.SetPageLocation)

const referrerDesc = Object.getOwnPropertyDescriptor(document, 'referrer')
function setReferrer(value: string) {
  Object.defineProperty(document, 'referrer', { configurable: true, get: () => value })
}

let currentUrl = 'http://localhost/'
function mockUrl(url: string) {
  currentUrl = url
}

describe('viewport module', () => {
  let app: any
  let startCb: () => void
  // ticker callback that polls the page location
  let locationTick: () => void

  const setup = (opts?: any) => {
    app = createApp()
    viewportModule(app, opts)
    startCb = app.attachStartCallback.mock.calls[0][0]
    locationTick = app.ticker.attach.mock.calls[0][0]
  }

  beforeEach(() => {
    currentUrl = 'http://localhost/'
    jest.spyOn(document, 'URL', 'get').mockImplementation(() => currentUrl)
    setReferrer('')
    setup()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    if (referrerDesc) Object.defineProperty(document, 'referrer', referrerDesc)
    else delete (document as any).referrer
  })

  test('start callback sends initial messages', () => {
    startCb()
    expect(app.send).toHaveBeenCalledWith(
      // @ts-ignore
      SetPageLocation('http://localhost/', '', expect.any(Number), document.title),
    )
    expect(app.send).toHaveBeenCalledWith(SetViewportSize(window.innerWidth, window.innerHeight))
    if (document.hidden !== undefined) {
      expect(app.send).toHaveBeenCalledWith(SetPageVisibility(document.hidden))
    }
  })

  test('does not resend the same url, resends on change with navigationStart 0', () => {
    startCb()
    locationTick()
    locationTick()
    expect(locations(app)).toHaveLength(1)
    expect(locations(app)[0][3]).not.toBe(0)

    mockUrl('http://localhost/next')
    locationTick()
    const locs = locations(app)
    expect(locs).toHaveLength(2)
    expect(locs[1][1]).toBe('http://localhost/next')
    // SPA navigation: previous url becomes the referrer
    expect(locs[1][2]).toBe('http://localhost/')
    expect(locs[1][3]).toBe(0)
  })

  test('start after a stop resends the location even if the url did not change', () => {
    startCb()
    startCb()
    expect(locations(app)).toHaveLength(2)
  })

  test('hash router replacer', () => {
    mockUrl('http://example.com/#/path/to/page?query=123')
    setup({ replaceHashSymbol: true })
    startCb()
    expect(locations(app)[0][1]).toBe('http://example.com/path/to/page?query=123')
  })

  test('sanitizes the url with the default sanitizer', () => {
    mockUrl('http://localhost/reset?token=abc&page=2')
    startCb()
    expect(locations(app)[0][1]).toBe('http://localhost/reset?token=***&page=2')
  })

  describe('referrer', () => {
    test('referrer goes through a custom urlSanitizer', () => {
      setReferrer('https://a.com/?token=abc')
      setup({ urlSanitizer: (u: string) => u.replace('abc', 'X') })
      startCb()
      expect(locations(app)[0][2]).toBe('https://a.com/?token=X')
    })

    test('default sanitizer masks secrets in document.referrer', () => {
      setReferrer('https://a.com/login?token=abc&x=1')
      setup()
      startCb()
      expect(locations(app)[0][2]).toBe('https://a.com/login?token=***&x=1')
    })

    test('previous url used as referrer after SPA navigation is sanitized', () => {
      mockUrl('http://localhost/invite?invitation=secret1')
      startCb()
      mockUrl('http://localhost/home')
      locationTick()
      const locs = locations(app)
      expect(locs[0][1]).toBe('http://localhost/invite?invitation=*******')
      expect(locs[1][2]).toBe('http://localhost/invite?invitation=*******')
    })

    test('empty referrer is sent as empty string', () => {
      setReferrer('')
      setup({ urlSanitizer: (u: string) => `sanitized:${u}` })
      startCb()
      expect(locations(app)[0][2]).toBe('')
    })

    test('private mode wipes url, referrer and title', () => {
      setReferrer('https://a.com/')
      document.title = 'Secret title'
      setup()
      app.sanitizer.privateMode = true
      startCb()
      const [, url, referrer, , title] = locations(app)[0]
      expect(url).toMatch(/^\*+$/)
      expect(referrer).toMatch(/^\*+$/)
      expect(title).toBe('****** *****')
      document.title = ''
    })
  })
})
