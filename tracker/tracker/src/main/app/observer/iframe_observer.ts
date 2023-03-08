import Observer from './observer.js'
import { CreateIFrameDocument } from '../messages.gen.js'
import Network from '../../modules/network.js'

export default class IFrameObserver extends Observer {
  observe(iframe: HTMLIFrameElement) {
    const doc = iframe.contentDocument
    const iWindow = iframe.contentWindow
    const hostID = this.app.nodes.getID(iframe)
    console.log(iframe)
    if (!doc || hostID === undefined) {
      return
    } //log TODO common app.logger
    // Have to observe document, because the inner <html> might be changed
    this.observeRoot(doc, (docID) => {
      //MBTODO: do not send if empty (send on load? it might be in-place iframe, like our replayer, which does not get loaded)
      if (docID === undefined) {
        console.log('OpenReplay: Iframe document not bound')
        return
      }
      this.app.send(CreateIFrameDocument(hostID, docID))
      Network(this.app, this.app.networkOptions, iWindow!)
    })
  }
}
