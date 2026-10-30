import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals'
import TopObserver from '../main/app/observer/top_observer.js'
import Nodes from '../main/app/nodes/index.js'
import Sanitizer, { SanitizeLevel } from '../main/app/sanitizer.js'
import type { Options as SanitizerOptions } from '../main/app/sanitizer.js'
import selection from '../main/modules/selection.js'
import { Type } from '../common/messages.gen.js'

// Masked content must not leak through attributes or selected text.

let nodes: Nodes
let sent: any[]
let observer: TopObserver
let app: any
let listeners: [EventTarget, string, any][] = []

function makeApp(options: Partial<SanitizerOptions>) {
  const a: any = {
    options: { forceNgOff: true },
    safe: (f: any) => f,
    send: (msg: any) => sent.push(msg),
    getBaseHref: () => 'http://localhost/',
    callResanitizeCallbacks: jest.fn(),
    attachEventListener: (target: EventTarget, type: string, fn: any) => {
      target.addEventListener(type, fn)
      listeners.push([target, type, fn])
    },
    debug: { log: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() },
  }
  a.nodes = nodes = new Nodes({
    node_id: '__openreplay_id',
    forceNgOff: true,
    maintainer: { enabled: false },
  })
  a.sanitizer = new Sanitizer({ app: a, options: { obscureTextEmails: false, ...options } })
  a.attributeSender = {
    sendSetAttribute: (id: number, name: string, value: string) =>
      a.send([Type.SetNodeAttribute, id, name, value]),
  }
  return a
}

const $ = (sel: string) => document.querySelector(sel) as HTMLElement
const attributes = (sel: string) =>
  Object.fromEntries(
    sent
      .filter((m) => m[0] === Type.SetNodeAttribute && m[1] === nodes.getID($(sel)))
      .map((m) => [m[2], m[3]]),
  )

function setup(body: string, options: Partial<SanitizerOptions> = {}) {
  document.documentElement.innerHTML = `<head></head><body>${body}</body>`
  app = makeApp(options)
  observer = new TopObserver({ app, options: { disableThrottling: true } })
  observer.observe()
}

beforeEach(() => {
  sent = []
})

afterEach(() => {
  observer.disconnect()
  listeners.forEach(([target, type, fn]) => target.removeEventListener(type, fn))
  listeners = []
})

describe('attributes of masked nodes', () => {
  test('wipes attributes that can hold content', () => {
    setup(
      '<div data-openreplay-obscured>' +
        '<span id="s" title="Jane Smith" aria-label="Jane Smith" data-name="Jane"' +
        ' data-openreplay-label="Jane"></span>' +
        '<select><option id="o" value="Jane Smith">x</option></select>' +
        '</div>',
    )
    expect(attributes('#s')).toEqual({
      id: 's',
      title: '**** *****',
      'aria-label': '**** *****',
      'data-name': '****',
      'data-openreplay-label': '****',
    })
    expect(attributes('#o')).toEqual({ id: 'o', value: '**** *****' })
  })

  test('keeps checkbox and radio values, which selectors like [value=x]:checked rely on', () => {
    setup(
      '<div data-openreplay-obscured>' +
        '<input id="c" type="checkbox" value="yes"><input id="r" type="radio" value="card">' +
        '<input id="b" type="submit" value="Pay Jane">' +
        '<ol><li id="l" value="3">x</li></ol><progress id="p" value="50" max="100"></progress>' +
        '</div>',
    )
    expect(attributes('#c').value).toBe('yes')
    expect(attributes('#r').value).toBe('card')
    expect(attributes('#b').value).toBe('*** ****')
    expect(attributes('#l').value).toBe('*')
    expect(attributes('#p').value).toBe('**')
  })

  test('keeps layout and state attributes, so masked regions still replay correctly', () => {
    setup(
      '<table data-openreplay-obscured><tr>' +
        '<td id="c" colspan="2" class="cell" role="cell" aria-expanded="true" dir="rtl"></td>' +
        '</tr></table>',
    )
    expect(attributes('#c')).toEqual({
      id: 'c',
      colspan: '2',
      class: 'cell',
      role: 'cell',
      'aria-expanded': 'true',
      dir: 'rtl',
    })
  })

  test('keeps SVG geometry but not SVG labels', () => {
    setup(
      '<div data-openreplay-obscured><svg viewBox="0 0 1 1" aria-label="Jane">' +
        '<path id="p" d="M0 0L1 1" data-name="Jane"></path></svg></div>',
    )
    expect(attributes('svg')).toEqual({ viewBox: '0 0 1 1', 'aria-label': '****' })
    expect(attributes('#p')).toEqual({ id: 'p', d: 'M0 0L1 1', 'data-name': '****' })
  })

  test('wipes them on the placeholder of a hidden node', () => {
    setup('<div id="h" title="Jane Smith" data-openreplay-hidden>secret</div>')
    expect(attributes('#h')).toEqual({
      id: 'h',
      title: '**** *****',
      'data-openreplay-hidden': '',
    })
  })

  test('wipes them on nodes masked by domSanitizer', () => {
    setup('<span id="s" class="name" title="Jane Smith"></span>', {
      domSanitizer: (node) =>
        node.classList.contains('name') ? SanitizeLevel.Obscured : SanitizeLevel.Plain,
    })
    expect(attributes('#s').title).toBe('**** *****')
  })

  test('leaves attributes on plain nodes alone', () => {
    setup('<span id="s" title="Apply now" data-name="Jane"></span>')
    expect(attributes('#s')).toEqual({ id: 's', title: 'Apply now', 'data-name': 'Jane' })
  })

  test('wipes attributes changed after the node was recorded', async () => {
    setup('<div data-openreplay-obscured><span id="s"></span></div>')
    $('#s').setAttribute('title', 'Jane Smith')
    await Promise.resolve()
    expect(attributes('#s').title).toBe('**** *****')
  })

  test('re-sends content attributes when a node is masked or unmasked later', () => {
    let level = SanitizeLevel.Plain
    setup('<a id="a" class="name" href="/profile" title="Jane Smith"></a>', {
      domSanitizer: () => level,
    })
    level = SanitizeLevel.Obscured
    sent = []
    observer.resanitizeSubtree($('#a'))
    expect(attributes('#a')).toEqual({ title: '**** *****' })

    level = SanitizeLevel.Plain
    sent = []
    observer.resanitizeSubtree($('#a'))
    expect(attributes('#a')).toEqual({ title: 'Jane Smith' })
  })

  test('re-sends content attributes when a node gets a mask attribute later', async () => {
    setup('<span id="s" title="Jane Smith">x</span>')
    sent = []
    $('#s').setAttribute('data-openreplay-obscured', '')
    await Promise.resolve()
    expect(attributes('#s').title).toBe('**** *****')
  })

  test('re-sends content attributes when a node is moved into a masked container', async () => {
    setup('<div id="ob" data-openreplay-obscured></div><span id="s" title="Jane Smith">x</span>')
    sent = []
    $('#ob').append($('#s'))
    await Promise.resolve()
    expect(attributes('#s').title).toBe('**** *****')
  })

  test('in privateMode, wipes content attributes but keeps styling state and unmasked regions', () => {
    setup(
      '<span id="s" title="Jane Smith" data-state="open" aria-expanded="true"></span>' +
        '<ol><li id="l" value="3">x</li></ol><progress id="p" value="50" max="100"></progress>' +
        '<div data-openreplay-unmask><span id="u" title="Apply now"></span></div>',
      { privateMode: true },
    )
    expect(attributes('#s')).toEqual({
      id: 's',
      title: '**** *****',
      'data-state': 'open',
      'aria-expanded': 'true',
    })
    expect(attributes('#l').value).toBe('3')
    expect(attributes('#p').value).toBe('50')
    expect(attributes('#u')).toEqual({ id: 'u', title: 'Apply now' })
  })

  test('in privateMode, still wipes styling state under an explicit mask', () => {
    setup(
      '<div data-openreplay-obscured><span id="o" data-name="Jane"></span>' +
        '<ol><li id="l" value="3">x</li></ol></div>' +
        '<div class="name"><span id="d" data-name="Jane"></span></div>',
      {
        privateMode: true,
        domSanitizer: (node) =>
          node.classList.contains('name') ? SanitizeLevel.Obscured : SanitizeLevel.Plain,
      },
    )
    expect(attributes('#o')['data-name']).toBe('****')
    expect(attributes('#l').value).toBe('*')
    expect(attributes('#d')['data-name']).toBe('****')
  })
})

describe('selection', () => {
  const select = (from: Node, to: Node) => {
    const range = document.createRange()
    range.setStart(from, 0)
    range.setEnd(to, (to.textContent || '').length)
    const sel = document.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
    return sent.filter((m) => m[0] === Type.SelectionChange).pop()
  }
  const text = (sel: string) => $(sel).firstChild!

  test('keeps text selected from plain content', () => {
    setup('<p id="a">Apply now</p><p id="b" data-openreplay-obscured>Jane Smith</p>')
    selection(app)
    expect(select(text('#a'), text('#a'))).toEqual([
      Type.SelectionChange,
      nodes.getID(text('#a')),
      nodes.getID(text('#a')),
      'Apply now',
    ])
  })

  test('wipes text when the selection covers masked content', () => {
    setup('<p id="a">Hello</p><p id="b" data-openreplay-obscured>Jane</p>')
    selection(app)
    expect(select(text('#a'), text('#b'))[3]).toMatch(/^[*\s]+$/)
  })

  test('wipes text selected inside a hidden element', () => {
    setup('<p id="a">Hello</p><div id="h" data-openreplay-hidden>Jane</div>')
    selection(app)
    const range = document.createRange()
    range.setStart(text('#a'), 0)
    range.setEnd(text('#h'), 4)
    document.getSelection()!.removeAllRanges()
    document.getSelection()!.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
    expect(sent.filter((m) => m[0] === Type.SelectionChange).pop()[3]).toMatch(/^[*\s]+$/)
  })

  test('wipes text masked by domSanitizer', () => {
    setup('<p id="a" class="name">Jane</p>', {
      domSanitizer: (node) =>
        node.classList.contains('name') ? SanitizeLevel.Obscured : SanitizeLevel.Plain,
    })
    selection(app)
    expect(select(text('#a'), text('#a'))[3]).toBe('****')
  })

  test('in privateMode, keeps text selected inside an unmasked region', () => {
    setup('<p id="a">Jane</p><div data-openreplay-unmask><p id="u">Apply now</p></div>', {
      privateMode: true,
    })
    selection(app)
    expect(select(text('#u'), text('#u'))[3]).toBe('Apply now')
    expect(select(text('#a'), text('#a'))[3]).toBe('****')
  })
})
