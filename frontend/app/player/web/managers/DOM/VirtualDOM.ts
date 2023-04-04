import { insertRule, deleteRule } from './safeCSSRules';


type Callback<T> = (o: T) => void

/**
 * Virtual Node base class.
 * Implements common abstract methods and lazy node creation logic.
 * 
 * @privateRemarks
 * Would be better to export type-only, but didn't find a nice way to do that.
 */
export abstract class VNode<T extends Node = Node> {
	protected abstract createNode(): T
	private _node: T | null
	/**
	 * JS DOM Node getter with lazy node creation
	 * 
	 * @returns underneath JS DOM Node
	 * @remarks should not be called unless the real node is required since creation might be expensive
	 */
	get node(): T {
		if (!this._node) {
			const node = this._node = this.createNode()
			this.nodeCallbacks.forEach(cb => cb(node))
			this.nodeCallbacks = []
		}
		return this._node
	}
	private nodeCallbacks: Callback<T>[] = []
	onNode(callback: Callback<T>) {
		if (this._node) {
			callback(this._node)
			return
		}
		this.nodeCallbacks.push(callback)
	}
	public abstract applyChanges(): void
}

type VChild = VElement | VText
abstract class VParent<T extends Node = Node> extends VNode<T>{
	protected children: VChild[] = []
	private recentlyInserted: Set<VChild> = new Set()

	insertChildAt(child: VChild, index: number) {
		if (child.parentNode) {
			child.parentNode.removeChild(child)
		}
		this.children.splice(index, 0, child)
		this.recentlyInserted.add(child)
		child.parentNode = this
	}

	removeChild(child: VChild) {
		this.children = this.children.filter(ch => ch !== child)
		this.recentlyInserted.delete(child)
		child.parentNode = null
	}

	applyChanges() {
		const node = this.node
		/* Inserting */
		for (let i = this.children.length-1; i >= 0; i--) {
			const child = this.children[i]
			child.applyChanges() /* Building the sub-tree in memory first */
			if (this.recentlyInserted.has(child)) {
				const nextVSibling = this.children[i+1]
				node.insertBefore(child.node, nextVSibling ? nextVSibling.node : null)
			}
		}
		this.recentlyInserted.clear()
		/* Removing in-between */
		const realChildren = node.childNodes
		for(let j = 0; j < this.children.length; j++) {
			while (realChildren[j] !== this.children[j].node) {
				node.removeChild(realChildren[j])
			}
		}
		/* Removing tail */
		while(realChildren.length > this.children.length) {
			node.removeChild(node.lastChild as Node) /* realChildren.length > this.children.length >= 0 */
		}
	}
}

export class VDocument extends VParent<Document> {
	constructor(protected readonly createNode: () => Document) { super() }
	applyChanges() {
		if (this.children.length > 1) {
			console.error("VDocument expected to have a single child.", this)
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

export class VShadowRoot extends VParent<ShadowRoot> {
	constructor(protected readonly createNode: () => ShadowRoot) { super() }
}

export type VRoot = VDocument | VShadowRoot

export class VElement extends VParent<Element> {
	parentNode: VParent | null = null
	private newAttributes: Map<string, string | false> = new Map()

	constructor(readonly tagName: string, readonly isSVG = false) { super() }
	protected createNode() {
		return this.isSVG
			? document.createElementNS('http://www.w3.org/2000/svg', this.tagName)
			: document.createElement(this.tagName)
	}
	setAttribute(name: string, value: string) {
		this.newAttributes.set(name, value)
	}
	removeAttribute(name: string) {
		this.newAttributes.set(name, false)
	}

	applyChanges() {
		this.newAttributes.forEach((value, key) => {
			if (value === false) {
				this.node.removeAttribute(key)
			} else {
				try {
					this.node.setAttribute(key, value)
				} catch (e) {
					console.error(e)
				}
			}
		})
		this.newAttributes.clear()
		super.applyChanges()
	}

	// TODO: priority insertion instead.
	// rn this is for styles that should be inserted as prior, 
	// otherwise it will show visual styling lag if there is a transition CSS property)
	enforceInsertion() {
		let vNode: VElement = this
		while (vNode.parentNode instanceof VElement) {
			vNode = vNode.parentNode
		}
		(vNode.parentNode || vNode).applyChanges()
	}
}

export class VHTMLElement extends VElement {
	constructor(node: HTMLElement) {
		super("HTML", false)
		this.createNode = () => node
	}
}

export class VText extends VNode<Text> {
	parentNode: VParent | null = null
	protected createNode() {
		return new Text()
	}

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

class PromiseQueue<T> {
	constructor(private promise: Promise<T>) {}
	doNext(cb: Callback<T>) { // Doing this with callbacks list instead might be more efficient. TODO: research
		this.promise = this.promise.then(vRoot => {
			cb(vRoot)
			return vRoot
		})
	}
	catch(cb: Parameters<Promise<T>['catch']>[0]) {
		this.promise.catch(cb)
	}
}

/**
 * VRoot wrapper that allows to defer all the API calls till the moment
 * when VNode CAN be created (for example, on <iframe> mount&load)
 * */
export class OnloadVRoot extends PromiseQueue<VRoot> {
	static fromDocumentNode(doc: Document): OnloadVRoot {
		return new OnloadVRoot(Promise.resolve(new VDocument(() => doc)))
	}
	static fromVElement(vElem: VElement): OnloadVRoot {
		return new OnloadVRoot(new Promise((resolve, reject) => {
			vElem.onNode(host => {
				if (host instanceof HTMLIFrameElement) {
					/* IFrame case: creating Document */
					const doc = host.contentDocument
					if (doc) {
						resolve(new VDocument(() => doc))
					} else {
						host.addEventListener('load', () => {
							const doc = host.contentDocument
							if (doc) {
								resolve(new VDocument(() => doc))
							} else {
								reject("No default Document found on iframe load") // Send `host` for logging as well
							}
						})
					}
				} else {
				/* ShadowDom case */
					try {
						const shadowRoot = host.attachShadow({ mode: 'open' })
						resolve(new VShadowRoot(() => shadowRoot))
					} catch(e) {
						reject(e) // "Can not attach shadow dom"
					}
				}
			})
		}))
	}
	onNode(cb: Callback<Document | ShadowRoot>) {
		this.doNext(vRoot => vRoot.onNode(cb))
	}
	applyChanges() {
		this.doNext(vRoot => vRoot.applyChanges())
	}
	insertChildAt(...args: Parameters<VParent['insertChildAt']>) {
		this.doNext(vRoot => vRoot.insertChildAt(...args))
	}
}

export type StyleElement = HTMLStyleElement | SVGStyleElement

/**
 * CSSStyleSheet wrapper that collects all the insertRule/deleteRule calls 
 * and then applies them when the sheet is ready
 * */
export class OnloadStyleSheet extends PromiseQueue<CSSStyleSheet> {
	static fromStyleElement(node: StyleElement) {
		return new OnloadStyleSheet(new Promise((resolve, reject) => {
			node.addEventListener("load", () => {
				const sheet = node.sheet
				if (sheet) {
					resolve(sheet)
				} else {
					reject("Style node onload: sheet is null")
				}
			})
		}))
	}
	static fromVRootContext(vRoot: OnloadVRoot) {
		return new OnloadStyleSheet(new Promise((resolve, reject) => 
			vRoot.onNode(node => {
				let context: typeof globalThis | null
				if (node instanceof Document) {
					context = node.defaultView
				} else {
					context = node.ownerDocument.defaultView
				}
				if (!context) { reject("Root node default view not found"); return }
				/* a StyleSheet from another Window context won't work */
				resolve(new context.CSSStyleSheet())
			})
		))
	}

	insertRule(rule: string, index: number) {
		this.doNext(s => insertRule(s, { rule, index }))
	}

	deleteRule(index: number) {
		this.doNext(s => deleteRule(s, { index }))
	}
}
