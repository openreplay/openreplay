import Observer from "./observer.js";
import { isInstance }  from "../context.js";
import type { Window } from "../context.js";
import IFrameObserver from "./iframe_observer.js";
import ShadowRootObserver from "./shadow_root_observer.js";

import { CreateDocument } from "../../../messages/index.js";
import App from "../index.js";
import { IN_BROWSER, hasOpenreplayAttribute } from '../../utils.js'

export interface Options {
  captureIFrames: boolean
}

const attachShadowNativeFn = IN_BROWSER ? Element.prototype.attachShadow : ()=>new ShadowRoot();

export default class TopObserver extends Observer { 
  private readonly options: Options;
  constructor(app: App, options: Partial<Options>) {
    super(app, true);
    this.options = Object.assign({
      captureIFrames: true
    }, options);

    // IFrames
    this.app.nodes.attachNodeCallback(node => {
      if (isInstance(node, HTMLIFrameElement) && 
         ((this.options.captureIFrames && !hasOpenreplayAttribute(node, "obscured")) 
           || hasOpenreplayAttribute(node, "capture"))
      ) {
        this.handleIframe(node)
      }
    })

    // ShadowDOM
    this.app.nodes.attachNodeCallback(node => {
      if (isInstance(node, Element) && node.shadowRoot !== null) {
        this.handleShadowRoot(node.shadowRoot)
      }
    })
  }


  private iframeObservers: IFrameObserver[] = [];
  private handleIframe(iframe: HTMLIFrameElement): void {
    let doc: Document | null = null
    const handle = this.app.safe(() => {
      const id = this.app.nodes.getID(iframe)
      if (id === undefined) { return } //log
      if (iframe.contentDocument === doc) { return } // How frequently can it happen?
      doc = iframe.contentDocument
      if (!doc || !iframe.contentWindow) { return }
      const observer = new IFrameObserver(this.app)

      this.iframeObservers.push(observer)
      observer.observe(iframe)
    })
    iframe.addEventListener("load", handle) // why app.attachEventListener not working?
    handle()
  }

  private shadowRootObservers: ShadowRootObserver[] = []
  private handleShadowRoot(shRoot: ShadowRoot) {
    const observer = new ShadowRootObserver(this.app)
    this.shadowRootObservers.push(observer)
    observer.observe(shRoot.host)
  }

  observe(): void {
    // Protection from several subsequent calls?
    const observer = this;
    Element.prototype.attachShadow = function() {
      const shadow = attachShadowNativeFn.apply(this, arguments)
      observer.handleShadowRoot(shadow)
      return shadow
    }

    // Can observe documentElement (<html>) here, because it is not supposed to be changing.
    // However, it is possible in some exotic cases and may cause an ignorance of the newly created <html>
    // In this case context.document have to be observed, but this will cause 
    // the change in the re-player behaviour caused by CreateDocument message: 
    //   the 0-node ("fRoot") will become #document rather than documentElement as it is now.
    // Alternatively - observe(#document) then bindNode(documentElement)
    this.observeRoot(window.document, () => {
      this.app.send(new CreateDocument())
    }, window.document.documentElement);
  }

  disconnect() {
    Element.prototype.attachShadow = attachShadowNativeFn
    this.iframeObservers.forEach(o => o.disconnect())
    this.iframeObservers = []
    this.shadowRootObservers.forEach(o => o.disconnect())
    this.shadowRootObservers = []
    super.disconnect()
  }

}