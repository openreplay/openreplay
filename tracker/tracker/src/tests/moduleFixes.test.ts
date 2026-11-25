// @ts-nocheck
import { describe, expect, test, jest, afterEach } from '@jest/globals'
import selection from '../main/modules/selection.js'
import setupMouse from '../main/modules/mouse.js'
import webAnimations from '../main/modules/webAnimations.js'
import Sanitizer, { SanitizeLevel } from '../main/app/sanitizer.js'
import { Type } from '../main/app/messages.gen.js'
import Sanitizer from '../main/app/sanitizer.js'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('selection', () => {
  /** Every node gets an id; `masked` elements and their subtrees get a masked level, as the observers set it. */
  function setup(html: string, masked: string[] = [], sanitize = (_id, data: string) => data) {
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
        sanitize,
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
    const collapse = () => {
      document.getSelection()!.removeAllRanges()
      handler()
    }
    return { app, select, selectText, collapse }
  }

  test('an empty selection is sent once after a selection, not on every caret move', () => {
    const { app, selectText, collapse } = setup('<p id="a">public</p>')
    collapse()
    collapse()
    selectText('#a', '#a')
    collapse()
    collapse()
    expect(app.send.mock.calls.map((c) => c[0].slice(1))).toEqual([
      [3, 3, 'public'],
      [-1, -1, ''],
    ])
  })

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

  test('text is masked when a textarea with text lies in the range', () => {
    const { selectText } = setup(
      '<p id="a">one</p><textarea>draft secret</textarea><p id="c">two</p><textarea></textarea><p id="e">three</p>',
    )
    expect(selectText('#a', '#c')).not.toContain('secret')
    expect(selectText('#c', '#e')).toBe('twothree')
  })

  test('text that obscureTextEmails/-Numbers rewrite is masked, also when cut by an end', () => {
    const emails = new Sanitizer({ app: {}, options: { obscureTextEmails: true } })
    const { select, selectText } = setup(
      '<p id="a">one</p><p id="m">mail jane.roe@example.com</p><p id="c">two 42</p>',
      [],
      (id, data) => emails.sanitize(id, data),
    )
    expect(selectText('#a', '#c')).not.toContain('jane')
    const mail = document.querySelector('#m')!.firstChild!
    expect(select(mail, 5, mail, 13)).toBe('********')
    expect(selectText('#c', '#c')).toBe('two 42')

    const numbers = new Sanitizer({
      app: {},
      options: { obscureTextEmails: false, obscureTextNumbers: true },
    })
    const n = setup('<p id="a">card 4111</p>', [], (id, data) => numbers.sanitize(id, data))
    expect(n.selectText('#a', '#a')).toBe('**** ****')
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
      sanitizer: {
        privateMode: false,
        getInnerTextSecure: () => '',
        isObscured: () => false,
        stateAttributesMasked: () => false,
      },
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

  test('a click sends no text, description or data-* value of masked content', () => {
    document.body.innerHTML =
      '<ul><li id="free">Room 4 is free</li>' +
      '<li id="next">Next patient: <span class="m">Jane Smith</span></li></ul>' +
      '<button id="call" class="m" aria-label="Call Jane Smith">☎</button>' +
      '<p><a class="m" data-patient="jane.smith">File of Jane Smith</a></p>'
    const ids = new Map<Node, number>()
    const register = (n: Node) => {
      ids.set(n, ids.size + 1)
      n.childNodes.forEach(register)
    }
    register(document.documentElement)
    const app = {
      attachStartCallback() {},
      attachStopCallback() {},
      attachEventListener: (t, type, fn) => t.addEventListener(type, fn),
      nodes: { getID: (n: Node) => ids.get(n), attachNodeCallback() {} },
      observer: { getDocumentOffset: () => [0, 0] },
      tagMatcher: { match: () => null },
      ticker: { attach() {} },
      send: jest.fn(),
    }
    app.sanitizer = new Sanitizer({ app })
    document
      .querySelectorAll('.m')
      .forEach((el) => app.sanitizer.setLevel(ids.get(el), SanitizeLevel.Obscured))
    // jsdom has no innerText
    document
      .querySelectorAll('li, a')
      .forEach((el) => Object.defineProperty(el, 'innerText', { value: el.textContent }))
    setupMouse(app)
    document
      .querySelectorAll('li, button, a')
      .forEach((el) =>
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 5, clientY: 5 })),
      )
    const clicks = app.send.mock.calls.map((c) => c[0]).filter((m) => m[0] === Type.MouseClick)
    expect(clicks.map((m) => m[3])).toEqual([
      'Room 4 is free',
      '#next',
      '#call',
      'html > body > p:nth-of-type(1) > a:nth-of-type(1)',
    ])
    expect(JSON.stringify(clicks)).not.toMatch(/jane/i)
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
        attachStartCallback() {},
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
