import fontsModule from '../main/modules/fonts'
import { LoadFontFace } from '../main/app/messages.gen.js'
import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals'

class NativeFontFace {
  constructor(public family: string, public source: string, public desc?: any) {}
}

function createApp() {
  return {
    send: jest.fn(),
    safe:
      (fn: any) =>
      (...args: any[]) => {
        try {
          return fn(...args)
        } catch {}
      },
    active: jest.fn(() => true),
    nodes: {
      attachNodeCallback: jest.fn(),
      getID: jest.fn((): number | undefined => 0),
    },
    observer: {
      attachContextCallback: jest.fn(),
    },
  } as any
}

describe('fonts module', () => {
  let app: any
  let nodeCallback: (node: Document) => void
  let patchWindow: (wnd: any) => void

  beforeEach(() => {
    ;(window as any).FontFace = NativeFontFace
    app = createApp()
    fontsModule(app)
    nodeCallback = app.nodes.attachNodeCallback.mock.calls[0][0]
    patchWindow = app.observer.attachContextCallback.mock.calls[0][0]
  })

  afterEach(() => {
    delete (window as any).FontFace
    jest.restoreAllMocks()
  })

  test('sends message with serialized descriptor when FontFace is created', () => {
    const ff = new (window as any).FontFace('MyFont', 'url(my.woff2)', { weight: '400' })
    expect(app.send).toHaveBeenCalledTimes(1)
    expect(app.send).toHaveBeenCalledWith(
      LoadFontFace(0, 'MyFont', 'url(my.woff2)', '{"weight":"400"}'),
    )
    expect(ff).toBeInstanceOf(NativeFontFace)
    expect(ff.family).toBe('MyFont')
  })

  test('does not send for binary sources', () => {
    const ff = new (window as any).FontFace('Bin', new ArrayBuffer(4))
    expect(app.send).not.toHaveBeenCalled()
    expect(ff.family).toBe('Bin')
  })

  test('does not send while inactive but still replays later', () => {
    app.active.mockReturnValue(false)
    new (window as any).FontFace('Late', 'url(late.woff2)')
    expect(app.send).not.toHaveBeenCalled()
    nodeCallback(document)
    expect(app.send).toHaveBeenCalledWith(LoadFontFace(0, 'Late', 'url(late.woff2)', ''))
  })

  test('unserializable descriptor does not break construction', () => {
    const desc: any = {}
    desc.self = desc
    const ff = new (window as any).FontFace('Circ', 'url(c.woff2)', desc)
    expect(ff.family).toBe('Circ')
    expect(app.send).toHaveBeenCalledWith(LoadFontFace(0, 'Circ', 'url(c.woff2)', ''))
  })

  test('replays stored fonts on node callback', () => {
    new (window as any).FontFace('OtherFont', 'url(other.woff2)')
    app.send.mockClear()
    nodeCallback(document)
    expect(app.send).toHaveBeenCalledWith(LoadFontFace(0, 'OtherFont', 'url(other.woff2)', ''))
  })

  test('iframe with unregistered document: page FontFace still works, font sent once registered', () => {
    const frameDoc = document.implementation.createHTMLDocument('frame')
    const frameWnd: any = { FontFace: NativeFontFace, document: frameDoc }
    patchWindow(frameWnd)
    app.nodes.getID.mockReturnValue(undefined)

    let ff: any
    expect(() => {
      ff = new frameWnd.FontFace('FrameFont', 'url(f.woff2)', { style: 'italic' })
    }).not.toThrow()
    expect(ff).toBeInstanceOf(NativeFontFace)
    expect(ff.family).toBe('FrameFont')
    expect(app.send).not.toHaveBeenCalled()

    app.nodes.getID.mockReturnValue(7)
    nodeCallback(frameDoc)
    expect(app.send).toHaveBeenCalledWith(
      LoadFontFace(7, 'FrameFont', 'url(f.woff2)', '{"style":"italic"}'),
    )
  })
})
