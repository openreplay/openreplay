import Observer from './observer.js'
import { CreateIFrameDocument } from '../messages.gen.js'

export default class ShadowRootObserver extends Observer {
  observe(el: Element) {
    const shRoot = el.shadowRoot
    const hostID = this.app.nodes.getID(el)
    if (!shRoot || hostID === undefined) {
      return
    } // log
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
