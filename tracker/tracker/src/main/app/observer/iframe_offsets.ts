export type Offset = [/*left:*/ number, /*top: */ number]

interface OffsetState {
  iframe: HTMLIFrameElement
  parent: Document
  offset: Offset | null
  gen: number
}

/**
 * Iframe offsets for mouse coordinates, cached until the parent document scrolls or
 * resizes. One listener per parent document (not per iframe), and state keyed by the
 * frame's document only, so removed iframes and their documents can be collected.
 * Listeners are kept as weak refs with one shared handler, so a parent document of a
 * removed or navigated frame isn't retained either.
 */
export default class IFrameOffsets {
  private states = new WeakMap<Document, OffsetState>()
  private gens = new WeakMap<Document, number>()
  private listeners: Array<{ ref: { deref(): EventTarget | undefined }; type: string }> = []
  private listening = new WeakSet<Document>()

  private bump = (e: Event) => {
    const t = e.currentTarget as Document | Window
    const doc = 'nodeType' in t ? t : t.document
    this.gens.set(doc, (this.gens.get(doc) ?? 0) + 1)
  }

  private listen(target: EventTarget, type: string) {
    target.addEventListener(type, this.bump)
    if (typeof WeakRef === 'function') {
      this.listeners = this.listeners.filter((l) => l.ref.deref() !== undefined)
      this.listeners.push({ ref: new WeakRef(target), type })
    } else if (target === document || target === window) {
      this.listeners.push({ ref: { deref: () => target }, type })
    }
    // no WeakRef: a frame keeps its listener (it only bumps a counter) rather than being retained
  }

  observe(iframe: HTMLIFrameElement) {
    const doc = iframe.contentDocument
    if (!doc) return
    const parent = iframe.ownerDocument
    this.states.set(doc, { iframe, parent, offset: null, gen: -1 })
    if (this.listening.has(parent)) return
    this.listening.add(parent)
    this.listen(parent, 'scroll')
    const win = parent.defaultView
    if (win) this.listen(win, 'resize')
  }

  getDocumentOffset(doc: Document): Offset {
    const state = this.states.get(doc)
    if (!state) return [0, 0]
    const [parentLeft, parentTop] = this.getDocumentOffset(state.parent)
    const gen = this.gens.get(state.parent) ?? 0
    if (state.offset === null || state.gen !== gen) {
      const { left, top } = state.iframe.getBoundingClientRect()
      state.offset = [left, top]
      state.gen = gen
    }
    return [parentLeft + state.offset[0], parentTop + state.offset[1]]
  }

  clear() {
    for (const l of this.listeners) l.ref.deref()?.removeEventListener(l.type, this.bump)
    this.listeners = []
    this.states = new WeakMap()
    this.gens = new WeakMap()
    this.listening = new WeakSet()
  }
}
