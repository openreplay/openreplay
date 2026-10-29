// @ts-nocheck
import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals'
import NextObserver from '../main/app/observer/next_observer.js'
import NextNodes from '../main/app/nodes/next_nodes.js'
import Sanitizer, { SanitizeLevel } from '../main/app/sanitizer.js'
import { pack } from '../main/app/nodes/idSeq.js'
import { Type } from '../common/messages.gen.js'

/** Applies messages with the player's tree semantics (splice at index, RemoveNode drops the top). */
class Mirror {
  nodes = new Map<number, any>()
  errors: string[] = []
  apply(m: any[]) {
    const get = (id: number) => this.nodes.get(id)
    const detach = (n: any) => {
      if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1)
      n.parent = null
    }
    const insert = (pid: number, n: any, ix: number) => {
      const p = get(pid)
      if (!p) return this.errors.push(`no parent ${pid}`)
      detach(n)
      if (ix > p.children.length) this.errors.push(`index ${ix} > ${p.children.length}`)
      p.children.splice(ix, 0, n)
      n.parent = p
    }
    const node = (id: number, tag: string) => ({ id, tag, attrs: {}, children: [], parent: null, text: '', root: null })
    switch (m[0]) {
      case Type.CreateDocument:
        this.nodes.clear()
        this.nodes.set(0, node(0, 'HTML'))
        return
      case Type.CreateElementNode: {
        const n = node(m[1], m[4])
        this.nodes.set(m[1], n)
        return insert(m[2], n, m[3])
      }
      case Type.CreateTextNode: {
        const n = node(m[1], '#text')
        this.nodes.set(m[1], n)
        return insert(m[2], n, m[3])
      }
      case Type.MoveNode: {
        const n = get(m[1])
        if (!n) return this.errors.push(`move: no ${m[1]}`)
        return insert(m[2], n, m[3])
      }
      case Type.RemoveNode: {
        const n = get(m[1])
        if (!n) return this.errors.push(`remove: no ${m[1]}`)
        detach(n)
        this.nodes.delete(m[1])
        return
      }
      case Type.SetNodeAttribute:
      case Type.SetNodeAttributeURLBased: {
        const n = get(m[1])
        if (n) n.attrs[m[2]] = m[3]
        return
      }
      case Type.SetNodeData:
      case Type.SetCSSDataURLBased: {
        const n = get(m[1])
        if (n) n.text = m[2]
        return
      }
      case Type.CreateIFrameDocument: {
        const host = get(m[1])
        if (!host) return this.errors.push(`iframe doc: no host ${m[1]}`)
        const r = node(m[2], '#root')
        this.nodes.set(m[2], r)
        host.root = r
        return
      }
    }
  }
  html(): string {
    const ser = (n: any): string =>
      n.tag === '#text'
        ? n.text
        : `<${n.tag.toLowerCase()}>${n.root ? `{${n.root.children.map(ser).join('')}}` : ''}${n.children
            .map(ser)
            .join('')}</${n.tag.toLowerCase()}>`
    return ser(this.nodes.get(0))
  }
}

/** Same serialization from the live DOM, without attributes. */
function liveHtml(root: Element = document.documentElement): string {
  const ser = (n: Node): string => {
    if (n.nodeType === 3) return (n as Text).data
    if (n.nodeType !== 1) return ''
    const el = n as Element
    if (['script', 'meta', 'title', 'noscript', 'base'].includes(el.localName)) return ''
    const sr = el.shadowRoot ? `{${[...el.shadowRoot.childNodes].map(ser).join('')}}` : ''
    return `<${el.localName}>${sr}${[...el.childNodes].map(ser).join('')}</${el.localName}>`
  }
  return ser(root)
}

let sent: any[]
let app: any
let observer: NextObserver
let nodes: NextNodes
const flush = () => new Promise((r) => setTimeout(r, 0))
const ofType = (t: number) => sent.filter((m) => m[0] === t)
const $ = (s: string) => document.querySelector(s) as HTMLElement

function setup(body: string, options: any = {}, sanitizerOptions: any = {}) {
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
  app.nodes = nodes = new NextNodes({
    forceNgOff: true,
    onUnregister: (id: number) => app.sanitizer.setLevel(id, SanitizeLevel.Plain),
  })
  app.attributeSender = {
    sendSetAttribute: (id: number, name: string, value: string) =>
      app.send([Type.SetNodeAttribute, id, name, value]),
  }
  observer = new NextObserver({ app, options: { disableThrottling: true, ...options } })
}

function mirror() {
  const m = new Mirror()
  sent.forEach((x) => m.apply(x))
  return m
}

function expectInSync() {
  const m = mirror()
  expect(m.errors).toEqual([])
  expect(m.html()).toBe(liveHtml())
}

afterEach(() => {
  observer?.disconnect()
  nodes?.clear()
})

describe('NextObserver snapshot', () => {
  test('sends the document, then the dom-parsed signal', () => {
    setup('<p>a<b>b</b></p>')
    observer.observe()
    expect(sent[0][0]).toBe(Type.CreateDocument)
    expect(nodes.getID(document.documentElement)).toBe(0)
    const loaded = sent.findIndex((m) => m[0] === Type.SetNodeAttribute && m[2] === 'orloaded')
    expect(loaded).toBeGreaterThan(0)
    expectInSync()
  })

  test('skips ignored tags when counting sibling indexes', () => {
    setup('<div id="p"><!--c--><script></script><i></i><meta><b></b></div>')
    observer.observe()
    const b = ofType(Type.CreateElementNode).find((m) => m[4] === 'B')
    expect(b[3]).toBe(1)
    expectInSync()
  })
})

describe('NextObserver mutations', () => {
  beforeEach(() => {
    setup('<ul id="l"><li>1</li><li>2</li><li>3</li></ul><div id="q"></div>')
    observer.observe()
  })

  test('append, prepend and middle insert', async () => {
    const l = $('#l')
    l.append(Object.assign(document.createElement('li'), { textContent: 'end' }))
    l.prepend(Object.assign(document.createElement('li'), { textContent: 'start' }))
    l.insertBefore(Object.assign(document.createElement('li'), { textContent: 'mid' }), l.children[2])
    await flush()
    expectInSync()
  })

  test('several moves under one parent in one batch', async () => {
    const l = $('#l')
    const kids = [...l.children]
    for (let i = kids.length - 1; i >= 0; i--) l.append(kids[i])
    await flush()
    expectInSync()
  })

  test('insert into a parent while an earlier sibling moves elsewhere', async () => {
    const l = $('#l')
    l.append(document.createElement('li'))
    $('#q').append(l.children[0])
    await flush()
    expectInSync()
  })

  test('a child pulled out of a removed subtree is recreated with a new id', async () => {
    const l = $('#l')
    const li = l.children[1]
    const oldId = nodes.getID(li)
    l.remove()
    await flush()
    expect(nodes.getID(li)).toBeUndefined()
    $('#q').append(li)
    await flush()
    const newId = nodes.getID(li)
    expect(newId).toBeDefined()
    expect(newId).not.toBe(oldId)
    expect(ofType(Type.MoveNode).some((m) => m[1] === oldId)).toBe(false)
    expectInSync()
  })

  test('moving existing nodes into a new container', async () => {
    const w = document.createElement('section')
    const l = $('#l')
    w.append(l.children[0], l.children[1])
    l.append(w)
    await flush()
    expectInSync()
  })

  test('appending to a parent with many children does not recurse', async () => {
    const l = $('#l')
    for (let i = 0; i < 20000; i++) l.append(document.createElement('li'))
    await flush()
    l.append(Object.assign(document.createElement('li'), { textContent: 'last' }))
    await flush()
    expectInSync()
  })
})

describe('NextObserver privacy', () => {
  const allData = () => ofType(Type.SetNodeData).map((m) => m[2]).join('|')

  test('iframe content inherits a masked ancestor', () => {
    setup('<div data-openreplay-obscured><iframe id="f"></iframe></div>')
    ;($('#f') as HTMLIFrameElement).contentDocument!.body.innerHTML = '<p>card 4111</p>'
    observer.observe()
    expect(ofType(Type.CreateIFrameDocument)).toHaveLength(1)
    expect(allData()).toContain('****')
    expect(allData()).not.toContain('4111')
  })

  test('iframe content inherits its own mask', () => {
    setup('<iframe id="f" data-openreplay-obscured data-openreplay-capture></iframe>')
    ;($('#f') as HTMLIFrameElement).contentDocument!.body.innerHTML = '<p>card 4111</p>'
    observer.observe()
    expect(allData()).not.toContain('4111')
  })

  test('moving a node into a hidden container removes it player-side', async () => {
    setup('<div id="h" data-openreplay-hidden></div><p id="m">visible</p>')
    observer.observe()
    const id = nodes.getID($('#m'))
    $('#h').append($('#m'))
    await flush()
    expect(ofType(Type.RemoveNode)).toContainEqual([Type.RemoveNode, id])
  })

  test('moving a node into an obscured container re-sends its text masked', async () => {
    setup('<div id="o" data-openreplay-obscured></div><p id="m">plain text</p>')
    observer.observe()
    $('#o').append($('#m'))
    await flush()
    const texts = mirror().html()
    expect(texts).not.toContain('plain text')
    expect(app.sanitizer.isObscured(nodes.getID($('#m').firstChild))).toBe(true)
  })

  test('shadow content inherits the host level; hidden hosts get no shadow root', () => {
    document.documentElement.innerHTML = '<head></head><body></body>'
    setup('')
    const a = document.createElement('x-a')
    a.setAttribute('data-openreplay-obscured', '')
    a.attachShadow({ mode: 'open' }).innerHTML = '<p>card 4111</p>'
    const b = document.createElement('x-b')
    b.setAttribute('data-openreplay-hidden', '')
    b.attachShadow({ mode: 'open' }).innerHTML = '<p>secret</p>'
    document.body.append(a, b)
    observer.observe()
    const data = ofType(Type.SetNodeData).map((m) => m[2])
    expect(data.join()).not.toContain('4111')
    expect(data.join()).not.toContain('secret')
    const hostIds = ofType(Type.CreateIFrameDocument).map((m) => m[1])
    expect(hostIds).toEqual([nodes.getID(a)])
  })

  test('resanitize: a domSanitizer turning hidden rebuilds the subtree as a placeholder', () => {
    let hide = false
    setup('<div id="d"><p>text</p></div>', {}, {
      domSanitizer: (el: Element) => (hide && el.id === 'd' ? SanitizeLevel.Hidden : SanitizeLevel.Plain),
    })
    observer.observe()
    const d = $('#d')
    hide = true
    const before = sent.length
    observer.resanitizeSubtree(d)
    const after = sent.slice(before)
    expect(after[0][0]).toBe(Type.RemoveNode)
    expect(after.some((m) => m[0] === Type.CreateTextNode)).toBe(false)
    expect(app.sanitizer.isHidden(nodes.getID(d))).toBe(true)
  })
})

describe('NextObserver page root and text privacy', () => {
  const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms))
  const allData = () =>
    ofType(Type.SetNodeData)
      .map((m) => m[2])
      .join('|')

  test('a throttled text update of a removed masked node is not sent in plain', async () => {
    setup('<p data-openreplay-obscured>card 4111</p>', { disableThrottling: false })
    observer.observe()
    const p = $('p')
    ;(p.firstChild as Text).data = 'card 5500'
    await flush()
    p.remove()
    await flush()
    // the sweep between batches drops the removed node's level
    ;(nodes as any).sinceSweep = Infinity
    nodes.maybeSweep()
    await tick(60)
    expect(allData()).not.toMatch(/4111|5500/)
  })

  test('a hidden <html> records nothing under it: at start, on attribute change and through resanitize', async () => {
    const html = document.documentElement
    setup('<p>card 4111</p>')
    html.setAttribute('data-openreplay-hidden', '')
    observer.observe()
    expect(allData()).not.toContain('4111')

    html.removeAttribute('data-openreplay-hidden')
    observer.resanitizeSubtree(html)
    expect(allData()).toContain('4111')
    expectInSync()

    const bodyId = nodes.getID(document.body)
    html.setAttribute('data-openreplay-hidden', '')
    await flush()
    const removed = ofType(Type.RemoveNode).map((m) => m[1])
    expect(removed).not.toContain(0)
    expect(removed).toContain(bodyId)
    const before = sent.length
    ;($('p').firstChild as Text).data = 'card 5500'
    $('p').append('more 6011')
    await flush()
    expect(JSON.stringify(sent.slice(before))).not.toMatch(/5500|6011/)

    html.removeAttribute('data-openreplay-hidden')
    observer.resanitizeSubtree(html)
    expect(allData()).toContain('5500')
    expectInSync()
  })

  test('privacy rebuilds keep the element count used for drop reports', async () => {
    const html = document.documentElement
    setup('<div id="a"><p>one</p><p>two</p></div><div id="b"><i></i><i></i></div>')
    observer.observe()
    const total = nodes.approxTotal
    html.setAttribute('data-openreplay-hidden', '')
    await flush()
    html.removeAttribute('data-openreplay-hidden')
    observer.resanitizeSubtree(html)
    $('#a').setAttribute('data-openreplay-hidden', '')
    await flush()
    $('#a').removeAttribute('data-openreplay-hidden')
    observer.resanitizeSubtree($('#a'))
    expect(nodes.approxTotal).toBe(total)

    // moved under a hidden parent: dropped player-side with its children
    $('#a').setAttribute('data-openreplay-hidden', '')
    await flush()
    const hidden = nodes.approxTotal
    $('#a').append($('#b'))
    await flush()
    expect(nodes.approxTotal).toBe(hidden - 3)
  })
})

describe('NextObserver iframes in shadow roots', () => {
  test('an iframe inside a shadow root is attached again when it loads', () => {
    setup('<div id="h"></div>')
    const sr = $('#h').attachShadow({ mode: 'open' })
    sr.innerHTML = '<iframe></iframe>'
    observer.observe()
    const frame = sr.querySelector('iframe')!
    const attach = jest.spyOn(observer as any, 'attachFrame')
    frame.dispatchEvent(new Event('load'))
    expect(attach).toHaveBeenCalledWith(expect.anything(), frame)
  })
})

describe('NextObserver privacy changes after insertion', () => {
  const data = (id: number) => ofType(Type.SetNodeData).filter((m) => m[1] === id).map((m) => m[2])
  const allData = () => ofType(Type.SetNodeData).map((m) => m[2]).join('|')

  test('text added in the same turn as an ancestor mask is never sent plain', async () => {
    setup('<div id="d"><p id="p"></p></div>')
    observer.observe()
    $('#p').append('card 4111')
    $('#d').setAttribute('data-openreplay-obscured', '')
    await flush()
    expect(allData()).not.toContain('4111')
    observer.disconnect()
    nodes.clear()

    setup('<div id="d"><p id="p"></p></div>')
    observer.observe()
    $('#d').setAttribute('data-openreplay-obscured', '')
    $('#p').append('card 4111')
    await flush()
    expect(allData()).not.toContain('4111')
  })

  test('text added in the same turn as an ancestor is hidden is never sent', async () => {
    setup('<div id="d"><p id="p"></p></div>')
    observer.observe()
    $('#p').append('secret 4111')
    $('#d').setAttribute('data-openreplay-hidden', '')
    await flush()
    expect(allData()).not.toContain('4111')
    expect(mirror().errors).toEqual([])
  })

  test('a moved child hidden in the same turn keeps its siblings in order', async () => {
    setup('<div id="p"><a></a><b></b><i id="x">secret</i></div>')
    observer.observe()
    const x = $('#x')
    $('#p').append(document.createElement('s'))
    $('#p').append(x)
    x.setAttribute('data-openreplay-hidden', '')
    await flush()
    const m = mirror()
    expect(m.errors).toEqual([])
    expect(m.html()).toContain('<div><a></a><b></b><s></s><i></i></div>')
  })

  test('masking an iframe ancestor masks the iframe content, by attribute and by resanitize', async () => {
    setup('<div id="w"><iframe id="f"></iframe></div>')
    const doc = ($('#f') as HTMLIFrameElement).contentDocument!
    doc.body.innerHTML = '<p>card 4111</p>'
    observer.observe()
    const text = doc.querySelector('p')!.firstChild as Text
    $('#w').setAttribute('data-openreplay-obscured', '')
    await flush()
    expect(data(nodes.getID(text)).pop()).not.toContain('4111')
    text.data = 'card 5500'
    await flush()
    expect(data(nodes.getID(text)).pop()).not.toContain('5500')
    observer.disconnect()
    nodes.clear()

    let mask = false
    setup('<div id="w"><iframe id="f"></iframe></div>', {}, {
      domSanitizer: (el: Element) => (mask && el.id === 'w' ? SanitizeLevel.Obscured : SanitizeLevel.Plain),
    })
    const doc2 = ($('#f') as HTMLIFrameElement).contentDocument!
    doc2.body.innerHTML = '<p>card 4111</p>'
    observer.observe()
    mask = true
    observer.resanitizeSubtree($('#w'))
    const text2 = doc2.querySelector('p')!.firstChild as Text
    expect(data(nodes.getID(text2)).pop()).not.toContain('4111')
  })

  test('a mask attribute masks the text already sent and the text sent later', async () => {
    setup('<div id="d"><p>card 4111</p><input id="i"></div>')
    observer.observe()
    const text = $('#d p').firstChild as Text
    $('#d').setAttribute('data-openreplay-obscured', '')
    await flush()
    expect(data(nodes.getID(text)).pop()).not.toContain('4111')
    expect(app.callResanitizeCallbacks).toHaveBeenCalledWith($('#i'), nodes.getID($('#i')))
    text.data = 'card 5500'
    await flush()
    expect(data(nodes.getID(text)).pop()).not.toContain('5500')
    expect(app.sanitizer.isObscured(nodes.getID($('#i')))).toBe(true)
  })

  test('a hide attribute turns the element into a placeholder', async () => {
    setup('<div id="d"><p>secret</p></div>')
    observer.observe()
    const oldId = nodes.getID($('#d'))
    $('#d').setAttribute('data-openreplay-hidden', '')
    $('#d p').textContent = 'more secret'
    await flush()
    expect(ofType(Type.RemoveNode)).toContainEqual([Type.RemoveNode, oldId])
    const newId = nodes.getID($('#d'))
    expect(app.sanitizer.isHidden(newId)).toBe(true)
    expect(mirror().html()).not.toContain('secret')
    expect(mirror().errors).toEqual([])
  })

  test('a class matched by domSanitizer masks the element', async () => {
    setup('<p id="p">4111 1111</p>', {}, {
      domSanitizer: (el: Element) => (el.classList.contains('pii') ? SanitizeLevel.Obscured : SanitizeLevel.Plain),
    })
    observer.observe()
    $('#p').classList.add('pii')
    await flush()
    expect(mirror().html()).not.toContain('4111')
  })

  test('without domSanitizer, other attribute changes do not recompute levels', async () => {
    setup('<p id="p">text</p>')
    observer.observe()
    const computeLevel = jest.spyOn(app.sanitizer, 'computeLevel')
    $('#p').className = 'a'
    $('#p').style.color = 'red'
    await flush()
    expect(computeLevel).not.toHaveBeenCalled()
  })
})

describe('NextObserver root removal', () => {
  test('removing <html> sends nothing; putting it back starts a new document', async () => {
    setup('<p>before</p>')
    observer.observe()
    const html = document.documentElement
    html.remove()
    await flush()
    expect(ofType(Type.RemoveNode)).toEqual([])
    html.querySelector('p')!.textContent = 'changed while detached'
    document.appendChild(html)
    await flush()
    expect(ofType(Type.CreateDocument)).toHaveLength(2)
    expectInSync()
  })

  test('the drop share counts recorded elements only, not hidden content', async () => {
    const many = '<i></i>'.repeat(50)
    setup(`<div id="h" data-openreplay-hidden>${many}</div><div id="v">${many}</div><p></p>`)
    observer.observe()
    $('#h').remove()
    await flush()
    expect(ofType(Type.UnbindNodes)).toEqual([])
    $('#v').remove()
    await flush()
    expect(ofType(Type.UnbindNodes)).toHaveLength(1)
  })
})

describe('NextObserver listeners', () => {
  test('listeners of collected shadow roots are not kept', async () => {
    const RealRef = globalThis.WeakRef
    const collected = new WeakSet<object>()
    globalThis.WeakRef = class {
      constructor(private t: object) {}
      deref() {
        return collected.has(this.t) ? undefined : this.t
      }
    } as any
    try {
      setup('')
      observer.observe()
      for (let round = 0; round < 3; round++) {
        const hosts = Array.from({ length: 1000 }, () => document.createElement('x-row'))
        document.body.append(...hosts)
        await flush()
        for (const host of hosts) collected.add(host.attachShadow({ mode: 'open' }))
        expect(ofType(Type.CreateIFrameDocument).length).toBe((round + 1) * 1000)
        hosts.forEach((h) => h.remove())
        await flush()
      }
      expect(observer['listened'].length).toBeLessThan(1100)
    } finally {
      globalThis.WeakRef = RealRef
    }
  })
})

describe('NextObserver callbacks and roots', () => {
  test('node callbacks fire for recorded nodes and shadow roots, not for children of hidden', () => {
    setup('<div data-openreplay-hidden><input id="secret"></div><input id="shown">')
    const host = document.createElement('x-c')
    host.attachShadow({ mode: 'open' }).innerHTML = '<span>s</span>'
    document.body.append(host)
    const seen: Node[] = []
    nodes.attachNodeCallback((n) => seen.push(n))
    observer.observe()
    expect(seen).toContain(document)
    expect(seen).toContain($('#shown'))
    expect(seen).toContain(host.shadowRoot)
    expect(seen).not.toContain($('#secret'))
  })

  test('a shadow root attached to a live host is recorded right away', () => {
    setup('<x-late id="late"></x-late>')
    observer.observe()
    const late = $('#late')
    late.attachShadow({ mode: 'open' })
    expect(ofType(Type.CreateIFrameDocument).map((m) => m[1])).toContain(nodes.getID(late))
  })

  test('replacing <html> starts a new document', async () => {
    setup('<p>before</p>')
    observer.observe()
    const html = document.createElement('html')
    html.innerHTML = '<head></head><body><p>after</p></body>'
    document.replaceChild(html, document.documentElement)
    await flush()
    expect(ofType(Type.CreateDocument)).toHaveLength(2)
    expect(nodes.getID(html)).toBe(0)
  })

  test('crossdomain frames allocate ids from their block and attach to the parent node', () => {
    setup('<p>child frame</p>')
    observer.crossdomainObserve(42, 3, 1)
    const doc = ofType(Type.CreateIFrameDocument)[0]
    expect(doc[1]).toBe(42)
    expect(doc[2]).toBe(pack(1, 3, 0))
    expect(nodes.getID(document.documentElement)).toBe(pack(1, 3, 0) + 1)
  })
})

describe('NextNodes API', () => {
  test('getNode does not scan the page for an indexed node that is gone', async () => {
    setup('<input id="i">')
    observer.observe()
    const id = nodes.getID($('#i'))!
    $('#i').remove()
    await flush()
    const scan = jest.fn(nodes.fallbackLookup!)
    nodes.fallbackLookup = scan
    expect(nodes.getNode(id)).toBeUndefined()
    expect(scan).not.toHaveBeenCalled()
  })

  test('getNode resolves indexed fields directly and anything else by scan', () => {
    setup('<input id="i"><div id="d"></div>')
    observer.observe()
    expect(nodes.getNode(nodes.getID($('#i')))).toBe($('#i'))
    expect(nodes.getNode(nodes.getID($('#d')))).toBe($('#d'))
    expect(nodes.getNode(99999)).toBeUndefined()
  })

  test('scanTree visits canvases', () => {
    setup('<canvas id="c"></canvas><div></div>')
    observer.observe()
    const seen: Node[] = []
    nodes.scanTree((n) => seen.push(n as Node))
    expect(seen).toEqual([$('#c')])
  })

  test('node listeners only fire while the node keeps its id, and go away on clear', async () => {
    setup('<button id="b"></button><div id="q"></div>')
    observer.observe()
    const b = $('#b')
    const listener = jest.fn()
    nodes.attachNodeListener(b, 'click', listener)
    b.click()
    expect(listener).toHaveBeenCalledTimes(1)
    b.remove()
    await flush()
    $('#q').append(b)
    await flush()
    b.click()
    // re-added under a new id: the old listener must stay quiet
    expect(listener).toHaveBeenCalledTimes(1)
    const again = jest.fn()
    nodes.attachNodeListener(b, 'click', again)
    nodes.clear()
    b.click()
    expect(again).not.toHaveBeenCalled()
  })
})

describe('NextNodes listener cleanup', () => {
  test("a re-registered node's old listeners are removed, not just muted", async () => {
    setup('<button id="b"></button><div id="q"></div>')
    observer.observe()
    const b = $('#b')
    const remove = jest.spyOn(b, 'removeEventListener')
    nodes.attachNodeListener(b, 'click', jest.fn())
    b.remove()
    await flush()
    $('#q').append(b)
    await flush()
    const fresh = jest.fn()
    nodes.attachNodeListener(b, 'click', fresh)
    expect(remove).toHaveBeenCalledTimes(1)
    b.click()
    expect(fresh).toHaveBeenCalledTimes(1)
  })
})

describe('NextObserver parity details', () => {
  test('a forwarded slot keeps light nodes on the outer slot', async () => {
    setup('')
    class FwdInner extends HTMLElement {
      constructor() {
        super()
        this.attachShadow({ mode: 'open' }).innerHTML = '<div><slot name="body"></slot></div>'
      }
    }
    customElements.define('x-fwd-inner', FwdInner)
    const outer = document.createElement('x-fwd-outer')
    document.body.append(outer)
    observer.observe()
    const light = document.createElement('span')
    light.textContent = 'light'
    outer.append(light)
    const sr = outer.attachShadow({ mode: 'open' })
    sr.innerHTML = '<x-fwd-inner><slot slot="body"></slot></x-fwd-inner>'
    await flush()
    await flush()
    const last = ofType(Type.SetNodeSlot)
      .filter((m) => m[1] === nodes.getID(light))
      .pop()
    expect(last?.[2]).toBe(nodes.getID(sr.querySelector('slot')!))
  })

  test('light children get their slot once the shadow root is recorded', () => {
    setup('')
    const host = document.createElement('x-slotted')
    host.attachShadow({ mode: 'open' }).innerHTML = '<div><slot></slot></div>'
    const light = document.createElement('span')
    host.append(light)
    document.body.append(host)
    observer.observe()
    const slot = host.shadowRoot!.querySelector('slot')!
    expect(ofType(Type.SetNodeSlot)).toContainEqual([Type.SetNodeSlot, nodes.getID(light), nodes.getID(slot)])
  })

  test('content of a shadow root attached later is reported as a snapshot (isStart)', () => {
    setup('<x-late id="late"></x-late>')
    const starts: Array<[Node, boolean]> = []
    nodes.attachNodeCallback((n, isStart) => starts.push([n, isStart]))
    observer.observe()
    const late = $('#late')
    const sr = late.attachShadow({ mode: 'open' })
    expect(starts.find(([n]) => n === sr)?.[1]).toBe(true)
  })
})
