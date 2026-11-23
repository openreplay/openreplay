type Context = typeof globalThis
type DocumentRef = { deref(): Document | undefined }

export default class ContextPatches {
  private readonly restorers = new WeakMap<Document, () => void>()
  private readonly documents = new Set<DocumentRef>()

  has(context: Context) {
    return this.restorers.has(context.document)
  }

  set(context: Context, restore: () => void) {
    const document = context.document
    const ref = typeof WeakRef === 'function' ? new WeakRef(document) : { deref: () => document }
    this.documents.forEach((entry) => {
      if (!entry.deref()) this.documents.delete(entry)
    })
    this.documents.add(ref)
    this.restorers.set(document, restore)
    if (typeof WeakRef !== 'function' && context !== window) {
      const unload = () => {
        this.documents.delete(ref)
        this.restore(document)
      }
      context.addEventListener('unload', unload, { once: true })
      this.restorers.set(document, () => {
        context.removeEventListener('unload', unload)
        restore()
      })
    }
  }

  private restore(document: Document) {
    const restore = this.restorers.get(document)
    this.restorers.delete(document)
    try {
      restore?.()
    } catch {
      // A frame can navigate between capture and teardown.
    }
  }

  clear() {
    for (const ref of this.documents) {
      const document = ref.deref()
      if (document) this.restore(document)
    }
    this.documents.clear()
  }
}
