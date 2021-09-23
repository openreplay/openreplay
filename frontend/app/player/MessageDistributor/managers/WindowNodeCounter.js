// @flow

class NodeCounter {
	_id: number;
	_parent: NodeCount | null = null;
	_count: number = 0;
	_children: Array<NodeCounter> = [];


	bubbleCount(count: number) {
		this._count += count;
		if (this._parent != null) {
			this._parent.bubbleCount(count);
		}
	}

	newChild(): NodeCounter {
		const child = new NodeCounter();
		this._children.push(child);
		child._parent = this;
		this.bubbleCount(1);
		return child
	}

	removeChild(child: NodeCounter) {
		this._children = this._children.filter(c => c != child);
		this.bubbleCount(-(child._count + 1));
	}

	removeNode() {
		this._parent.removeChild(this);
		this._parent = null;
	}

	moveNode(newParent: NodeCounter) {
		this.removeNode();
		newParent._children.push(this);
		this._parent = newParent;
		newParent.bubbleCount(this._count + 1);
	}

	get count() {
		return this._count;
	}
}


export default class WindowNodeCounter {
	_root: NodeCounter = new NodeCounter();
	_nodes: Array<NodeCounter> = [ this._root ];


	reset() {
		this._root = new NodeCounter();
		this._nodes = [ this._root ];
	}

	addNode(id: number, parentID: number) {
		if (!this._nodes[ parentID ]) {
			//TODO: iframe case
			//console.error(`Wrong! Node with id ${ parentID } (parentId) not found.`);
			return;
		}
		if (!!this._nodes[ id ]) {
			//console.error(`Wrong! Node with id ${ id } already exists.`);
			return;
		}
		this._nodes[id] = this._nodes[ parentID ].newChild();
	}

	removeNode(id: number) {
		if (!this._nodes[ id ]) {
			// Might be text node
			//console.error(`Wrong! Node with id ${ id } not found.`);
			return;
		}
		this._nodes[ id ].removeNode();
	}

	moveNode(id: number, parentId: number) {
		if (!this._nodes[ id ]) {
			console.error(`Wrong! Node with id ${ id } not found.`);
			return;
		}
		if (!this._nodes[ parentId ]) {
			console.error(`Wrong! Node with id ${ parentId } (parentId) not found.`);
			return;
		}
		this._nodes[ id ].moveNode(this._nodes[ parentId ]);
	}

	get count() {
		return this._root.count;
	}

}