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

const textData = () => sent.filter((m) => m[0] === Type.SetNodeData).map((m) => m[2])
const allData = () => textData().join('|')
// the default core picks iframes up after 250ms
const waitFrames = () => new Promise((r) => setTimeout(r, 300))

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
        <meter id="m" value="720" max="850"></meter><progress id="pr" value="50" max="100"></progress>
        <iframe id="f" srcdoc="<p>Jane Smith</p>"></iframe>
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
    expect(attrs($('#l')).value).toBe('*')
    expect(attrs($('#m'))).toEqual({ value: '***', max: '850' })
    expect(attrs($('#pr'))).toEqual({ value: '**', max: '100' })
    expect(attrs($('#f')).srcdoc).toBe('******* *********')
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
      <ol><li id="l" value="3">x</li></ol><iframe id="f" srcdoc="Jane"></iframe>
      <div data-openreplay-obscured><span id="e" data-name="Jane"></span><meter id="m" value="7"></meter></div>
      <div data-openreplay-unmask><span id="u" title="Public" data-name="Public"></span></div>`,
      { privateMode: true },
    )
    expect(attrs($('#d'))).toEqual({ 'data-state': 'open', title: '****' })
    expect(attrs($('#l')).value).toBe('3')
    expect(attrs($('#f')).srcdoc).toBe('****')
    expect(attrs($('#e'))['data-name']).toBe('****')
    expect(attrs($('#m')).value).toBe('*')
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

  test('privateMode: a domSanitizer mask counts as explicit for data-* and unmask', () => {
    setup(
      core,
      `<span id="s" class="secret" data-name="Jane">x</span>
      <div class="secret"><p id="u" data-openreplay-unmask data-name="Jane">card 4111</p></div>`,
      {
        privateMode: true,
        domSanitizer: (el: Element) =>
          el.classList.contains('secret') ? SanitizeLevel.Obscured : SanitizeLevel.Plain,
      },
    )
    expect(attrs($('#s'))['data-name']).toBe('****')
    expect(attrs($('#u'))['data-name']).toBe('****')
    expect(allData()).not.toContain('4111')
  })

  test('privateMode: a masked iframe host counts as explicit for data-* and unmask inside', async () => {
    setup(core, '<div data-openreplay-obscured><iframe id="f"></iframe></div>', {
      privateMode: true,
    })
    const doc = ($('#f') as HTMLIFrameElement).contentDocument!
    doc.body.innerHTML =
      '<span id="i" data-name="Jane"></span><p data-openreplay-unmask>card 4111</p>'
    await waitFrames()
    expect(attrs(doc.getElementById('i')!)['data-name']).toBe('****')
    expect(allData()).toContain('****')
    expect(allData()).not.toContain('4111')
  })

  test('privateMode: resanitize re-sends data-* when an explicit mask goes or comes', async () => {
    setup(
      core,
      '<div id="w" data-openreplay-obscured><button id="b" data-state="open" title="Jane">x</button><meter id="m" value="7"></meter></div>',
      { privateMode: true },
    )
    expect(attrs($('#b'))).toEqual({ 'data-state': '****', title: '****' })
    expect(attrs($('#m')).value).toBe('*')
    $('#w').removeAttribute('data-openreplay-obscured')
    await flush()
    observer.resanitizeSubtree($('#w'))
    expect(attrs($('#b'))).toEqual({ 'data-state': 'open', title: '****' })
    expect(attrs($('#m')).value).toBe('7')

    $('#w').setAttribute('data-openreplay-masked', '')
    await flush()
    observer.resanitizeSubtree($('#w'))
    expect(attrs($('#b'))['data-state']).toBe('****')
    expect(attrs($('#m')).value).toBe('*')
  })

  test('privateMode: an unmask region under a new explicit mask is masked', async () => {
    setup(
      core,
      '<div id="w"><section><p id="u" data-openreplay-unmask title="Jane">card 4111</p></section></div>',
      { privateMode: true },
    )
    expect(allData()).toContain('card 4111')
    $('#w').setAttribute('data-openreplay-masked', '')
    await flush()
    // the next core applies it on the attribute change
    if (core === 'default') observer.resanitizeSubtree($('#w'))
    expect(attrs($('#u')).title).toBe('****')
    expect(allData()).toContain('**** ****')
    const count = textData().length
    ;($('#u').firstChild as Text).data = 'card 5555'
    await flush()
    expect(textData()).toHaveLength(count + 1)
    expect(allData()).not.toContain('5555')
  })
})

describe('next observer: privateMode explicit masks', () => {
  test('a node moved under an explicit mask brings its unmask regions and data-* along', async () => {
    setup(
      'next',
      `<div id="m" data-openreplay-masked></div>
      <div id="w"><i id="d" data-name="Jane"></i><p id="u" data-openreplay-unmask>card 4111</p></div>`,
      { privateMode: true },
    )
    expect(allData()).toContain('card 4111')
    expect(attrs($('#d'))['data-name']).toBe('Jane')
    $('#m').append($('#w'))
    await flush()
    expect(sent.filter((m) => m[0] === Type.RemoveNode)).toEqual([])
    expect(attrs($('#d'))['data-name']).toBe('****')
    expect(allData()).toContain('**** ****')
    const count = textData().length
    ;($('#u').firstChild as Text).data = 'card 5555'
    await flush()
    expect(textData()).toHaveLength(count + 1)
    expect(allData()).not.toContain('5555')
  })

  test('a domSanitizer mask above an unmask region masks it right away', async () => {
    setup(
      'next',
      '<div id="w"><section><p id="u" data-openreplay-unmask title="Jane">card 4111</p></section></div>',
      {
        privateMode: true,
        domSanitizer: (el: Element) =>
          el.classList.contains('secret') ? SanitizeLevel.Obscured : SanitizeLevel.Plain,
      },
    )
    expect(allData()).toContain('card 4111')
    $('#w').classList.add('secret')
    await flush()
    expect(attrs($('#u')).title).toBe('****')
    expect(allData()).toContain('**** ****')
    const count = textData().length
    ;($('#u').firstChild as Text).data = 'card 5555'
    await flush()
    expect(textData()).toHaveLength(count + 1)
    expect(allData()).not.toContain('5555')
  })

  test('a mask attribute masks data-* right away, its removal waits for resanitize', async () => {
    setup(
      'next',
      '<div id="w"><button id="b" data-state="open">x</button><span id="s" data-name="Jane"></span></div>',
      { privateMode: true },
    )
    expect(attrs($('#b'))['data-state']).toBe('open')
    $('#w').setAttribute('data-openreplay-masked', '')
    await flush()
    expect(attrs($('#b'))['data-state']).toBe('****')
    expect(attrs($('#s'))['data-name']).toBe('****')

    $('#w').removeAttribute('data-openreplay-masked')
    await flush()
    expect(attrs($('#b'))['data-state']).toBe('****')
    observer.resanitizeSubtree($('#w'))
    expect(attrs($('#b'))['data-state']).toBe('open')
  })
})
