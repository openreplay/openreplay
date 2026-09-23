import Nodes from '../main/app/nodes'
import { pack, MASK_NODE } from '../main/app/nodes/idSeq.js'
import { describe, beforeEach, afterEach, expect, test, jest } from '@jest/globals'

const nodeId = 'test_id'

describe('Nodes', () => {
  let nodes: Nodes

  beforeEach(() => {
    nodes = new Nodes({
      node_id: nodeId,
      forceNgOff: false,
      maintainer: { enabled: false },
    })
  })

  afterEach(() => {
    nodes.clear()
    document.body.innerHTML = ''
  })

  test('attachNodeListener registers a native listener with capture by default', () => {
    const node = document.createElement('div')
    const mockListener = jest.fn()
    const addEventListenerSpy = jest.spyOn(node, 'addEventListener')
    nodes.registerNode(node)
    nodes.attachNodeListener(node, 'click', mockListener)

    expect(addEventListenerSpy).toHaveBeenCalledWith('click', mockListener, true)
    node.dispatchEvent(new Event('click'))
    expect(mockListener).toHaveBeenCalledTimes(1)
  })

  test('attachNodeListener ignores unregistered nodes', () => {
    const node = document.createElement('div')
    const addEventListenerSpy = jest.spyOn(node, 'addEventListener')
    nodes.attachNodeListener(node, 'click', jest.fn())
    expect(addEventListenerSpy).not.toHaveBeenCalled()
  })

  describe('registerNode', () => {
    test('assigns sequential ids starting from 0', () => {
      const a = document.createElement('div')
      const b = document.createElement('div')
      expect(nodes.registerNode(a)).toEqual([0, true])
      expect(nodes.registerNode(b)).toEqual([1, true])
      expect(nodes.getID(a)).toBe(0)
      expect(nodes.getNode(1)).toBe(b)
      expect(nodes.getNodeCount()).toBe(2)
    })

    test('re-registering the same node returns its id and isNew=false', () => {
      const a = document.createElement('div')
      const [id] = nodes.registerNode(a)
      expect(nodes.registerNode(a)).toEqual([id, false])
      expect(nodes.getNodeCount()).toBe(1)
    })

    test('a stale expando pointing at another node yields a fresh id', () => {
      const a = document.createElement('div')
      const b = document.createElement('div')
      nodes.registerNode(a)
      nodes.clear()
      expect(nodes.registerNode(b)).toEqual([0, true])
      ;(a as any)[nodeId] = 0

      expect(nodes.isBound(a)).toBe(false)
      expect(nodes.registerNode(a)).toEqual([1, true])
      expect(nodes.getNode(0)).toBe(b)
      expect(nodes.getNode(1)).toBe(a)
    })
  })

  describe('unregisterNode', () => {
    test('drops id, node, count and returns the old id', () => {
      const node = document.createElement('div')
      const [id] = nodes.registerNode(node)
      expect(nodes.unregisterNode(node)).toBe(id)

      expect(nodes.getID(node)).toBeUndefined()
      expect(nodes.getNode(id)).toBeUndefined()
      expect(nodes.getNodeCount()).toBe(0)
      expect(nodes.isBound(node)).toBe(false)
    })

    test('removes attached listeners so they stop firing', () => {
      const node = document.createElement('div')
      const listener = jest.fn()
      const removeSpy = jest.spyOn(node, 'removeEventListener')
      nodes.registerNode(node)
      nodes.attachNodeListener(node, 'click', listener, false)
      node.dispatchEvent(new Event('click'))
      expect(listener).toHaveBeenCalledTimes(1)

      nodes.unregisterNode(node)

      expect(removeSpy).toHaveBeenCalledWith('click', listener, false)
      node.dispatchEvent(new Event('click'))
      expect(listener).toHaveBeenCalledTimes(1)
    })

    test('is a no-op for unknown nodes', () => {
      expect(nodes.unregisterNode(document.createElement('div'))).toBeUndefined()
      expect(nodes.getNodeCount()).toBe(0)
    })
  })

  test('cleanTree removes detached nodes and keeps attached ones', () => {
    const attached = document.createElement('div')
    const detached = document.createElement('div')
    document.body.appendChild(attached)
    const [attachedId] = nodes.registerNode(attached)
    const [detachedId] = nodes.registerNode(detached)

    nodes.cleanTree()

    expect(nodes.getNodeCount()).toBe(1)
    expect(nodes.getNode(attachedId)).toBe(attached)
    expect(nodes.getNode(detachedId)).toBeUndefined()
    expect(nodes.getID(detached)).toBeUndefined()
  })

  test('scanTree visits every registered node', () => {
    const a = document.createElement('div')
    const b = document.createElement('span')
    nodes.registerNode(a)
    nodes.registerNode(b)
    const seen: Node[] = []
    nodes.scanTree((n) => n && seen.push(n))
    expect(seen).toEqual([a, b])
  })

  test('callNodeCallbacks calls every attached callback in order', () => {
    const calls: string[] = []
    nodes.attachNodeCallback(() => calls.push('first'))
    nodes.attachNodeCallback((n, isStart) => calls.push(`second:${isStart}`))
    nodes.callNodeCallbacks(document.createElement('div'), true)
    expect(calls).toEqual(['first', 'second:true'])
  })

  test('clear unregisters everything and restarts ids from 0', () => {
    const a = document.createElement('div')
    nodes.registerNode(a)
    nodes.registerNode(document.createElement('div'))
    nodes.clear()

    expect(nodes.getNodeCount()).toBe(0)
    expect(nodes.getID(a)).toBeUndefined()
    expect(nodes.getNode(0)).toBeUndefined()
    expect(nodes.registerNode(document.createElement('p'))).toEqual([0, true])
  })

  describe('id space', () => {
    test('crossdomainMode moves ids into the frame block', () => {
      nodes.crossdomainMode(1, 3)
      expect(nodes.registerNode(document.createElement('div'))[0]).toBe(pack(1, 3, 0))
      expect(nodes.registerNode(document.createElement('div'))[0]).toBe(pack(1, 3, 1))
    })

    test('exhaustion fires onIdSpaceExhausted once; clear and crossdomainMode reset it', () => {
      const onIdSpaceExhausted = jest.fn()
      const n = new Nodes({
        node_id: nodeId,
        forceNgOff: false,
        maintainer: { enabled: false },
        onIdSpaceExhausted,
      })
      const exhaust = () => {
        ;(n as any).nextNodeId = pack(1, 0, 0) + MASK_NODE
      }

      n.crossdomainMode(1, 0)
      exhaust()
      // the last id of the block is still fine
      expect(n.registerNode(document.createElement('div'))[0]).toBe(pack(1, 0, MASK_NODE))
      expect(onIdSpaceExhausted).not.toHaveBeenCalled()
      n.registerNode(document.createElement('div'))
      n.registerNode(document.createElement('div'))
      expect(onIdSpaceExhausted).toHaveBeenCalledTimes(1)

      n.crossdomainMode(1, 0)
      exhaust()
      n.registerNode(document.createElement('div'))
      n.registerNode(document.createElement('div'))
      expect(onIdSpaceExhausted).toHaveBeenCalledTimes(2)

      n.clear()
      n.crossdomainMode(1, 0)
      exhaust()
      n.registerNode(document.createElement('div'))
      n.registerNode(document.createElement('div'))
      expect(onIdSpaceExhausted).toHaveBeenCalledTimes(3)

      n.clear()
    })

    test('top context never reports exhaustion', () => {
      const onIdSpaceExhausted = jest.fn()
      const n = new Nodes({
        node_id: nodeId,
        forceNgOff: false,
        maintainer: { enabled: false },
        onIdSpaceExhausted,
      })
      ;(n as any).nextNodeId = MASK_NODE + 10
      n.registerNode(document.createElement('div'))
      expect(onIdSpaceExhausted).not.toHaveBeenCalled()
      n.clear()
    })
  })
})

describe('Nodes maintainer', () => {
  let nodes: Nodes

  beforeEach(() => {
    jest.useFakeTimers()
    nodes = new Nodes({
      node_id: nodeId,
      forceNgOff: false,
      maintainer: { interval: 1000 },
    })
  })

  afterEach(() => {
    nodes.clear()
    jest.useRealTimers()
    document.body.innerHTML = ''
  })

  test('starts lazily on first registration only', () => {
    expect(jest.getTimerCount()).toBe(0)
    nodes.registerNode(document.createElement('div'))
    expect(jest.getTimerCount()).toBe(1)
    nodes.registerNode(document.createElement('div'))
    expect(jest.getTimerCount()).toBe(1)
  })

  test('periodically unregisters disconnected nodes', () => {
    const attached = document.createElement('div')
    const detached = document.createElement('div')
    document.body.appendChild(attached)
    nodes.registerNode(attached)
    nodes.registerNode(detached)

    jest.advanceTimersByTime(1000)

    expect(nodes.isBound(attached)).toBe(true)
    expect(nodes.getID(detached)).toBeUndefined()
    expect(nodes.getNodeCount()).toBe(1)
  })

  test('clear stops the maintainer and the next registration restarts it', () => {
    nodes.registerNode(document.createElement('div'))
    nodes.clear()
    expect(jest.getTimerCount()).toBe(0)

    const detached = document.createElement('div')
    nodes.registerNode(detached)
    expect(jest.getTimerCount()).toBe(1)
    jest.advanceTimersByTime(1000)
    expect(nodes.getID(detached)).toBeUndefined()
  })
})
