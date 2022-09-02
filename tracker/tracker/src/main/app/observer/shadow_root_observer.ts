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
        console.log('OpenReplay: Shadow Root was not bound')
        return
      }
      this.app.send(CreateIFrameDocument(hostID, rootID))
    })
  }
}
