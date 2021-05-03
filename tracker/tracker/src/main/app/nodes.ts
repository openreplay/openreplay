type NodeCallback = (node: Node) => void;
type ElementListener = [string, EventListener];

export default class Nodes {
  private readonly nodes: Array<Node | undefined>;
  private readonly nodeCallbacks: Array<NodeCallback>;
  private readonly elementListeners: Map<number, Array<ElementListener>>;
  constructor(private readonly node_id: string) {
    this.nodes = [];
    this.nodeCallbacks = [];
    this.elementListeners = new Map();
  }
  attachNodeCallback(nodeCallback: NodeCallback): void {
    this.nodeCallbacks.push(nodeCallback);
  }
  attachElementListener(
    type: string,
    node: Element,
    elementListener: EventListener,
  ): void {
    const id = this.getID(node);
    if (id === undefined) {
      return;
    }
    node.addEventListener(type, elementListener);
    let listeners = this.elementListeners.get(id);
    if (listeners === undefined) {
      listeners = [];
      this.elementListeners.set(id, listeners);
      return;
    }
    listeners.push([type, elementListener]);
  }

  registerNode(node: Node): [number, boolean] {
    let id: number = (node as any)[this.node_id];
    const isNew = id === undefined;
    if (isNew) {
      id = this.nodes.length;
      this.nodes[id] = node;
      (node as any)[this.node_id] = id;
    }
    return [id, isNew];
  }
  unregisterNode(node: Node): number | undefined {
    const id = (node as any)[this.node_id];
    if (id !== undefined) {
      delete (node as any)[this.node_id];
      this.nodes[id] = undefined;
      const listeners = this.elementListeners.get(id);
      if (listeners !== undefined) {
        this.elementListeners.delete(id);
        listeners.forEach((listener) =>
          node.removeEventListener(listener[0], listener[1]),
        );
      }
    }
    return id;
  }
  callNodeCallbacks(node: Node): void {
    this.nodeCallbacks.forEach((cb) => cb(node));
  }
  getID(node: Node): number | undefined {
    return (node as any)[this.node_id];
  }
  getNode(id: number): Node | undefined {
    return this.nodes[id];
  }

  clear(): void {
    for (let id = 0; id < this.nodes.length; id++) {
      const node = this.nodes[id];
      if (node === undefined) {
        continue;
      }
      this.unregisterNode(node);
    }
    this.nodes.length = 0;
  }
}
