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
    callResanitizeCallbacks: jest.fn(),
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
const allData = () =>
  sent
    .filter((m) => m[0] === Type.SetNodeData)
    .map((m) => m[2])
    .join('|')
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

  test('shadow content inherits a masked host; a hidden host gets no shadow root', async () => {
    const masked = document.createElement('div')
    masked.setAttribute('data-openreplay-obscured', '')
    const hidden = document.createElement('div')
    hidden.setAttribute('data-openreplay-hidden', '')
    document.body.append(masked, hidden)
    await flush()
    masked.attachShadow({ mode: 'open' }).innerHTML = '<span>card 4111</span>'
    const hiddenShadow = hidden.attachShadow({ mode: 'open' })
    hiddenShadow.innerHTML = '<span>secret</span>'
    await flush()
    hiddenShadow.append('more 6011')
    await flush()

    expect(allData()).toContain('****')
    expect(allData()).not.toContain('4111')
    expect(allData()).not.toContain('secret')
    expect(allData()).not.toContain('6011')
    expect(shadowObservers().has(hiddenShadow)).toBe(false)
  })

  test('resanitize re-levels shadow content: masked, hidden, then recorded again', async () => {
    const [host, shadow] = await addHost()
    await flush()
    const text = shadow.querySelector('span')!.firstChild as Text

    host.setAttribute('data-openreplay-obscured', '')
    observer.resanitizeSubtree(host)
    expect(sent[sent.length - 1]).toEqual([Type.SetNodeData, nodes.getID(text), '**'])

    host.removeAttribute('data-openreplay-obscured')
    host.setAttribute('data-openreplay-hidden', '')
    observer.resanitizeSubtree(host)
    expect(nodes.getID(text)).toBeUndefined()
    expect(shadowObservers().has(shadow)).toBe(false)
    let before = sent.length
    text.data = 'card 5500'
    shadow.append('more 6011')
    await flush()
    expect(JSON.stringify(sent.slice(before))).not.toMatch(/5500|6011/)

    host.removeAttribute('data-openreplay-hidden')
    before = sent.length
    observer.resanitizeSubtree(host)
    await flush()
    const after = sent.slice(before)
    expect(after).toContainEqual([Type.CreateIFrameDocument, nodes.getID(host), nodes.getID(shadow)])
    expect(JSON.stringify(after)).toContain('card 5500')
  })
})
