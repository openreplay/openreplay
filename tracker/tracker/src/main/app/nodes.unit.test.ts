import Nodes from './nodes'
import { describe, beforeEach, expect, it, jest } from '@jest/globals'

describe('Nodes', () => {
  let nodes: Nodes
  const nodeId = 'test_id'
  const mockCallback = jest.fn()

  beforeEach(() => {
    nodes = new Nodes(nodeId)
    mockCallback.mockClear()
  })

  it('attachNodeCallback', () => {
    nodes.attachNodeCallback(mockCallback)
    nodes.callNodeCallbacks(document.createElement('div'), true)
    expect(mockCallback).toHaveBeenCalled()
  })

  it('attachNodeListener is listening to events', () => {
    const node = document.createElement('div')
    const mockListener = jest.fn()
    document.body.appendChild(node)
    nodes.registerNode(node)
    nodes.attachNodeListener(node, 'click', mockListener, false)
    node.dispatchEvent(new Event('click'))
    expect(mockListener).toHaveBeenCalled()
  })
  it('attachNodeListener is calling native method', () => {
    const node = document.createElement('div')
    const mockListener = jest.fn()
    const addEventListenerSpy = jest.spyOn(node, 'addEventListener')
    nodes.registerNode(node)
    nodes.attachNodeListener(node, 'click', mockListener)

    expect(addEventListenerSpy).toHaveBeenCalledWith('click', mockListener, true)
  })

  it('registerNode', () => {
    const node = document.createElement('div')
    const [id, isNew] = nodes.registerNode(node)
    expect(id).toBeDefined()
    expect(isNew).toBe(true)
  })

  it('unregisterNode', () => {
    const node = document.createElement('div')
    const [id] = nodes.registerNode(node)
    const unregisteredId = nodes.unregisterNode(node)
    expect(unregisteredId).toBe(id)
  })

  it('cleanTree', () => {
    const node = document.createElement('div')
    nodes.registerNode(node)
    nodes.cleanTree()
    expect(nodes.getNodeCount()).toBe(0)
  })

  it('callNodeCallbacks', () => {
    nodes.attachNodeCallback(mockCallback)
    const node = document.createElement('div')
    nodes.callNodeCallbacks(node, true)
    expect(mockCallback).toHaveBeenCalledWith(node, true)
  })

  it('getID', () => {
    const node = document.createElement('div')
    const [id] = nodes.registerNode(node)
    const fetchedId = nodes.getID(node)
    expect(fetchedId).toBe(id)
  })

  it('getNode', () => {
    const node = document.createElement('div')
    const [id] = nodes.registerNode(node)
    const fetchedNode = nodes.getNode(id)
    expect(fetchedNode).toBe(node)
  })

  it('getNodeCount', () => {
    expect(nodes.getNodeCount()).toBe(0)
    nodes.registerNode(document.createElement('div'))
    expect(nodes.getNodeCount()).toBe(1)
  })

  it('clear', () => {
    nodes.registerNode(document.createElement('div'))
    nodes.clear()
    expect(nodes.getNodeCount()).toBe(0)
  })
})
