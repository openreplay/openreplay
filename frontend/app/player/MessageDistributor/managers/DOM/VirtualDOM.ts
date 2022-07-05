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
		for (let i = 0; i < this.children.length; i++) {
			const ch = this.children[i]
			ch.applyChanges()
			if (ch.node.parentNode !== node) {
				const nextSibling = realChildren[i]
				node.insertBefore(ch.node, nextSibling || null)
			}
			if (realChildren[i] !== ch.node) {
				node.removeChild(realChildren[i])
			}
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
		const htmlNode = this.children[0].node
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
	private newAttributes: Record<string, string | false> = {}
	//private props: Record<string, string | number | boolean>
	constructor(public readonly node: Element) { super() }
	setAttribute(name: string, value: string) {
		this.newAttributes[name] = value
	}
	removeAttribute(name: string) {
		this.newAttributes[name] = false
	}

	applyChanges() {
		Object.entries(this.newAttributes).forEach(([key, value]) => {
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
		this.newAttributes = {}
		super.applyChanges()
	}
}


type StyleSheetCallback = (s: CSSStyleSheet) => void
export type StyleElement = HTMLStyleElement | SVGStyleElement
export class VStyleElement extends VElement {
	private loaded = false
	private stylesheetCallbacks: StyleSheetCallback[] = []
	constructor(public readonly node: StyleElement) { 
		super(node)  // Is it compiled correctly or with 2 node assignments?
		node.onload = () => {
			const sheet = node.sheet
			if (sheet) {
				this.stylesheetCallbacks.forEach(cb => cb(sheet))
			} else {
				console.warn("Style onload: sheet is null")
			}
			this.loaded = true
		}
	}

	onStyleSheet(cb: StyleSheetCallback) {
		if (this.loaded) {
			if (!this.node.sheet) {
				console.warn("Style tag is loaded, but sheet is null")
				return
			}
			cb(this.node.sheet)
		} else {
			this.stylesheetCallbacks.push(cb)
		}
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

