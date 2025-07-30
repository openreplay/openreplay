import fontsModule from '../main/modules/fonts'
import { LoadFontFace } from '../main/app/messages.gen.js'
import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals'

function createApp() {
  return {
    send: jest.fn(),
    safe: (fn: any) => fn,
    active: jest.fn(() => true),
    nodes: {
      attachNodeCallback: jest.fn(),
      getID: jest.fn(() => 0),
    },
    observer: {
      attachContextCallback: jest.fn(),
    },
  } as any
}

describe('fonts module', () => {
  let app: any
  let nodeCallback: (node: Document) => void

  beforeEach(() => {
    ;(window as any).FontFace = class {
      constructor(public family: string, public source: string, public desc?: any) {}
    }
    app = createApp()
    fontsModule(app)
    nodeCallback = app.nodes.attachNodeCallback.mock.calls[0][0]
  })

  afterEach(() => {
    delete (window as any).FontFace
    jest.restoreAllMocks()
  })

  test('sends message when FontFace is created', () => {
    new (window as any).FontFace('MyFont', 'url(my.woff2)', { weight: '400' })
    expect(app.send).toHaveBeenCalledWith(
      // @ts-ignore
      LoadFontFace(0, 'MyFont', 'url(my.woff2)', expect.any(String))
    )
  })

  test('replays stored fonts on node callback', () => {
    new (window as any).FontFace('OtherFont', 'url(other.woff2)')
    app.send.mockClear()
    nodeCallback(document)
    expect(app.send).toHaveBeenCalledWith(
      LoadFontFace(0, 'OtherFont', 'url(other.woff2)', '')
    )
  })
})
