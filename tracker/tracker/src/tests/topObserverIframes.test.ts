import { describe, expect, test, afterEach, jest } from '@jest/globals'
import TopObserver from '../main/app/observer/top_observer.js'
import Nodes from '../main/app/nodes/index.js'
import Sanitizer from '../main/app/sanitizer.js'
import { Type } from '../common/messages.gen.js'

let sent: any[]
let app: any
let observer: TopObserver

function setup(body: string, options: any = { disableThrottling: true }) {
  document.documentElement.innerHTML = `<head></head><body>${body}</body>`
  sent = []
  app = {
    options: { forceNgOff: true },
    safe: (f: any) => f,
    send: (msg: any) => sent.push(msg),
    callResanitizeCallbacks: jest.fn(),
    getBaseHref: () => 'http://localhost/',
    debug: { log: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() },
  }
  app.nodes = new Nodes({
    node_id: '__openreplay_id',
    forceNgOff: true,
    maintainer: { enabled: false },
    // as in App: a removed node's level is dropped
    onUnregister: (id: number) => app.sanitizer.setLevel(id, 0),
  })
  app.sanitizer = new Sanitizer({ app, options: { obscureTextEmails: false } })
  app.attributeSender = {
    sendSetAttribute: (id: number, name: string, value: string) =>
      app.send([Type.SetNodeAttribute, id, name, value]),
  }
  observer = new TopObserver({ app, options })
}

const frameText = (html: string) => {
  ;(document.getElementById('f') as HTMLIFrameElement).contentDocument!.body.innerHTML = html
}
// iframes are picked up after a 250ms delay
const waitFrames = () => new Promise((r) => setTimeout(r, 300))
const ofType = (t: number) => sent.filter((m) => m[0] === t)
const allData = () => ofType(Type.SetNodeData).map((m) => m[2]).join('|')

afterEach(() => {
  observer.disconnect()
})

describe('TopObserver iframes and privacy', () => {
  test('iframe content inherits a masked ancestor', async () => {
    setup('<div data-openreplay-obscured><iframe id="f"></iframe></div>')
    frameText('<p>card 4111</p>')
    observer.observe()
    await waitFrames()
    expect(ofType(Type.CreateIFrameDocument)).toHaveLength(1)
    expect(allData()).toContain('****')
    expect(allData()).not.toContain('4111')
  })

  test('a hidden iframe and an iframe under a hidden ancestor are not recorded inside', async () => {
    setup('<iframe id="f" data-openreplay-hidden data-openreplay-capture></iframe>')
    frameText('<p>card 4111</p>')
    observer.observe()
    await waitFrames()
    expect(ofType(Type.CreateIFrameDocument)).toHaveLength(0)
    expect(allData()).not.toContain('4111')
    observer.disconnect()

    setup('<div data-openreplay-hidden><iframe id="f"></iframe></div>')
    frameText('<p>card 4111</p>')
    observer.observe()
    await waitFrames()
    expect(ofType(Type.CreateIFrameDocument)).toHaveLength(0)
    expect(allData()).not.toContain('4111')
  })

  test('resanitize masks the content of an iframe whose ancestor got masked', async () => {
    setup('<div id="w"><iframe id="f"></iframe></div>')
    frameText('<p>card 4111</p>')
    observer.observe()
    await waitFrames()
    const doc = (document.getElementById('f') as HTMLIFrameElement).contentDocument!
    const text = doc.querySelector('p')!.firstChild as Text
    const id = app.nodes.getID(text)
    document.getElementById('w')!.setAttribute('data-openreplay-obscured', '')
    observer.resanitizeSubtree(document.getElementById('w')!)
    const last = () => ofType(Type.SetNodeData).filter((m) => m[1] === id).pop()?.[2]
    expect(last()).not.toContain('4111')
    text.data = 'card 5500'
    await waitFrames()
    expect(last()).not.toContain('5500')
  })

  test('resanitize hiding an iframe ancestor stops recording its document', async () => {
    setup('<div id="w"><iframe id="f"></iframe></div>')
    frameText('<p>card 4111</p>')
    observer.observe()
    await waitFrames()
    const doc = (document.getElementById('f') as HTMLIFrameElement).contentDocument!
    const text = doc.querySelector('p')!.firstChild as Text
    document.getElementById('w')!.setAttribute('data-openreplay-hidden', '')
    observer.resanitizeSubtree(document.getElementById('w')!)
    expect(app.nodes.getID(text)).toBeUndefined()
    const before = sent.length
    text.data = 'card 5500'
    doc.body.append('more 6011')
    doc.dispatchEvent(new Event('load'))
    await waitFrames()
    const after = JSON.stringify(sent.slice(before))
    expect(after).not.toContain('5500')
    expect(after).not.toContain('6011')
  })

  test('resanitize hiding an iframe ancestor stops recording shadow roots inside it', async () => {
    setup('<div id="w"><iframe id="f"></iframe></div>')
    const doc = (document.getElementById('f') as HTMLIFrameElement).contentDocument!
    doc.body.innerHTML = '<div id="h"></div>'
    const shadow = doc.getElementById('h')!.attachShadow({ mode: 'open' })
    shadow.innerHTML = '<span>card 4111</span>'
    observer.observe()
    await waitFrames()
    expect(allData()).toContain('4111')
    const text = shadow.querySelector('span')!.firstChild as Text
    document.getElementById('w')!.setAttribute('data-openreplay-hidden', '')
    observer.resanitizeSubtree(document.getElementById('w')!)
    expect(app.nodes.getID(text)).toBeUndefined()
    const before = sent.length
    text.data = 'card 5500'
    shadow.append('more 6011')
    await new Promise((r) => setTimeout(r, 0))
    expect(JSON.stringify(sent.slice(before))).not.toMatch(/5500|6011/)
  })

  test('a plain iframe is still recorded', async () => {
    setup('<iframe id="f"></iframe>')
    frameText('<p>hello</p>')
    observer.observe()
    await waitFrames()
    expect(ofType(Type.CreateIFrameDocument)).toHaveLength(1)
    expect(allData()).toContain('hello')
  })
})

describe('TopObserver page root and text privacy', () => {
  const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms))

  test('a throttled text update of a removed masked node is not sent in plain', async () => {
    setup('<p data-openreplay-obscured>card 4111</p>', {})
    observer.observe()
    const p = document.querySelector('p')!
    ;(p.firstChild as Text).data = 'card 5500'
    await tick()
    p.remove()
    await tick(60)
    expect(allData()).not.toMatch(/4111|5500/)
  })

  test('a hidden <html> records nothing under it, at start and through resanitize', async () => {
    const html = document.documentElement
    setup('<p>card 4111</p>')
    html.setAttribute('data-openreplay-hidden', '')
    observer.observe()
    expect(allData()).not.toContain('4111')

    html.removeAttribute('data-openreplay-hidden')
    observer.resanitizeSubtree(html)
    expect(allData()).toContain('4111')

    const before = sent.length
    const bodyId = app.nodes.getID(document.body)
    html.setAttribute('data-openreplay-hidden', '')
    observer.resanitizeSubtree(html)
    const removed = ofType(Type.RemoveNode).map((m) => m[1])
    expect(removed).not.toContain(0)
    expect(removed).toContain(bodyId)
    ;(document.querySelector('p')!.firstChild as Text).data = 'card 5500'
    await tick()
    expect(JSON.stringify(sent.slice(before))).not.toContain('5500')
    html.removeAttribute('data-openreplay-hidden')
  })
})
