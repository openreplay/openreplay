import Nodes from '../main/app/nodes'
import { describe, beforeEach, expect, test, jest } from '@jest/globals'

describe('Nodes', () => {
  let nodes: Nodes
  const nodeId = 'test_id'
  const mockCallback = jest.fn()

  beforeEach(() => {
    nodes = new Nodes(nodeId)
    mockCallback.mockClear()
  })

  test('attachNodeCallback', () => {
    nodes.attachNodeCallback(mockCallback)
    nodes.callNodeCallbacks(document.createElement('div'), true)
    expect(mockCallback).toHaveBeenCalled()
  })

  test('attachNodeListener is listening to events', () => {
    const node = document.createElement('div')
    const mockListener = jest.fn()
    document.body.appendChild(node)
    nodes.registerNode(node)
    nodes.attachNodeListener(node, 'click', mockListener, false)
    node.dispatchEvent(new Event('click'))
    expect(mockListener).toHaveBeenCalled()
  })
  test('attachNodeListener is calling native method', () => {
    const node = document.createElement('div')
    const mockListener = jest.fn()
    const addEventListenerSpy = jest.spyOn(node, 'addEventListener')
    nodes.registerNode(node)
    nodes.attachNodeListener(node, 'click', mockListener)

    expect(addEventListenerSpy).toHaveBeenCalledWith('click', mockListener, true)
  })

  test('registerNode', () => {
    const node = document.createElement('div')
    const [id, isNew] = nodes.registerNode(node)
    expect(id).toBeDefined()
    expect(isNew).toBe(true)
  })

  test('unregisterNode', () => {
    const node = document.createElement('div')
    const [id] = nodes.registerNode(node)
    const unregisteredId = nodes.unregisterNode(node)
    expect(unregisteredId).toBe(id)
  })

  test('cleanTree', () => {
    const node = document.createElement('div')
    nodes.registerNode(node)
    nodes.cleanTree()
    expect(nodes.getNodeCount()).toBe(0)
  })

  test('callNodeCallbacks', () => {
    nodes.attachNodeCallback(mockCallback)
    const node = document.createElement('div')
    nodes.callNodeCallbacks(node, true)
    expect(mockCallback).toHaveBeenCalledWith(node, true)
  })

  test('getID', () => {
    const node = document.createElement('div')
    const [id] = nodes.registerNode(node)
    const fetchedId = nodes.getID(node)
    expect(fetchedId).toBe(id)
  })

  test('getNode', () => {
    const node = document.createElement('div')
    const [id] = nodes.registerNode(node)
    const fetchedNode = nodes.getNode(id)
    expect(fetchedNode).toBe(node)
  })

  test('getNodeCount', () => {
    expect(nodes.getNodeCount()).toBe(0)
    nodes.registerNode(document.createElement('div'))
    expect(nodes.getNodeCount()).toBe(1)
  })

  test('clear', () => {
    nodes.registerNode(document.createElement('div'))
    nodes.clear()
    expect(nodes.getNodeCount()).toBe(0)
  })
})
