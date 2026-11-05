import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals'
import TopObserver from '../main/app/observer/top_observer.js'
import Nodes from '../main/app/nodes/index.js'
import Sanitizer from '../main/app/sanitizer.js'
import { Type } from '../common/messages.gen.js'

let nodes: Nodes
let sent: any[]
let observer: TopObserver
const nativeAttachShadow = Element.prototype.attachShadow

function makeApp() {
  const a: any = {
    options: { forceNgOff: true },
    safe: (f: any) => f,
    send: (msg: any) => sent.push(msg),
    getBaseHref: () => 'http://localhost/',
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
const shadowObservers = () => (observer as any).shadowRootObservers as Map<ShadowRoot, any>

async function addHost(): Promise<[HTMLElement, ShadowRoot]> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  await flush()
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = '<span>in</span>'
  return [host, shadow]
}

beforeEach(() => {
  sent = []
  document.documentElement.innerHTML = '<head></head><body></body>'
  observer = new TopObserver({ app: makeApp(), options: { disableThrottling: true } })
  observer.observe()
})

afterEach(() => {
  observer.disconnect()
  jest.restoreAllMocks()
})

describe('TopObserver shadow root observers', () => {
  test('attachShadow is patched and announces the shadow root for the host', async () => {
    expect(Element.prototype.attachShadow).not.toBe(nativeAttachShadow)
    const [host, shadow] = await addHost()

    expect(shadowObservers().has(shadow)).toBe(true)
    const hostId = nodes.getID(host)
    const rootId = nodes.getID(shadow)
    expect(rootId).toBeDefined()
    expect(sent).toContainEqual([Type.CreateIFrameDocument, hostId, rootId])

    // content added later is picked up by the shadow observer
    await flush()
    const span = shadow.querySelector('span')!
    expect(sent.some((m) => m[0] === Type.CreateElementNode && m[1] === nodes.getID(span))).toBe(true)
  })

  test('re-handling the same root disconnects the previous observer', async () => {
    const [, shadow] = await addHost()
    const first = shadowObservers().get(shadow)
    const spy = jest.spyOn(first, 'disconnect')

    ;(observer as any).handleShadowRoot(shadow)

    expect(spy).toHaveBeenCalledTimes(1)
    expect(shadowObservers().get(shadow)).not.toBe(first)
    expect(shadowObservers().size).toBe(1)
  })

  test('observers of disconnected hosts are pruned on the next shadow root', async () => {
    const [staleHost, staleShadow] = await addHost()
    const stale = shadowObservers().get(staleShadow)
    const spy = jest.spyOn(stale, 'disconnect')
    staleHost.remove()
    await flush()

    const [, shadow] = await addHost()

    expect(spy).toHaveBeenCalledTimes(1)
    expect(shadowObservers().has(staleShadow)).toBe(false)
    expect(shadowObservers().has(shadow)).toBe(true)
  })

  test('slotchange keeps the light DOM bound and reports the slot', async () => {
    const host = document.createElement('div')
    host.innerHTML = '<span slot="a">light</span>'
    document.body.appendChild(host)
    await flush()
    const shadow = host.attachShadow({ mode: 'open' })
    await flush()
    // slot rendered after the light DOM was committed (lazy web components)
    shadow.innerHTML = '<slot name="a"></slot>'
    await flush()
    await flush()
    // the next commit of the shadow observer used to walk the light DOM up to <html> and unbind it
    shadow.appendChild(document.createElement('i'))
    await flush()

    const light = host.querySelector('span')!
    const slotId = nodes.getID(shadow.querySelector('slot')!)
    expect(slotId).toBeDefined()
    expect(nodes.getID(document.documentElement)).toBe(0)
    expect(nodes.getID(host)).toBeDefined()
    expect(sent).toContainEqual([Type.SetNodeSlot, nodes.getID(light), slotId])

    const later = document.createElement('p')
    document.body.appendChild(later)
    await flush()
    expect(sent.some((m) => m[0] === Type.CreateElementNode && m[1] === nodes.getID(later))).toBe(true)
  })

  test('a re-inserted host gets its shadow content sent again under new ids', async () => {
    const [host, shadow] = await addHost()
    await flush()
    const oldRootId = nodes.getID(shadow)
    const span = shadow.querySelector('span')!
    const oldSpanId = nodes.getID(span)

    host.remove()
    await flush()
    // a cached view / moved overlay: the same element comes back later
    document.body.appendChild(host)
    await flush()

    const hostId = nodes.getID(host)
    const rootId = nodes.getID(shadow)
    expect(rootId).toBeDefined()
    expect(rootId).not.toBe(oldRootId)
    expect(nodes.getID(span)).not.toBe(oldSpanId)
    expect(sent).toContainEqual([Type.CreateIFrameDocument, hostId, rootId])
    expect(sent).toContainEqual([Type.CreateElementNode, nodes.getID(span), rootId, 0, 'SPAN', false])
  })

  test('disconnect() disconnects every shadow observer and restores attachShadow', async () => {
    const [, s1] = await addHost()
    const [, s2] = await addHost()
    const spies = [s1, s2].map((s) => jest.spyOn(shadowObservers().get(s), 'disconnect'))
    const moDisconnect = jest.spyOn(MutationObserver.prototype, 'disconnect')

    observer.disconnect()

    spies.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1))
    // two shadow observers + the top observer itself
    expect(moDisconnect).toHaveBeenCalledTimes(3)
    expect(shadowObservers().size).toBe(0)
    expect(Element.prototype.attachShadow).toBe(nativeAttachShadow)
  })
})
