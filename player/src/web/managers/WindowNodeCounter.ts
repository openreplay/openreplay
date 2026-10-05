class NodeCounter {
  parent: NodeCounter | null = null;

  private _count: number = 0;

  /** Created on first child: most nodes are leaves. */
  children: Set<NodeCounter> | undefined;

  constructor(readonly id: number) {}

  bubbleCount(count: number) {
    let node: NodeCounter | null = this;
    while (node) {
      node._count += count;
      node = node.parent;
    }
  }

  newChild(id: number): NodeCounter {
    const child = new NodeCounter(id);
    (this.children ??= new Set()).add(child);
    child.parent = this;
    this.bubbleCount(1);
    return child;
  }

  detach() {
    const { parent } = this;
    if (!parent) return;
    parent.children?.delete(this);
    parent.bubbleCount(-(this._count + 1));
    this.parent = null;
  }

  moveTo(newParent: NodeCounter) {
    this.detach();
    (newParent.children ??= new Set()).add(this);
    this.parent = newParent;
    newParent.bubbleCount(this._count + 1);
  }

  get count() {
    return this._count;
  }
}

const ROOT_ID = 0;

export default class WindowNodeCounter {
  private root: NodeCounter = new NodeCounter(ROOT_ID);

  /** Indexed by node id (dense per document) */
  private nodes: Array<NodeCounter | undefined> = [this.root];

  reset() {
    this.root = new NodeCounter(ROOT_ID);
    this.nodes = [this.root];
  }

  addNode(msg: { id: number; parentID: number; time: number }): boolean {
    const { id, parentID } = msg;
    const parent = this.nodes[parentID];
    if (!parent) {
      // TODO: iframe case
      return false;
    }
    if (this.nodes[id]) {
      return false;
    }
    this.nodes[id] = parent.newChild(id);
    return true;
  }

  /** The tracker sends RemoveNode only for the subtree root, so descendants are dropped here too. */
  removeNode({ id }: { id: number }) {
    const node = this.nodes[id];
    if (!node || node === this.root) {
      // Might be text node
      return false;
    }
    node.detach();
    const stack = [node];
    while (stack.length) {
      const current = stack.pop()!;
      this.nodes[current.id] = undefined;
      current.children?.forEach((child) => stack.push(child));
    }
    return true;
  }

  moveNode(msg: { id: number; parentID: number; time: number }) {
    const { id, parentID, time } = msg;
    const node = this.nodes[id];
    if (!node) {
      console.warn(
        `Node Counter: Node with id ${id} (parent: ${parentID}) not found. time: ${time}`,
      );
      return false;
    }
    const parent = this.nodes[parentID];
    if (!parent) {
      console.warn(
        `Node Counter: Node with id ${parentID} (parentId) not found. time: ${time}`,
      );
      return false;
    }
    // a move under its own subtree (stale order within a mutation) would make bubbleCount loop forever
    for (let p: NodeCounter | null = parent; p; p = p.parent) {
      if (p === node) return false;
    }
    node.moveTo(parent);
    return true;
  }

  get count() {
    return this.root.count;
  }
}
