import Observer from './observer.js'
import { CreateIFrameDocument, RemoveNode } from '../messages.gen.js'

export default class IFrameObserver extends Observer {
  docId: number | undefined
  observe(iframe: HTMLIFrameElement) {
    const doc = iframe.contentDocument
    const hostID = this.app.nodes.getID(iframe)
    if (!doc || hostID === undefined) {
      return
    }
    // Have to observe document, because the inner <html> might be changed
    this.observeRoot(doc, (docID) => {
      //MBTODO: do not send if empty (send on load? it might be in-place iframe, like our replayer, which does not get loaded)
      if (docID === undefined) {
        this.app.debug.log('OpenReplay: Iframe document not bound')
        return
      }
      this.docId = docID
      this.app.send(CreateIFrameDocument(hostID, docID))
    })
  }

  syntheticObserve(rootNodeId: number, doc: Document) {
    this.observeRoot(doc, (docID) => {
      if (docID === undefined) {
        this.app.debug.log('OpenReplay: Iframe document not bound')
        return
      }
      this.app.send(CreateIFrameDocument(rootNodeId, docID))
    })
  }
}
