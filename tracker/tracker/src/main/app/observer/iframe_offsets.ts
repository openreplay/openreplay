// Le truc - for defining an absolute offset for (nested) iframe documents. (To track mouse movments)

export type Offset = [/*left:*/ number, /*top: */ number]

type OffsetState = {
  offset: Offset | null
  parent: OffsetState | null
  iFrame: HTMLIFrameElement
  clear: () => void
}

export default class IFrameOffsets {
  private readonly states: Map<Document, OffsetState> = new Map()

  private calcOffset(state: OffsetState): Offset {
    let parLeft = 0,
      parTop = 0
    if (state.parent) {
      ;[parLeft, parTop] = this.calcOffset(state.parent)
    }
    if (!state.offset) {
      const { left, top } = state.iFrame.getBoundingClientRect()
      state.offset = [left, top]
    }
    const [left, top] = state.offset
    return [parLeft + left, parTop + top] // TODO: store absolute sum, invalidate whole subtree. Otherwise it is summated on each mousemove
  }

  getDocumentOffset(doc: Document): Offset {
    const state = this.states.get(doc)
    if (!state) {
      return [0, 0]
    } // topmost doc
    return this.calcOffset(state)
  }

  observe(iFrame: HTMLIFrameElement): void {
    const doc = iFrame.contentDocument
    if (!doc) {
      return
    }
    const parentDoc = iFrame.ownerDocument
    const parentState = this.states.get(parentDoc)
    const state = {
      offset: null, // lazy calc
      iFrame,
      parent: parentState || null, // null when parentDoc is the topmost document
      clear: () => {
        parentDoc.removeEventListener('scroll', invalidateOffset)
        parentDoc.defaultView?.removeEventListener('resize', invalidateOffset)
      },
    }
    const invalidateOffset = () => {
      state.offset = null
    }

    // anything more reliable? This does not cover all cases (layout changes are ignored, for ex.)
    parentDoc.addEventListener('scroll', invalidateOffset)
    parentDoc.defaultView?.addEventListener('resize', invalidateOffset)

    this.states.set(doc, state)
  }

  clear() {
    this.states.forEach((s) => s.clear())
    this.states.clear()
  }
}
