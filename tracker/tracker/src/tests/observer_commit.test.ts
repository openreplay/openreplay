import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals'
import TopObserver from '../main/app/observer/top_observer.js'
import Nodes from '../main/app/nodes/index.js'
import Sanitizer from '../main/app/sanitizer.js'
import { Type } from '../common/messages.gen.js'

let nodes: Nodes
let sent: any[]
let observer: TopObserver
let app: any

function makeApp() {
  const a: any = {
    options: { forceNgOff: true },
    safe: (f: any) => f,
    send: (msg: any) => sent.push(msg),
    getBaseHref: () => 'http://localhost/',
    callResanitizeCallbacks: jest.fn(),
    debug: { log: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() },
  }
  a.nodes = nodes = new Nodes({
    node_id: '__openreplay_id',
    forceNgOff: true,
    maintainer: { enabled: false },
  })
  a.sanitizer = new Sanitizer({ app: a, options: { obscureTextEmails: false } })
  a.attributeSender = {
    sendSetAttribute: (id: number, name: string, value: string) =>
      a.send([Type.SetNodeAttribute, id, name, value]),
  }
  return a
}

const flush = () => Promise.resolve().then(() => undefined)
const ofType = (type: number, from = 0) => sent.slice(from).filter((m) => m[0] === type)
const createdTags = (from = 0) => ofType(Type.CreateElementNode, from).map((m) => m[4])
const $ = (sel: string) => document.querySelector(sel) as HTMLElement

function setup(body: string) {
  document.documentElement.innerHTML = `<head></head><body>${body}</body>`
  app = makeApp()
  observer = new TopObserver({ app, options: { disableThrottling: true } })
}

beforeEach(() => {
  sent = []
})

afterEach(() => {
  observer.disconnect()
})

describe('_commitNode', () => {
  test('hidden element is emitted as a sized shallow placeholder without children', () => {
    setup('<div id="h" data-openreplay-hidden><b>secret</b></div>')
    const h = $('#h')
    Object.defineProperty(h, 'clientWidth', { value: 120 })
    Object.defineProperty(h, 'clientHeight', { value: 40 })
    observer.observe()

    const id = nodes.getID(h)!
    expect(ofType(Type.CreateElementNode).find((m) => m[1] === id)?.[4]).toBe('DIV')
    const style = ofType(Type.SetNodeAttributeURLBased).find((m) => m[1] === id && m[2] === 'style')
    expect(style?.[3]).toBe('width: 120px; height: 40px;')
    expect(createdTags()).not.toContain('B')
    expect(ofType(Type.CreateTextNode)).toEqual([])
    expect(sent.some((m) => m[0] === Type.SetNodeData && m[2] === 'secret')).toBe(false)
    // the live element itself is untouched
    expect(h.getAttribute('style')).toBe(null)
  })

  test('sibling index skips ignored and comment nodes', () => {
    setup('<div id="p"><!--c--><script></script><i></i><meta><b></b></div>')
    observer.observe()

    const parentId = nodes.getID($('#p'))
    const create = (sel: string) =>
      ofType(Type.CreateElementNode).find((m) => m[1] === nodes.getID($(sel)))
    expect(nodes.getID($('#p script'))).toBeUndefined()
    expect(create('#p i')).toEqual([Type.CreateElementNode, expect.any(Number), parentId, 0, 'I', false])
    expect(create('#p b')).toEqual([Type.CreateElementNode, expect.any(Number), parentId, 1, 'B', false])
  })

  test('reordering an existing node emits MoveNode with the new index', async () => {
    setup('<ul id="l"><li id="a"></li><li id="b"></li></ul>')
    observer.observe()
    const before = sent.length
    const a = $('#a')
    const aId = nodes.getID(a)

    $('#l').appendChild(a)
    await flush()

    expect(ofType(Type.MoveNode, before)).toEqual([[Type.MoveNode, aId, nodes.getID($('#l')), 1]])
    expect(ofType(Type.RemoveNode, before)).toEqual([])
    expect(ofType(Type.CreateElementNode, before)).toEqual([])
    expect(nodes.getID(a)).toBe(aId)
  })

  test('removed node emits RemoveNode once for the subtree root and is unregistered', async () => {
    setup('<div id="r"><span id="s">t</span></div>')
    observer.observe()
    const before = sent.length
    const r = $('#r')
    const rId = nodes.getID(r)
    const span = $('#s')

    r.remove()
    await flush()

    expect(ofType(Type.RemoveNode, before)).toEqual([[Type.RemoveNode, rId]])
    expect(nodes.getID(r)).toBeUndefined()
    expect(nodes.getID(span)).toBeUndefined()
  })
})

describe('resanitizeSubtree', () => {
  test('becoming hidden removes the node and re-creates it as a placeholder with a new id', () => {
    setup('<div id="x"><span>text</span></div>')
    observer.observe()
    const x = $('#x')
    const oldId = nodes.getID(x)!
    const spanOldId = nodes.getID(x.firstChild!)!
    const before = sent.length

    x.setAttribute('data-openreplay-hidden', '')
    observer.resanitizeSubtree(x)

    const newId = nodes.getID(x)!
    expect(newId).not.toBe(oldId)
    const after = sent.slice(before)
    expect(after[0]).toEqual([Type.RemoveNode, oldId])
    expect(ofType(Type.CreateElementNode, before)).toEqual([
      [Type.CreateElementNode, newId, nodes.getID(document.body), 0, 'DIV', false],
    ])
    expect(ofType(Type.CreateTextNode, before)).toEqual([])
    expect(app.sanitizer.isHidden(newId)).toBe(true)
    expect(app.sanitizer.getLevel(oldId)).toBe(0)
    expect(nodes.getNode(spanOldId)).toBeUndefined()
  })

  test('leaving hidden re-creates the full subtree under new ids', () => {
    setup('<div id="x" data-openreplay-hidden><span>text</span></div>')
    observer.observe()
    const x = $('#x')
    const oldId = nodes.getID(x)!
    expect(createdTags()).not.toContain('SPAN')
    const before = sent.length

    x.removeAttribute('data-openreplay-hidden')
    observer.resanitizeSubtree(x)

    const newId = nodes.getID(x)!
    expect(newId).not.toBe(oldId)
    expect(sent[before]).toEqual([Type.RemoveNode, oldId])
    expect(createdTags(before)).toEqual(['DIV', 'SPAN'])
    const spanId = nodes.getID(x.firstChild!)!
    const textId = nodes.getID(x.firstChild!.firstChild!)!
    expect(ofType(Type.CreateTextNode, before)).toEqual([[Type.CreateTextNode, textId, spanId, 0]])
    expect(ofType(Type.SetNodeData, before)).toEqual([[Type.SetNodeData, textId, 'text']])
    expect(app.sanitizer.isHidden(newId)).toBe(false)
  })

  test('Plain <-> Obscured re-emits text in place via SetNodeData', () => {
    setup('<p id="p">hello <b>world</b></p>')
    observer.observe()
    const p = $('#p')
    const pId = nodes.getID(p)!
    const textId = nodes.getID(p.firstChild!)!
    const innerTextId = nodes.getID(p.querySelector('b')!.firstChild!)!
    let before = sent.length

    p.setAttribute('data-openreplay-obscured', '')
    observer.resanitizeSubtree(p)

    expect(nodes.getID(p)).toBe(pId)
    expect(ofType(Type.RemoveNode, before)).toEqual([])
    expect(ofType(Type.CreateElementNode, before)).toEqual([])
    expect(ofType(Type.SetNodeData, before)).toEqual([
      [Type.SetNodeData, textId, '*****'],
      [Type.SetNodeData, innerTextId, '*****'],
    ])
    expect(app.callResanitizeCallbacks).toHaveBeenCalledWith(p, pId)

    before = sent.length
    p.removeAttribute('data-openreplay-obscured')
    observer.resanitizeSubtree(p)

    expect(ofType(Type.SetNodeData, before)).toEqual([
      [Type.SetNodeData, textId, 'hello '],
      [Type.SetNodeData, innerTextId, 'world'],
    ])
    expect(app.sanitizer.isObscured(textId)).toBe(false)
  })

  test('unchanged levels emit nothing', () => {
    setup('<p id="p">hello</p>')
    observer.observe()
    const before = sent.length
    observer.resanitizeSubtree(document.documentElement)
    expect(sent.length).toBe(before)
  })
})
