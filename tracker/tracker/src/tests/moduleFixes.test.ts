// @ts-nocheck
import { describe, expect, test, jest, afterEach } from '@jest/globals'
import selection from '../main/modules/selection.js'
import setupImg from '../main/modules/img.js'
import setupMouse from '../main/modules/mouse.js'
import webAnimations from '../main/modules/webAnimations.js'
import { Type } from '../main/app/messages.gen.js'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('selection', () => {
  /** Every node gets an id; `masked` elements and their subtrees get a masked level, as the observers set it. */
  function setup(html: string, masked: string[] = []) {
    document.body.innerHTML = html
    const ids = new Map<Node, number>()
    let next = 1
    const register = (n: Node) => {
      ids.set(n, next++)
      n.childNodes.forEach(register)
    }
    register(document.body)
    const maskedIds = new Set<number>()
    const mask = (n: Node) => {
      maskedIds.add(ids.get(n)!)
      n.childNodes.forEach(mask)
    }
    masked.forEach((sel) => document.querySelectorAll(sel).forEach(mask))
    let handler
    const app = {
      attachEventListener: (_t, _e, cb) => (handler = cb),
      nodes: { getID: jest.fn((n: Node) => ids.get(n)) },
      sanitizer: {
        privateMode: false,
        isObscured: (id: number) => maskedIds.has(id),
        hasMasked: () => maskedIds.size > 0,
      },
      send: jest.fn(),
    }
    selection(app)
    const select = (sc: Node, so: number, ec: Node, eo: number) => {
      const range = document.createRange()
      range.setStart(sc, so)
      range.setEnd(ec, eo)
      const sel = document.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
      handler()
      const calls = app.send.mock.calls.filter((c) => c[0][0] === Type.SelectionChange)
      return calls[calls.length - 1][0][3]
    }
    const text = (sel: string) => document.querySelector(sel)!.firstChild as Text
    const selectText = (from: string, to: string) => select(text(from), 0, text(to), text(to).length)
    return { app, select, selectText }
  }

  test('plain text is sent as is, without walking the range when nothing is masked', () => {
    const { app, selectText } = setup('<p id="a">public</p><p>more</p><p id="c">text</p>')
    expect(selectText('#a', '#c')).toBe('publicmoretext')
    expect(app.nodes.getID).toHaveBeenCalledTimes(2)
  })

  test('text is masked when an end is masked', () => {
    const { selectText } = setup('<p id="a">public</p><p id="b">secret</p>', ['#b'])
    expect(selectText('#a', '#b')).not.toContain('secret')
  })

  test('text is masked when an element masked by its level lies between plain ends', () => {
    const { selectText } = setup(
      '<p id="a">one</p><div><span class="card">4111</span></div><p id="c">two</p>',
      ['.card'],
    )
    expect(selectText('#a', '#c')).not.toContain('4111')
  })

  test('masked elements outside the range do not mask it', () => {
    const { selectText } = setup(
      '<p class="m">before</p><p id="a">one</p><p id="c">two</p><p class="m">after</p>',
      ['.m'],
    )
    expect(selectText('#a', '#c')).toBe('onetwo')
  })

  test('element boundaries: only children between the offsets count', () => {
    const { select } = setup('<div id="d"><b class="m">x</b><i>plain</i><u class="m">y</u></div>', ['.m'])
    const d = document.getElementById('d')!
    const i = d.children[1]
    // the ends must be tracked text for an event to be sent: start inside <i>, end after it
    expect(select(i.firstChild!, 0, d, 2)).toBe('plain')
    expect(select(i.firstChild!, 0, d, 3)).not.toContain('y')
  })

  test('the range walk does not trust a page-patched childNodes (LWC synthetic shadow)', () => {
    const { select } = setup('<div id="h"><span class="m">secret</span></div><p id="c">after</p>', ['.m'])
    const host = document.getElementById('h')!
    Object.defineProperty(host, 'childNodes', { get: () => [] })
    const after = document.querySelector('#c')!.firstChild!
    expect(select(host, 0, after, 3)).not.toContain('secret')
  })
})

describe('img', () => {
  function setup(obscuredIds: number[] = []) {
    const ids = new Map<Node, number>()
    let nodeCb
    const app = {
      safe: (f) => f,
      send: jest.fn(),
      attributeSender: { sendSetAttribute: jest.fn() },
      getBaseHref: () => 'http://localhost/shop/item',
      timestamp: () => 0,
      options: { forceNgOff: true },
      attachStopCallback() {},
      attachResanitizeCallback() {},
      sanitizer: { isHidden: () => false, isObscured: (id: number) => obscuredIds.includes(id) },
      nodes: {
        getID: (n: Node) => ids.get(n),
        attachNodeCallback: (cb) => (nodeCb = cb),
        attachNodeListener() {},
      },
    }
    setupImg(app)
    let next = 1
    const add = () => {
      const img = document.createElement('img')
      document.body.append(img)
      ids.set(img, next++)
      nodeCb(img)
      return img
    }
    return { app, add }
  }
  const flush = () => new Promise((r) => setTimeout(r, 0))

  test('relative srcset candidates resolve against the base url', async () => {
    const { app, add } = setup()
    const img = add()
    img.setAttribute('srcset', 'a@2x.png 2x, /b.png 3x')
    await flush()
    expect(app.attributeSender.sendSetAttribute).toHaveBeenCalledWith(
      1,
      'srcset',
      'http://localhost/shop/a@2x.png 2x, http://localhost/b.png 3x',
    )
  })

  test('src changes of a masked image are not sent', async () => {
    const { app, add } = setup([1])
    const img = add()
    img.setAttribute('src', 'http://localhost/private.png')
    await flush()
    const srcSends = app.send.mock.calls.filter(
      (c) => c[0][0] === Type.SetNodeAttributeURLBased && c[0][2] === 'src',
    )
    expect(srcSends).toEqual([])
  })
})

describe('mouse', () => {
  test('clicks inside a same-origin iframe are recorded', () => {
    const frame = document.createElement('iframe')
    document.body.append(frame)
    const doc = frame.contentDocument!
    doc.body.innerHTML = '<button id="b">in frame</button>'
    const button = doc.getElementById('b')!
    // an element of the frame's realm, not of the top window's
    expect(button instanceof Element).toBe(false)
    const ids = new Map<Node, number>([
      [doc, 10],
      [button, 11],
    ])
    let nodeCb
    const app = {
      attachStartCallback() {},
      attachStopCallback() {},
      attachEventListener: (t, type, fn) => t.addEventListener(type, fn),
      nodes: {
        getID: (n: Node) => ids.get(n),
        attachNodeCallback: (cb) => (nodeCb = cb),
        attachNodeListener: (t, type, fn) => t.addEventListener(type, fn),
      },
      observer: { getDocumentOffset: () => [0, 0] },
      sanitizer: { privateMode: false, getInnerTextSecure: () => '' },
      tagMatcher: { match: () => null },
      ticker: { attach() {} },
      send: jest.fn(),
    }
    setupMouse(app)
    nodeCb(doc)
    const w = frame.contentWindow as any
    button.dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: 5, clientY: 5 }))
    const clicks = app.send.mock.calls.filter((c) => c[0][0] === Type.MouseClick)
    expect(clicks.map((c) => c[0][1])).toEqual([11])
  })
})

describe('webAnimations', () => {
  test('a finished animation of an element inside a same-origin iframe is recorded', () => {
    const nativeAnimate = Element.prototype.animate
    try {
      const frame = document.createElement('iframe')
      document.body.append(frame)
      const doc = frame.contentDocument!
      const el = doc.createElement('x-card')
      doc.body.append(el)
      // jsdom has no Web Animations API
      const anim = Object.assign(new EventTarget(), {
        effect: { getKeyframes: () => [{ opacity: '0.5', offset: 1, easing: 'linear' }] },
      })
      ;(el as any).getAnimations = () => [anim]
      let nodeCb
      const app = {
        nodes: { getID: (n: Node) => (n === el ? 7 : undefined), attachNodeCallback: (cb) => (nodeCb = cb) },
        attachStopCallback() {},
        send: jest.fn(),
      }
      webAnimations(app)
      nodeCb(el)
      anim.dispatchEvent(new Event('finish'))
      const sent = app.send.mock.calls.filter((c) => c[0][0] === Type.NodeAnimationResult)
      expect(sent).toHaveLength(1)
      expect(sent[0][0][1]).toBe(7)
      expect(Object.keys(JSON.parse(sent[0][0][2]))).toEqual(['opacity'])
    } finally {
      Element.prototype.animate = nativeAnimate
    }
  })
})
