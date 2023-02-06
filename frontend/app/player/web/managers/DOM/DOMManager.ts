import logger from 'App/logger';

import type Screen from '../../Screen/Screen';
import type { Message, SetNodeScroll } from '../../messages';

import { MType } from '../../messages';
import ListWalker from '../../../common/ListWalker';
import StylesManager, { rewriteNodeStyleSheet } from './StylesManager';
import FocusManager from './FocusManager';
import {
  VElement,
  VText,
  VShadowRoot,
  VDocument,
  VNode,
  VStyleElement,
  PostponedStyleSheet,
} from './VirtualDOM';
import type { StyleElement } from './VirtualDOM';
import { insertRule, deleteRule } from './safeCSSRules';


type HTMLElementWithValue = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

const IGNORED_ATTRS = [ "autocomplete" ];
const ATTR_NAME_REGEXP = /([^\t\n\f \/>"'=]+)/; // regexp costs ~


// TODO: filter out non-relevant  prefixes
// function replaceCSSPrefixes(css: string) {
//   return css
//     .replace(/\-ms\-/g, "")
//     .replace(/\-webkit\-/g, "")
//     .replace(/\-moz\-/g, "")
//     .replace(/\-webkit\-/g, "")
// }


export default class DOMManager extends ListWalker<Message> {
  private readonly vTexts: Map<number, VText> = new Map() // map vs object here?
  private readonly vElements: Map<number, VElement> = new Map()
  private readonly vRoots: Map<number, VShadowRoot | VDocument> = new Map()
  private activeIframeRoots: Map<number, number> = new Map()
  private styleSheets: Map<number, CSSStyleSheet> = new Map()
  private ppStyleSheets: Map<number, PostponedStyleSheet> = new Map()
  private stringDict: Record<string,string> = {}


  private upperBodyId: number = -1;
  private nodeScrollManagers: Map<number, ListWalker<SetNodeScroll>> = new Map()
  private stylesManager: StylesManager
  private focusManager: FocusManager = new FocusManager(this.vElements)


  constructor(
    private readonly screen: Screen,
    private readonly isMobile: boolean,
    public readonly time: number,
    setCssLoading: ConstructorParameters<typeof StylesManager>[1],
  ) {
    super()
    this.stylesManager = new StylesManager(screen, setCssLoading)
  }

  append(m: Message): void {
    if (m.tp === MType.SetNodeScroll) {
      let scrollManager = this.nodeScrollManagers.get(m.id)
      if (!scrollManager) {
        scrollManager = new ListWalker()
        this.nodeScrollManagers.set(m.id, scrollManager)
      }
      scrollManager.append(m)
      return
    }
    if (m.tp === MType.SetNodeFocus) {
      this.focusManager.append(m)
      return
    }
    if (m.tp === MType.CreateElementNode) {
      if(m.tag === "BODY" && this.upperBodyId === -1) {
        this.upperBodyId = m.id
      }
    } else if (m.tp === MType.SetNodeAttribute &&
      (IGNORED_ATTRS.includes(m.name) || !ATTR_NAME_REGEXP.test(m.name))) {
      logger.log("Ignorring message: ", m)
      return; // Ignoring
    }
    super.append(m)
  }

  private removeBodyScroll(id: number, vn: VElement): void {
    if (this.isMobile && this.upperBodyId === id) { // Need more type safety!
      (vn.node as HTMLBodyElement).style.overflow = "hidden"
    }
  }

  // May be make it as a message on message add?
  private removeAutocomplete(node: Element): boolean {
    const tag = node.tagName
    if ([ "FORM", "TEXTAREA", "SELECT" ].includes(tag)) {
      node.setAttribute("autocomplete", "off");
      return true;
    }
    if (tag === "INPUT") {
      node.setAttribute("autocomplete", "new-password");
      return true;
    }
    return false;
  }

  private insertNode({ parentID, id, index }: { parentID: number, id: number, index: number }): void {
    const child = this.vElements.get(id) || this.vTexts.get(id)
    if (!child) {
      logger.error("Insert error. Node not found", id);
      return;
    }
    const parent = this.vElements.get(parentID) || this.vRoots.get(parentID)
    if (!parent) {
      logger.error("Insert error. Parent node not found", parentID);
      return;
    }

    const pNode = parent.node
    if ((pNode instanceof HTMLStyleElement) &&  // TODO: correct ordering OR filter in tracker
        pNode.sheet &&
        pNode.sheet.cssRules &&
        pNode.sheet.cssRules.length > 0 &&
        pNode.innerText &&
        pNode.innerText.trim().length === 0
    ) {
      logger.log("Trying to insert child to a style tag with virtual rules: ", parent, child);
      return;
    }

    parent.insertChildAt(child, index)
  }

  private setNodeAttribute(msg: { id: number, name: string, value: string }) {
    let { name, value } = msg;
    const vn = this.vElements.get(msg.id)
    if (!vn) { logger.error("Node not found", msg); return }
    if (vn.node.tagName === "INPUT" && name === "name") {
      // Otherwise binds local autocomplete values (maybe should ignore on the tracker level)
      return
    }
    if (name === "href" && vn.node.tagName === "LINK") {
      // @ts-ignore  ?global ENV type   // It've been done on backend (remove after testing in saas)
      // if (value.startsWith(window.env.ASSETS_HOST || window.location.origin + '/assets')) {
      //   value = value.replace("?", "%3F");
      // }
      if (!value.startsWith("http")) { return }
      // blob:... value happened here. https://foss.openreplay.com/3/session/7013553567419137
      // that resulted in that link being unable to load and having 4sec timeout in the below function.
      this.stylesManager.setStyleHandlers(vn.node as HTMLLinkElement, value);
    }
    if (vn.node.namespaceURI === 'http://www.w3.org/2000/svg' && value.startsWith("url(")) {
      value = "url(#" + (value.split("#")[1] ||")")
    }
    vn.setAttribute(name, value)
    this.removeBodyScroll(msg.id, vn)
  }

  private applyMessage = (msg: Message): Promise<any> | undefined => {
    let node: Node | undefined
    let vn: VNode | undefined
    let doc: Document | null
    let styleSheet: CSSStyleSheet | PostponedStyleSheet | undefined
    switch (msg.tp) {
      case MType.CreateDocument:
        doc = this.screen.document;
        if (!doc) {
          logger.error("No root iframe document found", msg)
          return;
        }
        doc.open();
        doc.write("<!DOCTYPE html><html></html>");
        doc.close();
        const fRoot = doc.documentElement;
        fRoot.innerText = '';

        vn = new VElement(fRoot)
        this.vElements.clear()
        this.vElements.set(0, vn)
        const vDoc = new VDocument(doc)
        vDoc.insertChildAt(vn, 0)
        this.vRoots.clear()
        this.vRoots.set(0, vDoc) // watchout: id==0 for both Document and documentElement
        // this is done for the AdoptedCSS logic
        // todo: start from 0-node (sync logic with tracker)
        this.vTexts.clear()
        this.stylesManager.reset()
        this.activeIframeRoots.clear()
        this.stringDict = {}
        return
      case MType.CreateTextNode:
        vn = new VText()
        this.vTexts.set(msg.id, vn)
        this.insertNode(msg)
        return
      case MType.CreateElementNode:
        let element: Element
        if (msg.svg) {
          element = document.createElementNS('http://www.w3.org/2000/svg', msg.tag)
        } else {
          element = document.createElement(msg.tag)
        }
        if (msg.tag === "STYLE" || msg.tag === "style") {
          vn = new VStyleElement(element as StyleElement)
        } else {
          vn = new VElement(element)
        }
        this.vElements.set(msg.id, vn)
        this.insertNode(msg)
        this.removeBodyScroll(msg.id, vn)
        this.removeAutocomplete(element)
        if (['STYLE', 'style', 'LINK'].includes(msg.tag)) { // Styles in priority
          vn.enforceInsertion()
        }
        return
      case MType.MoveNode:
        this.insertNode(msg);
        return
      case MType.RemoveNode:
        vn = this.vElements.get(msg.id) || this.vTexts.get(msg.id)
        if (!vn) { logger.error("Node not found", msg); return }
        if (!vn.parentNode) { logger.error("Parent node not found", msg); return }
        vn.parentNode.removeChild(vn)
        return
      case MType.SetNodeAttribute:
        this.setNodeAttribute(msg)
        return
      case MType.StringDict:
        this.stringDict[msg.key] = msg.value
        return
      case MType.SetNodeAttributeDict:
        this.stringDict[msg.name] === undefined && logger.error("No dictionary key for msg 'name': ", msg)
        this.stringDict[msg.value] === undefined  && logger.error("No dictionary key for msg 'value': ", msg)
        if (!this.stringDict[msg.name] || !this.stringDict[msg.value]) { return }
        this.setNodeAttribute({ 
          id: msg.id,
          name: this.stringDict[msg.name],
          value: this.stringDict[msg.value],
        })
        return
      case MType.RemoveNodeAttribute:
        vn = this.vElements.get(msg.id)
        if (!vn) { logger.error("Node not found", msg); return }
        vn.removeAttribute(msg.name)
        return
      case MType.SetInputValue:
        vn = this.vElements.get(msg.id)
        if (!vn) { logger.error("Node not found", msg); return }
        const nodeWithValue = vn.node
        if (!(nodeWithValue instanceof HTMLInputElement
            || nodeWithValue instanceof HTMLTextAreaElement
            || nodeWithValue instanceof HTMLSelectElement)
        ) {
          logger.error("Trying to set value of non-Input element", msg)
          return
        }
        const val = msg.mask > 0 ? '*'.repeat(msg.mask) : msg.value
        doc = this.screen.document
        if (doc && nodeWithValue === doc.activeElement) {
          // For the case of Remote Control
          nodeWithValue.onblur = () => { nodeWithValue.value = val }
          return
        }
        nodeWithValue.value = val
        return
      case MType.SetInputChecked:
        vn = this.vElements.get(msg.id)
        if (!vn) { logger.error("Node not found", msg); return }
        (vn.node as HTMLInputElement).checked = msg.checked
        return
      case MType.SetNodeData:
      case MType.SetCssData: // mbtodo: remove  css transitions when timeflow is not natural (on jumps)
        vn = this.vTexts.get(msg.id)
        if (!vn) { logger.error("Node not found", msg); return }
        vn.setData(msg.data)
        if (vn.node instanceof HTMLStyleElement) {
          doc = this.screen.document
          // TODO: move to message parsing
          doc && rewriteNodeStyleSheet(doc, vn.node)
        }
        if (msg.tp === MType.SetCssData) { // Styles in priority  (do we need inlines as well?)
          vn.applyChanges()
        }
        return

      // @depricated since 4.0.2 in favor of adopted_ss_insert/delete_rule + add_owner as being common case for StyleSheets
      case MType.CssInsertRule:
        vn = this.vElements.get(msg.id)
        if (!vn) { logger.error("Node not found", msg); return }
        if (!(vn instanceof VStyleElement)) {
          logger.warn("Non-style node in CSS rules message (or sheet is null)", msg, vn);
          return
        }
        vn.onStyleSheet(sheet => insertRule(sheet, msg))
        return
      case MType.CssDeleteRule:
        vn = this.vElements.get(msg.id)
        if (!vn) { logger.error("Node not found", msg); return }
        if (!(vn instanceof VStyleElement)) {
          logger.warn("Non-style node in CSS rules message (or sheet is null)", msg, vn);
          return
        }
        vn.onStyleSheet(sheet => deleteRule(sheet, msg))
        return
      // end @depricated

      case MType.CreateIFrameDocument:
        vn = this.vElements.get(msg.frameID)
        if (!vn) { logger.error("Node not found", msg); return }
        vn.enforceInsertion()
        const host = vn.node
        if (host instanceof HTMLIFrameElement) {
          const doc = host.contentDocument
          if (!doc) {
            logger.warn("No default iframe doc", msg, host)
            return
          }
          // remove old root of the same iframe if present
          const oldRootId = this.activeIframeRoots.get(msg.frameID)
          oldRootId != null && this.vRoots.delete(oldRootId)

          const vDoc = new VDocument(doc)
          this.activeIframeRoots.set(msg.frameID, msg.id)
          this.vRoots.set(msg.id, vDoc)
          return;
        } else if (host instanceof Element) { // shadow DOM
          try {
            const shadowRoot = host.attachShadow({ mode: 'open' })
            vn = new VShadowRoot(shadowRoot)
            this.vRoots.set(msg.id, vn)
          } catch(e) {
            logger.warn("Can not attach shadow dom", e, msg)
          }
        } else {
          logger.warn("Context message host is not Element", msg)
        }
        return
      case MType.AdoptedSsInsertRule:
        styleSheet = this.styleSheets.get(msg.sheetID) || this.ppStyleSheets.get(msg.sheetID)
        if (!styleSheet) {
          logger.warn("No stylesheet was created for ", msg)
          return
        }
        insertRule(styleSheet, msg)
        return
      case MType.AdoptedSsDeleteRule:
        styleSheet = this.styleSheets.get(msg.sheetID) || this.ppStyleSheets.get(msg.sheetID)
        if (!styleSheet) {
          logger.warn("No stylesheet was created for ", msg)
          return
        }
        deleteRule(styleSheet, msg)
        return

      case MType.AdoptedSsReplace:
        styleSheet = this.styleSheets.get(msg.sheetID)
        if (!styleSheet) {
          logger.warn("No stylesheet was created for ", msg)
          return
        }
        // @ts-ignore
        styleSheet.replaceSync(msg.text)
        return
      case MType.AdoptedSsAddOwner:
        vn = this.vRoots.get(msg.id)
        if (!vn) {
          // non-constructed case
          vn = this.vElements.get(msg.id)
          if (!vn) { logger.error("Node not found", msg); return }
          if (!(vn instanceof VStyleElement)) { logger.error("Non-style owner", msg); return }
          this.ppStyleSheets.set(msg.sheetID, new PostponedStyleSheet(vn.node))
          return
        }
        styleSheet = this.styleSheets.get(msg.sheetID)
        if (!styleSheet) {
          let context: typeof globalThis
          const rootNode = vn.node
          if (rootNode.nodeType === Node.DOCUMENT_NODE) {
            context = (rootNode as Document).defaultView
          } else {
            context = (rootNode as ShadowRoot).ownerDocument.defaultView
          }
          styleSheet = new context.CSSStyleSheet()
          this.styleSheets.set(msg.sheetID, styleSheet)
        }
        //@ts-ignore
        vn.node.adoptedStyleSheets = [...vn.node.adoptedStyleSheets, styleSheet]
        return
      case MType.AdoptedSsRemoveOwner:
        styleSheet = this.styleSheets.get(msg.sheetID)
        if (!styleSheet) {
          logger.warn("No stylesheet was created for ", msg)
          return
        }
        vn = this.vRoots.get(msg.id)
        if (!vn) { logger.error("Node not found", msg); return }
        //@ts-ignore
        vn.node.adoptedStyleSheets = [...vn.node.adoptedStyleSheets].filter(s => s !== styleSheet)
        return
      case MType.LoadFontFace:
        vn = this.vRoots.get(msg.parentID)
        if (!vn) { logger.error("Node not found", msg); return }
        if (vn instanceof VShadowRoot) { logger.error(`Node ${vn} expected to be a Document`, msg); return }
        let descr: Object
        try {
          descr = JSON.parse(msg.descriptors)
          descr = typeof descr === 'object' ? descr : undefined
        } catch {
          logger.warn("Can't parse font-face descriptors: ", msg)
        }
        const ff = new FontFace(msg.family, msg.source, descr)
        vn.node.fonts.add(ff)
        return ff.load()
    }
  }

  async moveReady(t: number): Promise<void> {
    // MBTODO (back jump optimisation):
    //    - store intemediate virtual dom state
    //    - cancel previous moveReady tasks (is it possible?) if new timestamp is less
    // This function autoresets pointer if necessary (better name?)
   
    await this.moveWait(t, this.applyMessage)
    this.vRoots.forEach(rt => rt.applyChanges()) // MBTODO (optimisation): affected set

    // Thinkabout (read): css preload
    // What if we go back before it is ready? We'll have two handlres?
    return this.stylesManager.moveReady(t).then(() => {
      // Apply focus
      this.focusManager.move(t)
      // Apply all scrolls after the styles got applied
      this.nodeScrollManagers.forEach(manager => {
        const msg = manager.moveGetLast(t)
        if (msg) {
          let vNode: VNode
          if (vNode = this.vElements.get(msg.id)) {
            vNode.node.scrollLeft = msg.x
            vNode.node.scrollTop = msg.y
          } else if ((vNode = this.vRoots.get(msg.id)) && vNode instanceof VDocument){
            vNode.node.defaultView?.scrollTo(msg.x, msg.y)
          }
        }
      })
    })
  }
}
