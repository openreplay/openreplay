import Observer from './observer.js';
import { CreateIFrameDocument } from '../../../common/messages.js';

export default class IFrameObserver extends Observer {
  observe(iframe: HTMLIFrameElement) {
    const doc = iframe.contentDocument;
    const hostID = this.app.nodes.getID(iframe);
    if (!doc || hostID === undefined) {
      return;
    } //log TODO common app.logger
    // Have to observe document, because the inner <html> might be changed
    this.observeRoot(doc, (docID) => {
      if (docID === undefined) {
        console.log('OpenReplay: Iframe document not bound');
        return;
      }
      this.app.send(CreateIFrameDocument(hostID, docID));
    });
  }
}
