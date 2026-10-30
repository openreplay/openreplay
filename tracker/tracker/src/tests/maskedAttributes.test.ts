// @ts-nocheck
import { describe, expect, test, afterEach, jest } from '@jest/globals'
import TopObserver from '../main/app/observer/top_observer.js'
import NextObserver from '../main/app/observer/next_observer.js'
import Nodes from '../main/app/nodes/index.js'
import NextNodes from '../main/app/nodes/next_nodes.js'
import Sanitizer, { SanitizeLevel } from '../main/app/sanitizer.js'
import { Type } from '../common/messages.gen.js'

let sent: any[]
let app: any
let observer: any

function setup(core: 'default' | 'next', body: string, sanitizerOptions: any = {}) {
  document.documentElement.innerHTML = `<head></head><body>${body}</body>`
  sent = []
  app = {
    options: { forceNgOff: true },
    safe: (f: any) => f,
    send: (m: any) => sent.push(m),
    getBaseHref: () => 'http://localhost/',
    callResanitizeCallbacks: jest.fn(),
    debug: { log() {}, warn() {}, info() {}, error() {} },
  }
  app.sanitizer = new Sanitizer({ app, options: { obscureTextEmails: false, ...sanitizerOptions } })
  const onUnregister = (id: number) => app.sanitizer.setLevel(id, SanitizeLevel.Plain)
  app.nodes =
    core === 'next'
      ? new NextNodes({ forceNgOff: true, onUnregister })
      : new Nodes({
          node_id: '__openreplay_id',
          forceNgOff: true,
          maintainer: { enabled: false },
          onUnregister,
        })
  app.attributeSender = {
    sendSetAttribute: (id: number, name: string, value: string) =>
      sent.push([Type.SetNodeAttribute, id, name, value]),
  }
  const options = { disableThrottling: true }
  observer =
    core === 'next' ? new NextObserver({ app, options }) : new TopObserver({ app, options })
  observer.observe()
}

const $ = (s: string) => document.querySelector(s) as Element
const flush = () => new Promise((r) => setTimeout(r, 0))
/** last value sent per attribute of `el`, without its id */
const attrs = (el: Element) => {
  const id = app.nodes.getID(el)
  const out: Record<string, string> = {}
  for (const m of sent)
    if (m[0] === Type.SetNodeAttribute && m[1] === id && m[2] !== 'id') out[m[2]] = m[3]
  return out
}

afterEach(() => observer.disconnect())

describe.each(['default', 'next'] as const)('%s observer: attributes of masked content', (core) => {
  test('content attributes of obscured and hidden nodes are masked, layout and state ones kept', () => {
    setup(
      core,
      `<div data-openreplay-obscured>
        <span id="s" class="name" title="Jane Smith" aria-label="Jane Smith" aria-expanded="true" data-name="Jane">Jane Smith</span>
        <select><option id="o" value="jane@x.io">Jane</option></select>
        <input id="c" type="checkbox" value="opt-in"><input id="b" type="submit" value="Pay Jane">
        <ol><li id="l" value="3">x</li></ol>
        <svg id="g" aria-label="Jane" width="10"></svg>
      </div>
      <div id="h" data-openreplay-hidden title="Jane Smith">secret</div>
      <span id="p" title="Public">Public</span>`,
    )
    expect(attrs($('#s'))).toEqual({
      class: 'name',
      title: '**** *****',
      'aria-label': '**** *****',
      'aria-expanded': 'true',
      'data-name': '****',
    })
    expect(attrs($('#o')).value).toBe('*********')
    expect(attrs($('#b')).value).toBe('*** ****')
    expect(attrs($('#c')).value).toBe('opt-in')
    expect(attrs($('#l')).value).toBe('3')
    expect(attrs($('#g'))).toEqual({ 'aria-label': '****', width: '10' })
    expect(attrs($('#h')).title).toBe('**** *****')
    expect(attrs($('#p')).title).toBe('Public')
  })

  test('a content attribute changed later is masked', async () => {
    setup(core, '<div data-openreplay-obscured><span id="s" title="Jane">x</span></div>')
    $('#s').setAttribute('title', 'Jane Later')
    await flush()
    expect(attrs($('#s')).title).toBe('**** *****')
  })

  test('privateMode masks content attributes; data-* only under an explicit mask', () => {
    setup(
      core,
      `<button id="d" data-state="open" title="Jane">x</button>
      <div data-openreplay-obscured><span id="e" data-name="Jane"></span></div>
      <div data-openreplay-unmask><span id="u" title="Public" data-name="Public"></span></div>`,
      { privateMode: true },
    )
    expect(attrs($('#d'))).toEqual({ 'data-state': 'open', title: '****' })
    expect(attrs($('#e'))['data-name']).toBe('****')
    expect(attrs($('#u'))).toEqual({ title: 'Public', 'data-name': 'Public' })
  })

  test('a level change re-sends the attributes at the new level', async () => {
    setup(core, '<div id="w"><span id="s" title="Jane" data-name="Jane">x</span></div>')
    expect(attrs($('#s')).title).toBe('Jane')
    $('#w').setAttribute('data-openreplay-obscured', '')
    await flush()
    // the default core applies a new mask to recorded content through resanitize()
    observer.resanitizeSubtree($('#w'))
    expect(attrs($('#s'))).toEqual({ title: '****', 'data-name': '****' })

    $('#w').removeAttribute('data-openreplay-obscured')
    await flush()
    observer.resanitizeSubtree($('#w'))
    expect(attrs($('#s'))).toEqual({ title: 'Jane', 'data-name': 'Jane' })
  })

  test('an element masked through its own attribute re-sends its attributes', async () => {
    setup(core, '<span id="s" title="Jane">x</span>')
    $('#s').setAttribute('data-openreplay-obscured', '')
    await flush()
    expect(attrs($('#s')).title).toBe('****')
  })
})
