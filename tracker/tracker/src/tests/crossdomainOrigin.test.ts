import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals'
import App from '../main/app/index.js'
import { SanitizeLevel } from '../main/app/sanitizer.js'
import { Type } from '../common/messages.gen.js'

const SIGNAL = 'tracker inside a child iframe'
const START = 'start tracker inside frame'
const ASSIGN = 'getting node id for child iframe'
const BATCH = 'batch of messages from an iframe window'

/** the window of an iframe on this page */
const childWindow = () => ({ postMessage: jest.fn(), parent: window })

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
    const source = childWindow()

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
    const source = childWindow()

    app.crossDomainIframeListener({ source, origin: 'null', data: { line: SIGNAL, context: 'z' } })

    expect(source.postMessage).toHaveBeenCalledWith(expect.anything(), '*')
  })

  test('a parent takes messages only from its own iframes', () => {
    const app = makeApp({ enabled: true })
    jest.spyOn(app, 'active').mockReturnValue(true)
    const forged = [[27, 'forged', '{}']]
    // a popup or opener is a top window; a nested frame's parent is the child frame
    const popup: any = { postMessage: jest.fn() }
    popup.parent = popup
    const nested = { postMessage: jest.fn(), parent: childWindow() }
    const post = (source: any, data: any) =>
      app.crossDomainIframeListener({ source, origin: 'https://w.example', data })
    for (const source of [popup, nested, null]) {
      post(source, { line: SIGNAL, context: 'x' })
      post(source, { line: BATCH, messages: forged })
    }
    expect(popup.postMessage).not.toHaveBeenCalled()
    expect(nested.postMessage).not.toHaveBeenCalled()
    expect(app.messages).toEqual([])

    const messages = [[27, 'child', '{}']]
    post(childWindow(), { line: BATCH, messages })
    expect(app.messages).toEqual(messages)
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

describe('crossdomain child frames follow the level of their iframe on the parent page', () => {
  const ORIGIN = 'https://pay.example.com'
  const FRAME_ID = 7
  let app: any
  let source: any

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
    app = makeApp({ enabled: true })
    jest.spyOn(app, 'active').mockReturnValue(true)
    jest.spyOn(app, 'waitStarted').mockReturnValue(Promise.resolve(true))
    source = childWindow()
    const frame = { contentWindow: source }
    app.pageFrames = [frame]
    jest
      .spyOn(app.nodes, 'getID')
      .mockImplementation((n: any) => (n === frame ? FRAME_ID : undefined))
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const fromChild = (data: Record<string, any>) =>
    app.crossDomainIframeListener({ source, origin: ORIGIN, data: { context: 'c', ...data } })
  const sentToChild = (line: string) =>
    source.postMessage.mock.calls.map((c: any[]) => c[0]).filter((m: any) => m.line === line)
  const batch = (level?: SanitizeLevel) =>
    fromChild({ line: BATCH, messages: [[Type.SetNodeData, 1, 'card 4111']], level })
  const settle = () => new Promise((r) => setTimeout(r, 0))

  test('the child of a masked iframe gets its level, the child of a hidden one is not enrolled', async () => {
    app.sanitizer.setLevel(FRAME_ID, SanitizeLevel.Obscured)
    fromChild({ line: SIGNAL })
    await settle()
    expect(sentToChild(ASSIGN)).toEqual([
      expect.objectContaining({ id: FRAME_ID, level: SanitizeLevel.Obscured }),
    ])

    app.sanitizer.setLevel(FRAME_ID, SanitizeLevel.Hidden)
    fromChild({ line: SIGNAL, context: 'd' })
    await settle()
    expect(sentToChild(ASSIGN)).toHaveLength(1)
  })

  test('batches of a hidden iframe are dropped, a child masked after it joined starts over', () => {
    batch(SanitizeLevel.Plain)
    expect(app.messages).toHaveLength(1)

    app.sanitizer.setLevel(FRAME_ID, SanitizeLevel.Obscured)
    batch(SanitizeLevel.Plain)
    expect(app.messages).toHaveLength(1)
    expect(sentToChild(START)).toEqual([
      expect.objectContaining({ id: FRAME_ID, level: SanitizeLevel.Obscured }),
    ])
    batch(SanitizeLevel.Obscured)
    expect(app.messages).toHaveLength(2)

    app.sanitizer.setLevel(FRAME_ID, SanitizeLevel.Hidden)
    batch(SanitizeLevel.Obscured)
    batch()
    expect(app.messages).toHaveLength(2)

    // an iframe that is not recorded (next core: under a hidden ancestor)
    app.sanitizer.setLevel(FRAME_ID, SanitizeLevel.Plain)
    app.nodes.getID.mockReturnValue(undefined)
    batch(SanitizeLevel.Plain)
    expect(app.messages).toHaveLength(2)
  })

  test('a child records at the level it was given and reports it with its batches', () => {
    const parent = { postMessage: jest.fn() }
    jest.spyOn(window, 'parent', 'get').mockReturnValue(parent as any)
    const child = makeApp({ enabled: true }, true)
    const fromParent = (data: Record<string, any>) =>
      child.parentCrossDomainFrameListener({ source: parent, origin: ORIGIN, data })
    fromParent({ line: ASSIGN, id: FRAME_ID, token: 'tok', level: SanitizeLevel.Obscured })
    // a late answer to an earlier signal doesn't change the level of a running recording
    jest.spyOn(child, 'active').mockReturnValue(true)
    fromParent({ line: ASSIGN, id: FRAME_ID, token: 'tok', level: SanitizeLevel.Plain })
    child.messages.push([Type.SetNodeData, 1, '**** ****'])
    child._nCommit()
    expect(parent.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ line: BATCH, level: SanitizeLevel.Obscured }),
      '*',
    )
  })
})
