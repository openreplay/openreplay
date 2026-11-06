/**
 * Native DOM accessors, immune to pages that override Node.prototype getters
 * (MooTools, Prototype.js, some polyfills and framework shims) and to getters redefined on
 * the nodes themselves (Stencil's scoped-slot patches report a slotted node's logical parent,
 * the host, instead of the element it actually sits in).
 *
 * If the page prototypes are native we call their getters; otherwise the getters are taken
 * from a pristine prototype of a throwaway iframe.
 * Idea taken from rrweb (packages/utils/src/index.ts).
 */

const NODE_ACCESSORS = ['parentNode', 'previousSibling', 'nextSibling', 'firstChild'] as const
type NodeAccessor = (typeof NODE_ACCESSORS)[number]
type Getter = (this: Node) => Node | null

const isNative = (fn: unknown) =>
  typeof fn === 'function' && Function.prototype.toString.call(fn).includes('[native code]')

function getterOf(proto: object, name: string): Getter | undefined {
  return Object.getOwnPropertyDescriptor(proto, name)?.get as Getter | undefined
}

function isTainted(): boolean {
  try {
    return NODE_ACCESSORS.some((name) => !isNative(getterOf(Node.prototype, name)))
  } catch {
    return false
  }
}

let pristine: Record<NodeAccessor, Getter> | null = null
let getters: Record<NodeAccessor, Getter> | null = null

function prototypeGetters(): Record<NodeAccessor, Getter> | null {
  try {
    const found = {} as Record<NodeAccessor, Getter>
    for (const name of NODE_ACCESSORS) {
      const getter = getterOf(Node.prototype, name)
      if (!getter) return null
      found[name] = getter
    }
    return found
  } catch {
    return null
  }
}

/**
 * Must be called before observation starts: the helper iframe is inserted and removed
 * synchronously, so our own MutationObserver never sees it.
 * */
export function initUntaintedDom(): void {
  if (pristine || typeof document === 'undefined') {
    return
  }
  getters = prototypeGetters()
  if (!document.documentElement || !isTainted()) {
    return
  }
  let frame: HTMLIFrameElement | null = null
  try {
    frame = document.createElement('iframe')
    frame.style.display = 'none'
    document.documentElement.appendChild(frame)
    const win = frame.contentWindow as (Window & typeof globalThis) | null
    if (!win) return
    const fromFrame = {} as Record<NodeAccessor, Getter>
    for (const name of NODE_ACCESSORS) {
      const getter = getterOf(win.Node.prototype, name)
      if (!getter) return
      fromFrame[name] = getter
    }
    pristine = getters = fromFrame
  } catch {
    pristine = null
  } finally {
    frame?.remove()
  }
}

function read(name: NodeAccessor, n: Node): Node | null {
  const g = getters ?? (getters = prototypeGetters())
  return g ? g[name].call(n) : n[name]
}

export const parentNode = (n: Node) => read('parentNode', n) as ParentNode | null
export const previousSibling = (n: Node) => read('previousSibling', n) as ChildNode | null
export const nextSibling = (n: Node) => read('nextSibling', n) as ChildNode | null
export const firstChild = (n: Node) => read('firstChild', n) as ChildNode | null

/** test-only */
export function __resetUntaintedDom() {
  pristine = null
  getters = null
}
