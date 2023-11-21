import logger from 'App/logger';

import type Screen from '../../Screen/Screen';
import type { Message, SetNodeScroll } from '../../messages';
import { MType } from '../../messages';
import ListWalker from '../../../common/ListWalker';
import StylesManager from './StylesManager';
import FocusManager from './FocusManager';
import SelectionManager from './SelectionManager';
import type { StyleElement } from './VirtualDOM';
import {
  OnloadStyleSheet,
  VDocument,
  VElement,
  VHTMLElement,
  VShadowRoot,
  VText,
  OnloadVRoot,
} from './VirtualDOM';
import { deleteRule, insertRule } from './safeCSSRules';


function isStyleVElement(vElem: VElement): vElem is VElement & { node: StyleElement } {
  return vElem.tagName.toLowerCase() === "style"
}

const IGNORED_ATTRS = [ "autocomplete" ]
const ATTR_NAME_REGEXP = /([^\t\n\f \/>"'=]+)/

export default class DOMManager extends ListWalker<Message> {
  private readonly vTexts: Map<number, VText> = new Map() // map vs object here?
  private readonly vElements: Map<number, VElement> = new Map()
  private readonly olVRoots: Map<number, OnloadVRoot> = new Map()
  /** Constructed StyleSheets https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptedStyleSheets
   * as well as <style> tag owned StyleSheets
   */
  private olStyleSheets: Map<number, OnloadStyleSheet> = new Map()
  /** @depreacted since tracker 4.0.2 Mapping by nodeID */
  private olStyleSheetsDeprecated: Map<number, OnloadStyleSheet> = new Map()

  private upperBodyId: number = -1;
  private nodeScrollManagers: Map<number, ListWalker<SetNodeScroll>> = new Map()
  private stylesManager: StylesManager
  private focusManager: FocusManager = new FocusManager(this.vElements)
  private selectionManager: SelectionManager

  constructor(
    private readonly screen: Screen,
    private readonly isMobile: boolean,
    private stringDict: Record<number,string>,
    public readonly time: number,
    setCssLoading: ConstructorParameters<typeof StylesManager>[1],
  ) {
    super()
    this.selectionManager = new SelectionManager(this.vElements, screen)
    this.stylesManager = new StylesManager(screen, setCssLoading)
  }

  setStringDict(stringDict: Record<number,string>) {
    this.stringDict = stringDict
  }

  public clearSelectionManager() {
    this.selectionManager.clearSelection()
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
    if (m.tp === MType.SelectionChange) {
      this.selectionManager.append(m)
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

  private removeBodyScroll(id: number, vElem: VElement): void {
    if (this.isMobile && this.upperBodyId === id) { // Need more type safety!
      (vElem.node as HTMLBodyElement).style.overflow = "hidden"
    }
  }

  private removeAutocomplete(vElem: VElement): boolean {
    const tag = vElem.tagName
    if ([ "FORM", "TEXTAREA", "SELECT" ].includes(tag)) {
      vElem.setAttribute("autocomplete", "off");
      return true;
    }
    if (tag === "INPUT") {
      vElem.setAttribute("autocomplete", "new-password");
      return true;
    }
    return false;
  }

  public getNode(id: number) {
    return this.vElements.get(id) || this.vTexts.get(id)
  }

  private insertNode({ parentID, id, index }: { parentID: number, id: number, index: number }): void {
    const child = this.vElements.get(id) || this.vTexts.get(id)
    if (!child) {
      logger.error("Insert error. Node not found", id);
      return;
    }
    const parent = this.vElements.get(parentID) || this.olVRoots.get(parentID)
    if (!parent) {
      logger.error("Insert error. Parent vNode not found", parentID, this.vElements, this.olVRoots);
      return;
    }

    if (parent instanceof VElement && isStyleVElement(parent)) {
      // TODO: if this ever happens? ; Maybe do not send empty TextNodes in tracker
      const styleNode = parent.node
      if (styleNode.sheet &&
        styleNode.sheet.cssRules &&
        styleNode.sheet.cssRules.length > 0 &&
        styleNode.textContent &&
        styleNode.textContent.trim().length === 0
      ) {
        logger.log("Trying to insert child to a style tag with virtual rules: ", parent, child);
        return;
      }
    }

    parent.insertChildAt(child, index)
  }

  private setNodeAttribute(msg: { id: number, name: string, value: string }) {
    let { name, value } = msg;
    const vn = this.vElements.get(msg.id)
    if (!vn) { logger.error("SetNodeAttribute: Node not found", msg); return }

    if (vn.tagName === "INPUT" && name === "name") {
      // Otherwise binds local autocomplete values (maybe should ignore on the tracker level?)
      return
    }
    if (name === "href" && vn.tagName === "LINK") {
      // @ts-ignore  ?global ENV type   // It've been done on backend (remove after testing in saas)
      // if (value.startsWith(window.env.ASSETS_HOST || window.location.origin + '/assets')) {
      //   value = value.replace("?", "%3F");
      // }
      if (!value.startsWith("http")) {
        /* blob:... value can happen here for some reason.
         * which will result in that link being unable to load and having 4sec timeout in the below function.
         */
        return
      }

      // TODOTODO: check if node actually exists on the page, not just in memory
      this.stylesManager.setStyleHandlers(vn.node as HTMLLinkElement, value);
    }
    if (vn.isSVG && value.startsWith("url(")) {
      /* SVG shape ID-s for masks etc. Sometimes referred with the full-page url, which we don't have in replay */
      value = "url(#" + (value.split("#")[1] ||")")
    }
    vn.setAttribute(name, value)
    this.removeBodyScroll(msg.id, vn)
  }

  private applyMessage = (msg: Message): Promise<any> | undefined => {
    switch (msg.tp) {
      case MType.CreateDocument: {
        const doc = this.screen.document;
        if (!doc) {
          logger.error("No root iframe document found", msg, this.screen)
          return;
        }
        doc.open();
        doc.write("<!DOCTYPE html><html></html>");
        doc.close();
        const fRoot = doc.documentElement;
        fRoot.innerText = '';

        const vHTMLElement = new VHTMLElement(fRoot)
        this.vElements.clear()
        this.vElements.set(0, vHTMLElement)
        const vDoc = OnloadVRoot.fromDocumentNode(doc)
        vDoc.insertChildAt(vHTMLElement, 0)
        this.olVRoots.clear()
        this.olVRoots.set(0, vDoc) // watchout: id==0 for both Document and documentElement
        // this is done for the AdoptedCSS logic
        // Maybetodo: start Document as 0-node in tracker
        this.vTexts.clear()
        this.stylesManager.reset()
        return
      }
      case MType.CreateTextNode: {
        const vText = new VText()
        this.vTexts.set(msg.id, vText)
        this.insertNode(msg)
        return
      }
      case MType.CreateElementNode: {
        // if (msg.tag.toLowerCase() === 'canvas') msg.tag = 'video'
        const vElem = new VElement(msg.tag, msg.svg, msg.index)
        if (['STYLE', 'style', 'LINK'].includes(msg.tag)) {
          vElem.prioritized = true
        }
        this.vElements.set(msg.id, vElem)
        this.insertNode(msg)
        this.removeBodyScroll(msg.id, vElem)
        this.removeAutocomplete(vElem)
        return
      }
      case MType.MoveNode:
        this.insertNode(msg)
        return
      case MType.RemoveNode: {
        const vChild = this.vElements.get(msg.id) || this.vTexts.get(msg.id)
        if (!vChild) { logger.error("RemoveNode: Node not found", msg); return }
        if (!vChild.parentNode) { logger.error("RemoveNode: Parent node not found", msg); return }
        vChild.parentNode.removeChild(vChild)
        this.vElements.delete(msg.id)
        this.vTexts.delete(msg.id)
        return
      }
      case MType.SetNodeAttribute:
        this.setNodeAttribute(msg)
        return
      case MType.SetNodeAttributeDict:
        this.stringDict[msg.nameKey] === undefined && logger.error("No dictionary key for msg 'name': ", msg, this.stringDict)
        this.stringDict[msg.valueKey] === undefined && logger.error("No dictionary key for msg 'value': ", msg, this.stringDict)
        if (this.stringDict[msg.nameKey] === undefined || this.stringDict[msg.valueKey] === undefined ) { return }
        this.setNodeAttribute({
          id: msg.id,
          name: this.stringDict[msg.nameKey],
          value: this.stringDict[msg.valueKey],
        })
        return
      case MType.RemoveNodeAttribute: {
        const vElem = this.vElements.get(msg.id)
        if (!vElem) { logger.error("RemoveNodeAttribute: Node not found", msg); return }
        vElem.removeAttribute(msg.name)
        return
      }
      case MType.SetInputValue: {
        const vElem = this.vElements.get(msg.id)
        if (!vElem) { logger.error("SetInoputValue: Node not found", msg); return }
        const nodeWithValue = vElem.node
        if (!(nodeWithValue instanceof HTMLInputElement
            || nodeWithValue instanceof HTMLTextAreaElement
            || nodeWithValue instanceof HTMLSelectElement)
        ) {
          logger.error("Trying to set value of non-Input element", msg)
          return
        }
        const val = msg.mask > 0 ? '*'.repeat(msg.mask) : msg.value
        const doc = this.screen.document
        if (doc && nodeWithValue === doc.activeElement) {
          // For the case of Remote Control
          nodeWithValue.onblur = () => { nodeWithValue.value = val }
          return
        }
        nodeWithValue.value = val // Maybe make special VInputValueElement type for lazy value update
        return
      }
      case MType.SetInputChecked: {
        const vElem = this.vElements.get(msg.id)
        if (!vElem) { logger.error("SetInputChecked: Node not found", msg); return }
        (vElem.node as HTMLInputElement).checked = msg.checked // Maybe make special VCheckableElement type for lazy checking
        return
      }
      case MType.SetNodeData:
      case MType.SetCssData: {
        const vText = this.vTexts.get(msg.id)
        if (!vText) { logger.error("SetNodeData/SetCssData: Node not found", msg); return }
        vText.setData(msg.data)
        return
      }

      /** @deprecated 
       * since 4.0.2 in favor of AdoptedSsInsertRule/DeleteRule + AdoptedSsAddOwner as a common case for StyleSheets
       */
      case MType.CssInsertRule: {
        let styleSheet = this.olStyleSheetsDeprecated.get(msg.id)
        if (!styleSheet) {
          const vElem = this.vElements.get(msg.id)
          if (!vElem) { logger.error("CssInsertRule: Node not found", msg); return }
          if (!isStyleVElement(vElem)) { logger.error("CssInsertRule: Non-style element", msg); return }
          styleSheet = OnloadStyleSheet.fromStyleElement(vElem.node)
          this.olStyleSheetsDeprecated.set(msg.id, styleSheet)
        }
        styleSheet.insertRule(msg.rule, msg.index)
        return
      }
      case MType.CssDeleteRule: {
        const styleSheet = this.olStyleSheetsDeprecated.get(msg.id)
        if (!styleSheet) { logger.error("CssDeleteRule: StyleSheet was not created", msg); return }
        styleSheet.deleteRule(msg.index)
        return
      }
      /* end @deprecated */
      case MType.CreateIFrameDocument: {
        const vElem = this.vElements.get(msg.frameID)
        if (!vElem) { logger.error("CreateIFrameDocument: Node not found", msg); return }
        const vRoot = OnloadVRoot.fromVElement(vElem)
        vRoot.catch(e => logger.warn(e, msg))
        this.olVRoots.set(msg.id, vRoot)
        return
      }
      case MType.AdoptedSsInsertRule: {
        const styleSheet = this.olStyleSheets.get(msg.sheetID)
        if (!styleSheet) {
          logger.warn("No stylesheet was created for ", msg)
          return
        }
        insertRule(styleSheet, msg)
        return
      }
      case MType.AdoptedSsDeleteRule: {
        const styleSheet = this.olStyleSheets.get(msg.sheetID)
        if (!styleSheet) {
          logger.warn("No stylesheet was created for ", msg)
          return
        }
        deleteRule(styleSheet, msg)
        return
      }
      case MType.AdoptedSsReplace: {
        const styleSheet = this.olStyleSheets.get(msg.sheetID)
        if (!styleSheet) {
          logger.warn("No stylesheet was created for ", msg)
          return
        }
        // @ts-ignore (configure ts with recent WebaAPI)
        styleSheet.replaceSync(msg.text)
        return
      }
      case MType.AdoptedSsAddOwner: {
        const vRoot = this.olVRoots.get(msg.id)
        if (!vRoot) {
          /* <style> tag case */
          const vElem = this.vElements.get(msg.id)
          if (!vElem) { logger.error("AdoptedSsAddOwner: Node not found", msg); return }
          if (!isStyleVElement(vElem)) { logger.error("Non-style owner", msg); return }
          this.olStyleSheets.set(msg.sheetID, OnloadStyleSheet.fromStyleElement(vElem.node))
          return
        }
        /* Constructed StyleSheet case */
        let olStyleSheet = this.olStyleSheets.get(msg.sheetID)
        if (!olStyleSheet) {
          olStyleSheet = OnloadStyleSheet.fromVRootContext(vRoot)
          this.olStyleSheets.set(msg.sheetID, olStyleSheet)
        }
        olStyleSheet.whenReady(styleSheet => {
          vRoot.onNode(node => {
            // @ts-ignore
            node.adoptedStyleSheets = [...node.adoptedStyleSheets, styleSheet]
          })
        })
        return
      }
      case MType.AdoptedSsRemoveOwner: {
        const olStyleSheet = this.olStyleSheets.get(msg.sheetID)
        if (!olStyleSheet) {
          logger.warn("AdoptedSsRemoveOwner: No stylesheet was created for ", msg)
          return
        }
        const vRoot = this.olVRoots.get(msg.id)
        if (!vRoot) { logger.error("AdoptedSsRemoveOwner: Owner node not found", msg); return }
        olStyleSheet.whenReady(styleSheet => {
          vRoot.onNode(node => {
            // @ts-ignore
            node.adoptedStyleSheets = [...vRoot.node.adoptedStyleSheets].filter(s => s !== styleSheet)
          })
        })
        return
      }
      case MType.LoadFontFace: {
        const vRoot = this.olVRoots.get(msg.parentID)
        if (!vRoot) { logger.error("LoadFontFace: Node not found", msg); return }
        vRoot.whenReady(vNode => {
          if (vNode instanceof VShadowRoot) { logger.error(`Node ${vNode} expected to be a Document`, msg); return }
          let descr: Object | undefined
          try {
            descr = JSON.parse(msg.descriptors)
            descr = typeof descr === 'object' ? descr : undefined
          } catch {
            logger.warn("Can't parse font-face descriptors: ", msg)
          }
          const ff = new FontFace(msg.family, msg.source, descr)
          vNode.node.fonts.add(ff)
          ff.load() // TODOTODO: wait for this one in StylesManager in a common way with styles
        })
        return
      }
    }
  }

  /**
   * Moves and applies all the messages from the current (or from the beginning, if t < current.time) 
   * to the one with msg.time >= `t`
   * 
   * This function autoresets pointer if necessary (better name?)
   * 
   * @returns Promise that fulfulls when necessary changes get applied 
   *   (the async part exists mostly due to styles loading)
   */
  async moveReady(t: number): Promise<void> {
    this.moveApply(t, this.applyMessage)

    this.olVRoots.forEach(rt => rt.applyChanges())
    // Thinkabout (read): css preload
    // What if we go back before it is ready? We'll have two handlres?
    return this.stylesManager.moveReady(t).then(() => {
      /* Waiting for styles to be applied first */
      /* Applying focus */
      this.focusManager.move(t)
      /* Applying text selections */
      this.selectionManager.move(t)
      /* Applying all scrolls */
      this.nodeScrollManagers.forEach(manager => {
        const msg = manager.moveGetLast(t)
        if (msg) {
          let scrollVHost: VElement | OnloadVRoot | undefined
          if (scrollVHost = this.vElements.get(msg.id)) {
            scrollVHost.node.scrollLeft = msg.x
            scrollVHost.node.scrollTop = msg.y
          } else if ((scrollVHost = this.olVRoots.get(msg.id))) {
            scrollVHost.whenReady(vNode => {
              if (vNode instanceof VDocument) {
                vNode.node.defaultView?.scrollTo(msg.x, msg.y)
              }
            })
          }
        }
      })
    })
  }
}
