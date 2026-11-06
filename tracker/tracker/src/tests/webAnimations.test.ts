import { describe, expect, test, jest, afterEach } from '@jest/globals'
import webAnimations from '../main/modules/webAnimations.js'
import { Type } from '../main/app/messages.gen.js'

// jsdom has no Web Animations API
function fakeAnimation(target: Element, playState: string, fill = 'both') {
  return Object.assign(new EventTarget(), {
    playState,
    effect: {
      target,
      getKeyframes: () => [{ opacity: '1', offset: 1, easing: 'linear' }],
      getComputedTiming: () => ({ fill }),
    },
  })
}

function fakeApp(ids: Map<Node, number>) {
  const start: Array<() => void> = []
  const stop: Array<() => void> = []
  const nodeCbs: Array<(n: Node) => void> = []
  return {
    nodes: {
      getID: (n: Node) => ids.get(n),
      attachNodeCallback: (cb) => nodeCbs.push(cb),
    },
    attachStartCallback: (cb) => start.push(cb),
    attachStopCallback: (cb) => stop.push(cb),
    send: jest.fn(),
    start: () => start.forEach((cb) => cb()),
    stop: () => stop.forEach((cb) => cb()),
    node: (n: Node) => nodeCbs.forEach((cb) => cb(n)),
  }
}

const results = (app) =>
  app.send.mock.calls.filter((c) => c[0][0] === Type.NodeAnimationResult).map((c) => c[0][1])

describe('webAnimations', () => {
  const nativeAnimate = Element.prototype.animate
  afterEach(() => {
    Element.prototype.animate = nativeAnimate
    document.body.innerHTML = ''
  })

  test('animate stays patched across a restart (Assist restarts tracking when an agent joins)', () => {
    const created: any[] = []
    Element.prototype.animate = function () {
      const a = fakeAnimation(this, 'running')
      created.push(a)
      return a as any
    }
    const el = document.createElement('div')
    document.body.append(el)
    const app = fakeApp(new Map([[el, 5]]))
    webAnimations(app as any)

    app.start()
    app.stop()
    app.start()
    el.animate([{ opacity: 1 }], 100)
    created[0].dispatchEvent(new Event('finish'))
    expect(results(app)).toEqual([5])

    app.stop()
    el.animate([{ opacity: 1 }], 100)
    created[1].dispatchEvent(new Event('finish'))
    expect(results(app)).toEqual([5])
  })

  test('a finished filling animation inside a shadow root is sent once its target has an id', async () => {
    Element.prototype.animate = (() => {}) as any
    const host = document.createElement('x-modal')
    document.body.append(host)
    const root = host.attachShadow({ mode: 'open' })
    const wrapper = document.createElement('div')
    root.append(wrapper)
    ;(root as any).getAnimations = () => [fakeAnimation(wrapper, 'finished')]
    const ids = new Map<Node, number>()
    const app = fakeApp(ids)
    webAnimations(app as any)
    app.start()

    app.node(root) // root observed before its children get ids
    ids.set(wrapper, 9)
    app.node(wrapper)
    await Promise.resolve()
    expect(results(app)).toEqual([9])
  })

  test('a finished animation without fill is not sent', async () => {
    Element.prototype.animate = (() => {}) as any
    const host = document.createElement('x-modal')
    document.body.append(host)
    const root = host.attachShadow({ mode: 'open' })
    const wrapper = document.createElement('div')
    root.append(wrapper)
    ;(root as any).getAnimations = () => [fakeAnimation(wrapper, 'finished', 'none')]
    const app = fakeApp(new Map<Node, number>([[wrapper, 3]]))
    webAnimations(app as any)
    app.start()
    app.node(root)
    await Promise.resolve()
    expect(results(app)).toEqual([])
  })
})
