import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals'
import App from '../main/app/index.js'

const SIGNAL = 'tracker inside a child iframe'
const START = 'start tracker inside frame'
const ASSIGN = 'getting node id for child iframe'

function makeApp(crossdomain: Record<string, any> | undefined, insideIframe = false) {
  return new App('key', undefined, { crossdomain } as any, () => {}, insideIframe) as any
}

describe('crossdomain message origins', () => {
  let addListener: ReturnType<typeof jest.spyOn>

  beforeEach(() => {
    ;(global as any).IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(global as any).Worker = class {
      postMessage() {}
      terminate() {}
      addEventListener() {}
    }
    addListener = jest.spyOn(window, 'addEventListener')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const messageListeners = () =>
    addListener.mock.calls.filter((c: any[]) => c[0] === 'message').map((c: any[]) => c[1])

  test('a parent without crossdomain.enabled does not answer child iframes', () => {
    const app = makeApp(undefined)
    expect(messageListeners()).not.toContain(app.crossDomainIframeListener)
  })

  test('a parent with crossdomain.enabled listens for child iframes', () => {
    const app = makeApp({ enabled: true })
    expect(messageListeners()).toContain(app.crossDomainIframeListener)
  })

  test('childDomains drops messages from other origins before any reply', () => {
    const app = makeApp({ enabled: true, childDomains: ['https://widget.example.com/'] })
    jest.spyOn(app, 'active').mockReturnValue(true)
    const source = { postMessage: jest.fn() }

    app.crossDomainIframeListener({
      source,
      origin: 'https://ads.example.net',
      data: { line: SIGNAL, context: 'x' },
    })
    expect(source.postMessage).not.toHaveBeenCalled()

    app.crossDomainIframeListener({
      source,
      origin: 'https://widget.example.com',
      data: { line: SIGNAL, context: 'y' },
    })
    expect(source.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ line: 'signal that parent is live' }),
      'https://widget.example.com',
    )
  })

  test('replies to a sandboxed frame (origin "null") still go out', () => {
    const app = makeApp({ enabled: true })
    jest.spyOn(app, 'active').mockReturnValue(true)
    const source = { postMessage: jest.fn() }

    app.crossDomainIframeListener({ source, origin: 'null', data: { line: SIGNAL, context: 'z' } })

    expect(source.postMessage).toHaveBeenCalledWith(expect.anything(), '*')
  })

  test('a child ignores commands that do not come from its parent window', () => {
    const app = makeApp({ enabled: true }, true)
    const setToken = jest.spyOn(app.session, 'setSessionToken')

    app.parentCrossDomainFrameListener({
      source: {},
      origin: 'https://evil.example',
      data: { line: START, token: 'attacker-token' },
    })

    expect(setToken).not.toHaveBeenCalled()
  })

  test('a child with parentDomain only takes its token from that origin', () => {
    const parent = {}
    jest.spyOn(window, 'parent', 'get').mockReturnValue(parent as any)
    const app = makeApp({ enabled: true, parentDomain: 'https://shop.example.com' }, true)
    const setToken = jest.spyOn(app.session, 'setSessionToken')
    const assign = { line: ASSIGN, id: 1, token: 'tok' }

    app.parentCrossDomainFrameListener({ source: parent, origin: 'https://evil.example', data: assign })
    expect(setToken).not.toHaveBeenCalled()

    app.parentCrossDomainFrameListener({ source: parent, origin: 'https://shop.example.com', data: assign })
    expect(setToken).toHaveBeenCalledWith('tok', 'key')
  })
})
