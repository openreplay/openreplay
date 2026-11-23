import scrollDepthModule from '../main/modules/scrollDepth'
import { PageHeight, ScrollDepth, Type } from '../main/app/messages.gen.js'
import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals'

function createApp() {
  return {
    send: jest.fn(),
    safe: (fn: any) => fn,
    attachStartCallback: jest.fn(),
    attachEventListener: jest.fn((t: any, e: string, cb: EventListener) =>
      t.addEventListener(e, cb),
    ),
    ticker: { attach: jest.fn() },
  } as any
}

let url = 'http://localhost/'
let readyState: DocumentReadyState = 'complete'
let scrollHeight = 4000
let now = 0

const sent = (app: any) => app.send.mock.calls.map((c: any) => c[0])
const depths = (app: any) =>
  sent(app)
    .filter((m: any) => m[0] === Type.ScrollDepth)
    .map((m: any) => m[1])
const heights = (app: any) => sent(app).filter((m: any) => m[0] === Type.PageHeight)

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y })
  document.dispatchEvent(new Event('scroll'))
}

describe('scroll depth module', () => {
  let app: any
  let start: () => void
  let tick: () => void
  // one ticker turn of the module, `ms` after the previous one
  const after = (ms: number) => {
    now += ms
    tick()
  }

  beforeEach(() => {
    url = 'http://localhost/'
    readyState = 'complete'
    scrollHeight = 4000
    now = 1_000_000
    jest.spyOn(document, 'URL', 'get').mockImplementation(() => url)
    jest.spyOn(document, 'readyState', 'get').mockImplementation(() => readyState)
    jest
      .spyOn(document.documentElement, 'scrollHeight', 'get')
      .mockImplementation(() => scrollHeight)
    jest.spyOn(Date, 'now').mockImplementation(() => now)
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 })
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    app = createApp()
    scrollDepthModule(app)
    start = app.attachStartCallback.mock.calls[0][0]
    tick = app.ticker.attach.mock.calls[0][0]
    start()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('sends the page height and the first depth once the height holds still', () => {
    after(180)
    after(180)
    expect(sent(app)).toEqual([])
    after(400)
    expect(sent(app)).toEqual([PageHeight(4000, 1000), ScrollDepth(25)])
    after(180)
    expect(sent(app)).toHaveLength(2)
  })

  test('a page still growing (a skeleton, then content) is measured when it stops', () => {
    scrollHeight = 1000
    after(180)
    after(180)
    after(180)
    // measuring the skeleton now would read as the whole page seen
    expect(sent(app)).toEqual([])
    scrollHeight = 5000
    after(180)
    after(180)
    after(180)
    expect(sent(app)).toEqual([])
    after(180)
    expect(sent(app)).toEqual([PageHeight(5000, 1000), ScrollDepth(20)])
  })

  test('waits for load, but not past the cap', () => {
    readyState = 'loading'
    after(2000)
    expect(sent(app)).toEqual([])
    after(3000)
    expect(heights(app)).toEqual([PageHeight(4000, 1000)])
  })

  test('the first scroll measures right away', () => {
    readyState = 'loading'
    scrollTo(1000)
    after(180)
    expect(sent(app)).toEqual([PageHeight(4000, 1000), ScrollDepth(50)])
  })

  test('sends each new 5% step of the deepest point, never going back', () => {
    after(180)
    after(600)
    scrollTo(480) // 37%
    after(180)
    scrollTo(100)
    after(180)
    scrollTo(500) // 37.5%, same step
    after(180)
    scrollTo(2999.4) // bottom, subpixel short of it
    after(180)
    expect(depths(app)).toEqual([25, 35, 100])
  })

  test('a taller window reaches further once the page has settled', () => {
    window.dispatchEvent(new Event('resize'))
    after(180)
    expect(sent(app)).toEqual([])
    after(600)
    expect(depths(app)).toEqual([25])
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 2000 })
    window.dispatchEvent(new Event('resize'))
    after(180)
    expect(depths(app)).toEqual([25, 50])
  })

  test('a page shorter than the window is fully seen', () => {
    scrollHeight = 600
    after(180)
    after(600)
    expect(depths(app)).toEqual([100])
  })

  test('a new url starts over and waits for its own location message', () => {
    after(180)
    after(600)
    scrollTo(3000)
    after(180)
    expect(depths(app)).toEqual([25, 100])

    url = 'http://localhost/next'
    scrollTo(0)
    after(180)
    expect(sent(app)).toHaveLength(3)
    after(180)
    after(600)
    expect(heights(app)).toHaveLength(2)
    expect(depths(app)).toEqual([25, 100, 25])
  })
})
