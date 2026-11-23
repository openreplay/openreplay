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
        this.restorers.delete(document)
      }
      context.addEventListener('unload', unload, { once: true })
      this.restorers.set(document, () => {
        context.removeEventListener('unload', unload)
        restore()
      })
    }
  }

  clear() {
    for (const ref of this.documents) {
      const document = ref.deref()
      if (!document) continue
      try {
        this.restorers.get(document)?.()
      } catch {
        // A frame can navigate between capture and teardown.
      } finally {
        this.restorers.delete(document)
      }
    }
    this.documents.clear()
  }
}
