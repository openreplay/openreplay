type VChild = VElement | VText

export type VNode = VDocument | VFragment | VElement | VText

abstract class VParent {
	abstract node: Node | null
	protected children: VChild[] = []
	insertChildAt(child: VChild, index: number) {
		if (child.parentNode) {
			child.parentNode.removeChild(child)
		}
		this.children.splice(index, 0, child)
		child.parentNode = this
	}

	removeChild(child: VChild) {
		this.children = this.children.filter(ch => ch !== child)
		child.parentNode = null
	}

	applyChanges() {
		const node = this.node
		if (!node) {
			// log err
			console.error("No node found", this)
			return
		}
		const realChildren = node.childNodes
		let i: number
		// apply correct children order
		for (i = 0; i < this.children.length; i++) {
			const child = this.children[i]
			child.applyChanges()
			//while (realChildren[i] shouldn't be there) remove it //optimal way
			if (realChildren[i] !== child.node) {
				node.insertBefore(child.node, realChildren[i] || null)
			}
		}
		// remove rest
		while(realChildren[i]) {
			node.removeChild(realChildren[i])
		}
	}
}

export class VDocument extends VParent {
	constructor(public node: Document | null = null) { super() }
	setDocument(doc: Document) {
		this.node = doc
	}
	applyChanges() {
		if (this.children.length > 1) {
			// log err
		}
		if (!this.node) {
			// iframe not mounted yet
			return
		}
		const child = this.children[0]
		child.applyChanges()
		const htmlNode = child.node
		if (htmlNode.parentNode !== this.node) {
			this.node.replaceChild(htmlNode, this.node.documentElement)
		}
	}
}

export class VFragment extends VParent {
	constructor(public readonly node: DocumentFragment) { super() }
}

export class VElement extends VParent {
	parentNode: VParent | null = null
	private newAttributes: Map<string, string | false> = new Map()
	constructor(public readonly node: Element) { super() }
	setAttribute(name: string, value: string) {
		this.newAttributes.set(name, value)
	}
	removeAttribute(name: string) {
		this.newAttributes.set(name, false)
	}

	// mbtodo: priority insertion instead.
	// rn this is for styles that should be inserted as prior, 
	// otherwise it will show visual styling lag if there is a transition CSS property)
	enforceInsertion() {
		let vNode: VElement = this
		while (vNode.parentNode instanceof VElement) {
			vNode = vNode.parentNode
		}
		(vNode.parentNode || vNode).applyChanges()
	}

	applyChanges() {
		this.newAttributes.forEach((value, key) => {
			if (value === false) {
				this.node.removeAttribute(key)
			} else {
				try {
					this.node.setAttribute(key, value)
				} catch {
					// log err
				}
			}
		})
		this.newAttributes.clear()
		super.applyChanges()
	}
}


type StyleSheetCallback = (s: CSSStyleSheet) => void
export type StyleElement = HTMLStyleElement | SVGStyleElement
export class VStyleElement extends VElement {
	// private loaded = false
	private stylesheetCallbacks: StyleSheetCallback[] = []
	constructor(public readonly node: StyleElement) { 
		super(node)  // Is it compiled correctly or with 2 node assignments?
		// node.onload = () => {
		//   const sheet = node.sheet
		//   if (sheet) {
		//     this.stylesheetCallbacks.forEach(cb => cb(sheet))
		//   } else {
		//     console.warn("Style onload: sheet is null")
		//   }
		//   this.loaded = true
		// }
	}

	onStyleSheet(cb: StyleSheetCallback) {
		// if (this.loaded) {
			if (!this.node.sheet) {
				console.warn("Style tag is loaded, but sheet is null")
				return
			}
			cb(this.node.sheet)
		// } else {
		//   this.stylesheetCallbacks.push(cb)
		// }
	}
}

export class VText {
	parentNode: VParent | null = null
	constructor(public readonly node: Text = new Text()) {}
	private data: string = ""
	private changed: boolean = false
	setData(data: string) {
		this.data = data
		this.changed = true
	}
	applyChanges() {
		if (this.changed) {
			this.node.data = this.data
			this.changed = false
		}
	}
}

