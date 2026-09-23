/**
 * Native DOM accessors, immune to pages that override Node.prototype getters
 * (MooTools, Prototype.js, some polyfills and framework shims).
 *
 * If the page prototypes are native we read properties directly (no overhead);
 * otherwise the getters are taken from a pristine prototype of a throwaway iframe.
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

/**
 * Must be called before observation starts: the helper iframe is inserted and removed
 * synchronously, so our own MutationObserver never sees it.
 * */
export function initUntaintedDom(): void {
  if (pristine || typeof document === 'undefined' || !document.documentElement || !isTainted()) {
    return
  }
  let frame: HTMLIFrameElement | null = null
  try {
    frame = document.createElement('iframe')
    frame.style.display = 'none'
    document.documentElement.appendChild(frame)
    const win = frame.contentWindow as (Window & typeof globalThis) | null
    if (!win) return
    const getters = {} as Record<NodeAccessor, Getter>
    for (const name of NODE_ACCESSORS) {
      const getter = getterOf(win.Node.prototype, name)
      if (!getter) return
      getters[name] = getter
    }
    pristine = getters
  } catch {
    pristine = null
  } finally {
    frame?.remove()
  }
}

export const parentNode = (n: Node): ParentNode | null =>
  pristine ? (pristine.parentNode.call(n) as ParentNode | null) : n.parentNode
export const previousSibling = (n: Node): ChildNode | null =>
  pristine ? (pristine.previousSibling.call(n) as ChildNode | null) : n.previousSibling
export const nextSibling = (n: Node): ChildNode | null =>
  pristine ? (pristine.nextSibling.call(n) as ChildNode | null) : n.nextSibling
export const firstChild = (n: Node): ChildNode | null =>
  pristine ? (pristine.firstChild.call(n) as ChildNode | null) : n.firstChild

/** test-only */
export function __resetUntaintedDom() {
  pristine = null
}
