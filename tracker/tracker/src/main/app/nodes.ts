type NodeCallback = (node: Node, isStart: boolean) => void
type ElementListener = [string, EventListener, boolean]

export default class Nodes {
  private nodes: Array<Node | void> = []
  private readonly nodeCallbacks: Array<NodeCallback> = []
  private readonly elementListeners: Map<number, Array<ElementListener>> = new Map()

  constructor(private readonly node_id: string) {}

  // Attached once per Tracker instance
  attachNodeCallback(nodeCallback: NodeCallback): void {
    this.nodeCallbacks.push(nodeCallback)
  }
  attachNodeListener(node: Node, type: string, listener: EventListener, useCapture = true): void {
    const id = this.getID(node)
    if (id === undefined) {
      return
    }
    node.addEventListener(type, listener, useCapture)
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
      id = this.nodes.length
      this.nodes[id] = node
      ;(node as any)[this.node_id] = id
    }
    return [id, isNew]
  }
  unregisterNode(node: Node): number | undefined {
    const id = (node as any)[this.node_id]
    if (id !== undefined) {
      delete (node as any)[this.node_id]
      delete this.nodes[id]
      const listeners = this.elementListeners.get(id)
      if (listeners !== undefined) {
        this.elementListeners.delete(id)
        listeners.forEach((listener) =>
          node.removeEventListener(listener[0], listener[1], listener[2]),
        )
      }
    }
    return id
  }
  cleanTree() {
    // sadly we keep empty items in array here resulting in some memory still being used
    // but its still better than keeping dead nodes or undef elements
    // plus we keep our index positions for new/alive nodes
    // performance test: 3ms for 30k nodes with 17k dead ones
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i]
      if (node && !document.contains(node)) {
        this.unregisterNode(node)
      }
    }
  }
  callNodeCallbacks(node: Node, isStart: boolean): void {
    this.nodeCallbacks.forEach((cb) => cb(node, isStart))
  }
  getID(node: Node): number | undefined {
    return (node as any)[this.node_id]
  }
  getNode(id: number) {
    return this.nodes[id]
  }

  clear(): void {
    for (let id = 0; id < this.nodes.length; id++) {
      const node = this.nodes[id]
      if (node === undefined) {
        continue
      }
      this.unregisterNode(node)
    }
    this.nodes.length = 0
  }
}
