export default class VirtualNodeTree {
  tree: any = { 0: null }
  nodeParents: any = { 0: null}
  constructor(
    private readonly onRemoveNode: (id: number) => void
  ) {}

  addNode(id: number, parentId: number | null = null) {
    this.nodeParents[id] = parentId;
    if (parentId === null) {
      this.tree[id] = null;
    } else {
      const parentNode = this.findNode(parentId);
      if (parentNode === null) {
        this.updateNode(parentId, {});
      }

      this.findNode(parentId)[id] = null;
    }
  }

  removeNode(id: number) {
    if (!(id in this.nodeParents)) {
      // throw new Error(`Node ${id} doesn't exist`); ? since its just for tracking, nothing
      return;
    }

    const childrenIds = Object.keys(this.nodeParents).filter(
      nodeId => this.nodeParents[nodeId] === id
    );

    for (const childId of childrenIds) {
      this.removeNode(parseInt(childId));
    }

    const parentId = this.nodeParents[id];

    if (parentId === null) {
      delete this.tree[id];
    } else {
      const parentNode = this.findNode(parentId);
      delete parentNode[id];
      this.onRemoveNode(id);
      if (Object.keys(parentNode).length === 0) {
        this.updateNode(parentId, null);
      }
    }
    delete this.nodeParents[id];
  }

  getPath(id: number) {
    if (!(id in this.nodeParents) && id !== 0) {
      // throw new Error(`Node ${id} doesn't exist`);
      return;
    }

    const path: any[] = [];
    let currentId = id;

    while (currentId !== null) {
      path.unshift(currentId);
      currentId = this.nodeParents[currentId];
    }

    return path.join('.');
  }

  findNode(id: number) {
    const path = this.getPath(id);
    if (!path) return;
    return this.getNodeByPath(path);
  }

  updateNode(id: number, value: any) {
    const path = this.getPath(id);
    if (!path) return;
    this.setNodeByPath(path, value);
  }

  getNodeByPath(path: string) {
    const ids = path.split('.');
    let node = this.tree;

    for (const id of ids) {
      node = node[id];
      if (node === undefined) return null;
    }

    return node;
  }

  setNodeByPath(path: string, value: number) {
    const ids = path.split('.');
    let node = this.tree;

    for (let i = 0; i < ids.length - 1; i++) {
      node = node[ids[i]];
    }

    node[ids[ids.length - 1]] = value;
  }

  clearAll = () => {
    this.tree = {};
    this.nodeParents = {};
  }
}
