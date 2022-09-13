import Observer from './observer.js'
import { isElementNode, hasTag } from '../guards.js'

import IFrameObserver from './iframe_observer.js'
import ShadowRootObserver from './shadow_root_observer.js'
import IFrameOffsets, { Offset } from './iframe_offsets.js'

import { CreateDocument } from '../messages.gen.js'
import App from '../index.js'
import { IN_BROWSER, hasOpenreplayAttribute } from '../../utils.js'

export interface Options {
  captureIFrames: boolean
}

type Context = Window & typeof globalThis
type ContextCallback = (context: Context) => void

const attachShadowNativeFn = IN_BROWSER ? Element.prototype.attachShadow : () => new ShadowRoot()

export default class TopObserver extends Observer {
  private readonly options: Options
  private readonly iframeOffsets: IFrameOffsets = new IFrameOffsets()

  constructor(app: App, options: Partial<Options>) {
    super(app, true)
    this.options = Object.assign(
      {
        captureIFrames: true,
      },
      options,
    )

    // IFrames
    this.app.nodes.attachNodeCallback((node) => {
      if (
        hasTag(node, 'IFRAME') &&
        ((this.options.captureIFrames && !hasOpenreplayAttribute(node, 'obscured')) ||
          hasOpenreplayAttribute(node, 'capture'))
      ) {
        this.handleIframe(node)
      }
    })

    // ShadowDOM
    this.app.nodes.attachNodeCallback((node) => {
      if (isElementNode(node) && node.shadowRoot !== null) {
        this.handleShadowRoot(node.shadowRoot)
      }
    })
  }

  private readonly contextCallbacks: Array<ContextCallback> = []

  // Attached once per Tracker instance
  private readonly contextsSet: Set<Window> = new Set()
  attachContextCallback(cb: ContextCallback) {
    this.contextCallbacks.push(cb)
  }

  getDocumentOffset(doc: Document): Offset {
    return this.iframeOffsets.getDocumentOffset(doc)
  }

  private iframeObservers: IFrameObserver[] = []
  private handleIframe(iframe: HTMLIFrameElement): void {
    let doc: Document | null = null
    // setTimeout is required. Otherwise some event listeners (scroll, mousemove) applied in modules
    //     do not work on the iframe document when it 've been loaded dynamically ((why?))
    const handle = this.app.safe(() =>
      setTimeout(() => {
        const id = this.app.nodes.getID(iframe)
        if (id === undefined) {
          //log
          return
        }
        const currentWin = iframe.contentWindow
        const currentDoc = iframe.contentDocument
        if (currentDoc && currentDoc !== doc) {
          const observer = new IFrameObserver(this.app)
          this.iframeObservers.push(observer)
          observer.observe(iframe) // TODO: call unregisterNode for the previous doc if present (incapsulate: one iframe - one observer)
          doc = currentDoc

          this.iframeOffsets.observe(iframe)
        }
        if (
          currentWin &&
          // Sometimes currentWin.window is null (not in specification). Such window object is not functional
          currentWin === currentWin.window &&
          !this.contextsSet.has(currentWin) // for each context callbacks called once per Tracker (TopObserver) instance
          //TODO: more explicit logic
        ) {
          this.contextsSet.add(currentWin)
          //@ts-ignore https://github.com/microsoft/TypeScript/issues/41684
          this.contextCallbacks.forEach((cb) => cb(currentWin))
        }
      }, 0),
    )
    iframe.addEventListener('load', handle) // why app.attachEventListener not working?
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

    const observer = this
    Element.prototype.attachShadow = function () {
      // eslint-disable-next-line
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
    this.observeRoot(
      window.document,
      () => {
        this.app.send(CreateDocument())
      },
      window.document.documentElement,
    )
  }

  disconnect() {
    this.iframeOffsets.clear()
    Element.prototype.attachShadow = attachShadowNativeFn
    this.iframeObservers.forEach((o) => o.disconnect())
    this.iframeObservers = []
    this.shadowRootObservers.forEach((o) => o.disconnect())
    this.shadowRootObservers = []
    super.disconnect()
  }
}
