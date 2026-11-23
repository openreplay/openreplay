import Observer from './observer.js'
import { CreateIFrameDocument } from '../messages.gen.js'

export default class ShadowRootObserver extends Observer {
  observe(el: Element) {
    const shRoot = el.shadowRoot
    const hostID = this.app.nodes.getID(el)
    if (!shRoot || hostID === undefined) {
      return
    } // log
    if (this.app.nodes.isBound(shRoot)) {
      // re-inserted host: a new node with an empty shadow root in the replay, so drop the old ids
      // and send the content again
      this.app.nodes.unregisterNode(shRoot)
      const walker = document.createTreeWalker(shRoot, NodeFilter.SHOW_ELEMENT + NodeFilter.SHOW_TEXT)
      while (walker.nextNode()) {
        this.app.nodes.unregisterNode(walker.currentNode)
      }
    }
    this.observeRoot(shRoot, (rootID) => {
      if (rootID === undefined) {
        this.app.debug.error('OpenReplay: Shadow Root was not bound')
        return
      }
      // the shadow root inherits the host's level (masked host or ancestor, domSanitizer)
      this.app.sanitizer.setLevel(rootID, this.app.sanitizer.getLevel(hostID))
      this.app.send(CreateIFrameDocument(hostID, rootID))
    })
  }
}
