import viewportModule from '../main/modules/viewport'
import { SetPageLocation, SetViewportSize, SetPageVisibility } from '../main/app/messages.gen.js'
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

describe('viewport module', () => {
  let app: any
  let startCb: () => void

  beforeEach(() => {
    app = createApp()
    viewportModule(app)
    startCb = app.attachStartCallback.mock.calls[0][0]
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('registers callbacks', () => {
    expect(app.attachStartCallback).toHaveBeenCalled()
    expect(app.ticker.attach).toHaveBeenCalledTimes(2)
    if (document.hidden !== undefined) {
      expect(app.attachEventListener).toHaveBeenCalledWith(
        document,
        'visibilitychange',
        expect.any(Function),
        false,
        false,
      )
    }
  })

  test('start callback sends initial messages', () => {
    startCb()
    expect(app.send).toHaveBeenCalledWith(
      // @ts-ignore
      SetPageLocation(document.URL, document.referrer, expect.any(Number), document.title)
    )
    expect(app.send).toHaveBeenCalledWith(SetViewportSize(window.innerWidth, window.innerHeight))
    if (document.hidden !== undefined) {
      expect(app.send).toHaveBeenCalledWith(SetPageVisibility(document.hidden))
    }
  })
})
