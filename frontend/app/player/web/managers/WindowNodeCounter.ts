class NodeCounter {
  private parent: NodeCounter | null = null;

  private _count: number = 0;

  private children: Array<NodeCounter> = [];

  bubbleCount(count: number) {
    this._count += count;
    if (this.parent != null) {
      this.parent.bubbleCount(count);
    }
  }

  newChild(): NodeCounter {
    const child = new NodeCounter();
    this.children.push(child);
    child.parent = this;
    this.bubbleCount(1);
    return child;
  }

  removeChild(child: NodeCounter) {
    this.children = this.children.filter((c) => c != child);
    this.bubbleCount(-(child._count + 1));
  }

  removeNode() {
    if (this.parent) {
      this.parent.removeChild(this);
    }
    this.parent = null;
  }

  moveNode(newParent: NodeCounter) {
    this.removeNode();
    newParent.children.push(this);
    this.parent = newParent;
    newParent.bubbleCount(this._count + 1);
  }

  get count() {
    return this._count;
  }
}

export default class WindowNodeCounter {
  private root: NodeCounter = new NodeCounter();

  private nodes: Array<NodeCounter> = [this.root];

  reset() {
    this.root = new NodeCounter();
    this.nodes = [this.root];
  }

  addNode(msg: { id: number, parentID: number, time: number }): boolean {
    const { id, parentID } = msg;
    if (!this.nodes[parentID]) {
      // TODO: iframe case
      // console.error(`Wrong! Node with id ${ parentID } (parentId) not found.`);
      return false;
    }
    if (this.nodes[id]) {
      // console.error(`Wrong! Node with id ${ id } already exists.`);
      return false;
    }
    this.nodes[id] = this.nodes[parentID].newChild();
    return true;
  }

  removeNode({ id }: { id: number }) {
    if (!this.nodes[id]) {
      // Might be text node
      // console.error(`Wrong! Node with id ${ id } not found.`);
      return false;
    }
    this.nodes[id].removeNode();
    return true;
  }

  moveNode(msg: { id: number, parentID: number, time: number }) {
    const { id, parentID, time } = msg;
    if (!this.nodes[id]) {
      console.warn(`Node Counter: Node with id ${id} (parent: ${parentID}) not found. time: ${time}`);
      return false;
    }
    if (!this.nodes[parentID]) {
      console.warn(
        `Node Counter: Node with id ${parentID} (parentId) not found. time: ${time}`,
      );
      return false;
    }
    this.nodes[id].moveNode(this.nodes[parentID]);
    return true;
  }

  get count() {
    return this.root.count;
  }
}
