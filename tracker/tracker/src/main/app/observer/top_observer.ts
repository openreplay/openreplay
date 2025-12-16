import Observer from './observer.js'
import { isElementNode, hasTag } from '../guards.js'

import IFrameObserver from './iframe_observer.js'
import ShadowRootObserver from './shadow_root_observer.js'
import IFrameOffsets, { Offset } from './iframe_offsets.js'

import { CreateDocument } from '../messages.gen.js'
import App from '../index.js'
import { IN_BROWSER, hasOpenreplayAttribute, canAccessIframe } from '../../utils.js'

export enum InlineCssMode {
  Unset = -1,
  /** default behavior -- will parse and cache the css file on backend */
  Disabled = 0,
  /** will attempt to record the linked css file as AdoptedStyleSheet object */
  Inline = 1,
  /** will fetch the file, then simulate AdoptedStyleSheets behavior programmaticaly for the replay */
  InlineFetched = 2,
  /** will fetch the file, then save it as plain css inside <style> node */
  PlainFetched = 3,
}
const localhostStylesDoc = 'https://docs.openreplay.com/en/troubleshooting/localhost/'

function getInlineOptions(mode: InlineCssMode, logger: (args: any) => void) {
  switch (mode) {
    case InlineCssMode.Inline:
      return {
        inlineRemoteCss: true,
        inlinerOptions: {
          forceFetch: false,
          forcePlain: false,
        },
      }
    case InlineCssMode.InlineFetched:
      return {
        inlineRemoteCss: true,
        inlinerOptions: {
          forceFetch: true,
          forcePlain: false,
        },
      }
    case InlineCssMode.PlainFetched:
      return {
        inlineRemoteCss: true,
        inlinerOptions: {
          forceFetch: true,
          forcePlain: true,
        },
      }
    case InlineCssMode.Unset:
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?/.test(
        window.location.href,
      )
      if (isLocalhost) {
        logger(
          `Enabling InlineCssMode.PlainFetched by default on localhost to preserve css styles, refer to ${localhostStylesDoc} for details, set InlineCssMode to 0 to skip this behavior`,
        )
        return {
          inlineRemoteCss: true,
          inlinerOptions: {
            forceFetch: true,
            forcePlain: true,
          },
        }
      } else {
        return {
          inlineRemoteCss: false,
          inlinerOptions: {
            forceFetch: false,
            forcePlain: false,
          },
        }
      }
    case InlineCssMode.Disabled:
    default:
      return {
        inlineRemoteCss: false,
        inlinerOptions: {
          forceFetch: false,
          forcePlain: false,
        },
      }
  }
}

export interface Options {
  captureIFrames: boolean
  disableSprites: boolean
  /**
   * with this option instead of using link element with href to load css,
   * we will try to parse the css text instead and send it as css rules set
   * can (and probably will) affect performance to certain degree,
   * especially if the css itself is crossdomain
   * @default InlineCssMode.None = 0
   * */
  inlineCss: InlineCssMode
  disableThrottling?: boolean
}

type Context = Window & typeof globalThis
type ContextCallback = (context: Context) => void

const attachShadowNativeFn = IN_BROWSER ? Element.prototype.attachShadow : () => new ShadowRoot()

export default class TopObserver extends Observer {
  private readonly options: Options
  private readonly iframeOffsets: IFrameOffsets = new IFrameOffsets()
  readonly app: App

  constructor(params: { app: App; options: Partial<Options> }) {
    const opts = Object.assign(
      {
        captureIFrames: true,
        disableSprites: false,
        inlineCss: 0,
      },
      params.options,
    )
    const observerOptions = {
      disableSprites: opts.disableSprites,
      disableThrottling: opts.disableThrottling,
      ...getInlineOptions(opts.inlineCss, console.warn),
    }
    super(params.app, true, observerOptions)
    this.app = params.app
    this.options = opts
    // IFrames
    this.app.nodes.attachNodeCallback((node) => {
      if (
        hasTag(node, 'iframe') &&
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
  private readonly contextsSet: WeakSet<Window> = new WeakSet()
  attachContextCallback(cb: ContextCallback) {
    this.contextCallbacks.push(cb)
  }

  getDocumentOffset(doc: Document): Offset {
    return this.iframeOffsets.getDocumentOffset(doc)
  }

  private iframeObserversArr: IFrameObserver[] = []
  private iframeObservers: WeakMap<HTMLIFrameElement | Document, IFrameObserver> = new WeakMap()
  private docObservers: WeakMap<Document, IFrameObserver> = new WeakMap()
  private handleIframe(iframe: HTMLIFrameElement): void {
    // setTimeout is required. Otherwise some event listeners (scroll, mousemove) applied in modules
    // do not work on the iframe document when it 've been loaded dynamically ((why?))
    const handle = this.app.safe(() =>
      setTimeout(() => {
        const id = this.app.nodes.getID(iframe)
        if (id === undefined || !canAccessIframe(iframe)) return
        const currentWin = iframe.contentWindow
        const currentDoc = iframe.contentDocument
        if (!currentDoc) {
          this.app.debug.warn('no doc for iframe found', iframe)
          return
        }
        if (currentDoc && this.docObservers.has(currentDoc)) {
          this.app.debug.info('doc already observed for', id)
          return
        }
        const observer = new IFrameObserver(this.app, false, {})
        this.iframeObservers.set(iframe, observer)
        this.docObservers.set(currentDoc, observer)
        this.iframeObserversArr.push(observer)

        observer.observe(iframe)

        this.iframeOffsets.observe(iframe)
        if (
          currentWin &&
          // Sometimes currentWin.window is null (not in specification). Such window object is not functional
          currentWin === currentWin.window &&
          !this.contextsSet.has(currentWin) // for each context callbacks called once per Tracker (TopObserver) instance
          //TODO: more explicit logic
        ) {
          this.contextsSet.add(currentWin)
          // @ts-ignore https://github.com/microsoft/TypeScript/issues/41684
          this.contextCallbacks.forEach((cb) => cb(currentWin))
        }
        // we need this delay because few iframes stacked one in another with rapid updates will break the player (or browser engine rather?)
      }, 250),
    )
    iframe.addEventListener('load', handle)
    handle()
  }

  private shadowRootObservers: WeakMap<ShadowRoot, ShadowRootObserver> = new WeakMap()
  private handleShadowRoot(shRoot: ShadowRoot) {
    const observer = new ShadowRootObserver(this.app)
    this.shadowRootObservers.set(shRoot, observer)
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
    this.app.nodes.clear()
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
        // it has no node_id here
        this.app.nodes.callNodeCallbacks(document, true)
      },
      window.document.documentElement,
    )
  }

  crossdomainObserve(rootNodeId: number, frameOder: number, frameLevel: number) {
    const observer = this
    Element.prototype.attachShadow = function () {
      // eslint-disable-next-line
      const shadow = attachShadowNativeFn.apply(this, arguments)
      observer.handleShadowRoot(shadow)
      return shadow
    }
    this.app.nodes.clear()
    this.app.nodes.crossdomainMode(frameLevel, frameOder)
    const iframeObserver = new IFrameObserver(this.app)
    this.iframeObservers.set(window.document, iframeObserver)
    iframeObserver.syntheticObserve(rootNodeId, window.document)
  }

  disconnect() {
    this.iframeOffsets.clear()
    Element.prototype.attachShadow = attachShadowNativeFn
    this.iframeObserversArr.forEach((observer) => observer.disconnect())
    this.iframeObserversArr = []
    this.iframeObservers = new WeakMap()
    this.shadowRootObservers = new WeakMap()
    this.docObservers = new WeakMap()
    super.disconnect()
  }
}
