import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals'
import TopObserver from '../main/app/observer/top_observer.js'
import Nodes from '../main/app/nodes/index.js'
import Sanitizer from '../main/app/sanitizer.js'
import { Type } from '../common/messages.gen.js'
import type Message from '../common/messages.gen.js'

const T = {
  CreateDocument: Type.CreateDocument,
  CreateElementNode: Type.CreateElementNode,
  SetNodeAttribute: Type.SetNodeAttribute,
  MoveNode: Type.MoveNode,
  RemoveNode: Type.RemoveNode,
}

const firstIndexOf = (msgs: Message[], type: number) => msgs.findIndex((m) => m[0] === type)

let nodes: Nodes
let sent: Message[]
let observer: TopObserver

/** Minimal App surface the observer touches. */
function makeApp() {
  const app: any = {
    options: { forceNgOff: true },
    safe: (f: any) => f,
    send: (msg: Message) => sent.push(msg),
    getBaseHref: () => 'http://localhost/',
    debug: { log: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() },
  }
  app.nodes = nodes = new Nodes({
    node_id: '__openreplay_id',
    forceNgOff: true,
    maintainer: { enabled: false },
  })
  app.sanitizer = new Sanitizer({
    app,
    options: { obscureTextEmails: false, obscureTextNumbers: false, domSanitizer: undefined },
  })
  app.attributeSender = {
    sendSetAttribute: (id: number, name: string, value: string) =>
      app.send([T.SetNodeAttribute, id, name, value]),
  }
  return app
}

/** MutationObserver records are delivered on the microtask queue. */
const flush = () => Promise.resolve().then(() => undefined)

function creates(from = 0) {
  return sent.slice(from).filter((m) => m[0] === T.CreateElementNode) as any[]
}

beforeEach(() => {
  sent = []
  document.documentElement.innerHTML = '<head></head><body><div id="a"></div></body>'
  observer = new TopObserver({ app: makeApp(), options: {} })
})

afterEach(() => {
  observer.disconnect()
})

describe('TopObserver root binding', () => {
  test('binds documentElement as node 0 and announces the document', () => {
    observer.observe()

    const docIdx = firstIndexOf(sent, T.CreateDocument)
    expect(docIdx).toBeGreaterThanOrEqual(0)
    expect(docIdx).toBeLessThan(firstIndexOf(sent, T.CreateElementNode))
    expect(nodes.getID(document.documentElement)).toBe(0)
    // HEAD/BODY hang off the 0-node created player-side by CreateDocument
    const tags = creates().map((m) => [m[4], m[2]])
    expect(tags).toEqual(expect.arrayContaining([['HEAD', 0], ['BODY', 0]]))
  })

  test('re-announces the document when documentElement is replaced', async () => {
    observer.observe()
    const before = sent.length
    expect(nodes.getID(document.documentElement)).toBe(0)

    // document.write() / documentElement.replaceWith() / outerHTML= all land here:
    // a brand new <html>, which _commitNode can never emit a create for.
    const fresh = document.createElement('html')
    fresh.innerHTML = '<head></head><body><section id="b"></section></body>'
    document.replaceChild(fresh, document.documentElement)
    await flush()

    const after = sent.slice(before)
    expect(after.filter((m) => m[0] === T.CreateDocument)).toHaveLength(1)
    expect(firstIndexOf(after, T.CreateDocument)).toBeLessThan(
      firstIndexOf(after, T.CreateElementNode),
    )
    expect(nodes.getID(document.documentElement)).toBe(0)
    // ids restarted with the new document: nothing may reference the old tree
    expect(after.filter((m) => m[0] === T.MoveNode || m[0] === T.RemoveNode)).toEqual([])
    // html, head, body, section
    expect(nodes.getNodeCount()).toBe(4)

    // the whole new tree is reachable: every create points at an already-created parent
    const known = new Set<number>([0])
    for (const m of creates(before)) {
      expect(known.has(m[2])).toBe(true)
      known.add(m[1])
    }
    const tags = creates(before).map((m) => m[4])
    expect(tags).toEqual(expect.arrayContaining(['HEAD', 'BODY', 'SECTION']))
  })

  test('ordinary subtree mutations do not re-announce the document', async () => {
    observer.observe()
    const before = sent.length

    document.body.appendChild(document.createElement('span'))
    await flush()

    expect(sent.slice(before).filter((m) => m[0] === T.CreateDocument)).toHaveLength(0)
    expect(creates(before).map((m) => m[4])).toContain('SPAN')
  })
})
