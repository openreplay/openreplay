type VChild = VElement | VText

export type VNode = VDocument | VShadowRoot | VElement | VText

import { insertRule, deleteRule } from './safeCSSRules';

abstract class VParent {
	abstract node: Node | null
	protected children: VChild[] = []
	private insertedChildren: Set<VChild> = new Set()

	insertChildAt(child: VChild, index: number) {
		if (child.parentNode) {
			child.parentNode.removeChild(child)
		}
		this.children.splice(index, 0, child)
		this.insertedChildren.add(child)
		child.parentNode = this
	}

	removeChild(child: VChild) {
		this.children = this.children.filter(ch => ch !== child)
		this.insertedChildren.delete(child)
		child.parentNode = null
	}

	applyChanges() {
		const node = this.node
		if (!node) {
			// log err
			console.error("No node found", this)
			return
		}
		// inserting
		for (let i = this.children.length-1; i >= 0; i--) {
			const child = this.children[i]
			child.applyChanges()
			if (this.insertedChildren.has(child)) {
				const nextVSibling = this.children[i+1]
				node.insertBefore(child.node, nextVSibling ? nextVSibling.node : null)
			}
		}
		this.insertedChildren.clear()
		// removing
		const realChildren = node.childNodes
		for(let j = 0; j < this.children.length; j++) {
			while (realChildren[j] !== this.children[j].node) {
				node.removeChild(realChildren[j])
			}
		}
		// removing rest
		while(realChildren.length > this.children.length) {
			node.removeChild(node.lastChild)
		}
	}
}

export class VDocument extends VParent {
	constructor(public readonly node: Document) { super() }
	applyChanges() {
		if (this.children.length > 1) {
			// log err
		}
		if (!this.node) {
			// iframe not mounted yet
			return
		}
		const child = this.children[0]
		if (!child) { return }
		child.applyChanges()
		const htmlNode = child.node
		if (htmlNode.parentNode !== this.node) {
			this.node.replaceChild(htmlNode, this.node.documentElement)
		}
	}
}

export class VShadowRoot extends VParent {
	constructor(public readonly node: ShadowRoot) { super() }
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

// @Depricated TODO: remove in favor of PostponedStyleSheet
export class VStyleElement extends VElement {
	private loaded = false
	private stylesheetCallbacks: StyleSheetCallback[] = []
	constructor(public readonly node: StyleElement) { 
		super(node)  // Is it compiled correctly or with 2 node assignments?
		node.onload = () => {
		  const sheet = node.sheet
		  if (sheet) {
		    this.stylesheetCallbacks.forEach(cb => cb(sheet))
		    this.stylesheetCallbacks = []
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


export class PostponedStyleSheet {
	private loaded = false
	private stylesheetCallbacks: StyleSheetCallback[] = []

	constructor(private readonly node: StyleElement) {
		node.onload = () => {
		  const sheet = node.sheet
		  if (sheet) {
		    this.stylesheetCallbacks.forEach(cb => cb(sheet))
		    this.stylesheetCallbacks = []
		  } else {
		    console.warn("Style node onload: sheet is null")
		  }
		  this.loaded = true
		}
	}

	private applyCallback(cb: StyleSheetCallback) {
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

	insertRule(rule: string, index: number) {
		this.applyCallback(s => insertRule(s, { rule, index }))
	}

	deleteRule(index: number) {
		this.applyCallback(s => deleteRule(s, { index }))
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

