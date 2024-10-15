import { createEventListener, deleteEventListener } from '../../utils.js'
import Maintainer, { MaintainerOptions } from './maintainer.js'

type NodeCallback = (node: Node, isStart: boolean) => void
type ElementListener = [string, EventListener, boolean]

export interface NodesOptions {
  node_id: string
  forceNgOff: boolean
  maintainer?: Partial<MaintainerOptions>
}

export default class Nodes {
  private readonly nodes: Map<number, Node | void> = new Map()
  private totalNodeAmount = 0
  private readonly nodeCallbacks: Array<NodeCallback> = []
  private readonly elementListeners: Map<number, Array<ElementListener>> = new Map()
  private nextNodeId = 0
  private readonly node_id: string
  private readonly forceNgOff: boolean
  private readonly maintainer: Maintainer

  constructor(params: NodesOptions) {
    this.node_id = params.node_id
    this.forceNgOff = params.forceNgOff
    this.maintainer = new Maintainer(this.nodes, this.unregisterNode, params.maintainer)
    this.maintainer.start()
  }

  syntheticMode(frameOrder: number) {
    const maxSafeNumber = Number.MAX_SAFE_INTEGER
    const placeholderSize = 99999999
    const nextFrameId = placeholderSize * frameOrder
    // I highly doubt that this will ever happen,
    // but it will be easier to debug if it does
    if (nextFrameId > maxSafeNumber) {
      throw new Error('Placeholder id overflow')
    }
    this.nextNodeId = nextFrameId
  }

  // Attached once per Tracker instance
  attachNodeCallback = (nodeCallback: NodeCallback): number => {
    return this.nodeCallbacks.push(nodeCallback)
  }

  scanTree = (cb: (node: Node | void) => void) => {
    this.nodes.forEach((node) => (node ? cb(node) : undefined))
  }

  attachNodeListener = (
    node: Node,
    type: string,
    listener: EventListener,
    useCapture = true,
  ): void => {
    const id = this.getID(node)
    if (id === undefined) {
      return
    }
    createEventListener(node, type, listener, useCapture, this.forceNgOff)
    let listeners = this.elementListeners.get(id)
    if (listeners === undefined) {
      listeners = []
      this.elementListeners.set(id, listeners)
    }
    listeners.push([type, listener, useCapture])
  }

  registerNode(node: Node): [/*id:*/ number, /*isNew:*/ boolean] {
    let id: number = (node as any)[this.node_id]
    const isNew = id === undefined
    if (isNew) {
      id = this.nextNodeId
      this.totalNodeAmount++
      this.nextNodeId++
      this.nodes.set(id, node)
      ;(node as any)[this.node_id] = id
    }
    return [id, isNew]
  }

  unregisterNode = (node: Node): number | undefined => {
    const id = (node as any)[this.node_id]
    if (id !== undefined) {
      ;(node as any)[this.node_id] = undefined
      delete (node as any)[this.node_id]
      this.nodes.delete(id)
      const listeners = this.elementListeners.get(id)
      if (listeners !== undefined) {
        this.elementListeners.delete(id)
        listeners.forEach((listener) =>
          deleteEventListener(node, listener[0], listener[1], listener[2], this.forceNgOff),
        )
      }
      this.totalNodeAmount--
    }
    return id
  }

  cleanTree() {
    // sadly we keep empty items in array here resulting in some memory still being used
    // but its still better than keeping dead nodes or undef elements
    // plus we keep our index positions for new/alive nodes
    // performance test: 3ms for 30k nodes with 17k dead ones
    for (const [_, node] of this.nodes) {
      if (node && !document.contains(node)) {
        this.unregisterNode(node)
      }
    }
  }

  callNodeCallbacks(node: Node, isStart: boolean): void {
    this.nodeCallbacks.forEach((cb) => cb(node, isStart))
  }

  getID(node: Node): number | undefined {
    if (!node) return undefined
    return (node as any)[this.node_id]
  }

  getNode(id: number) {
    return this.nodes.get(id)
  }

  getNodeCount() {
    return this.totalNodeAmount
  }

  clear(): void {
    for (const [_, node] of this.nodes) {
      if (node) {
        this.unregisterNode(node)
      }
    }

    this.nextNodeId = 0
    this.nodes.clear()
  }
}
