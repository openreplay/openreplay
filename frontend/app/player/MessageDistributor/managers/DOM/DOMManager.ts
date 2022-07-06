import logger from 'App/logger';

import type StatedScreen from '../../StatedScreen';
import type { Message, SetNodeScroll, CreateElementNode } from '../../messages';

import ListWalker from '../ListWalker';
import StylesManager, { rewriteNodeStyleSheet } from './StylesManager';
import { VElement, VText, VFragment, VDocument, VNode, VStyleElement } from './VirtualDOM';
import type { StyleElement } from './VirtualDOM';


type HTMLElementWithValue = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

const IGNORED_ATTRS = [ "autocomplete", "name" ];
const ATTR_NAME_REGEXP = /([^\t\n\f \/>"'=]+)/; // regexp costs ~

export default class DOMManager extends ListWalker<Message> {
  private vTexts: Map<number, VText> = new Map() // map vs object here?
  private vElements: Map<number, VElement> = new Map()
  private vRoots: Map<number, VFragment | VDocument> = new Map()
  

  private upperBodyId: number = -1;
  private nodeScrollManagers: Map<number, ListWalker<SetNodeScroll>> = new Map()
  private stylesManager: StylesManager


  constructor(
    private readonly screen: StatedScreen,
    private readonly isMobile: boolean,
    public readonly time: number
  ) {
    super()
    this.stylesManager = new StylesManager(screen)
  }

  append(m: Message): void {
    if (m.tp === "set_node_scroll") {
      let scrollManager = this.nodeScrollManagers.get(m.id)
      if (!scrollManager) {
        scrollManager = new ListWalker()
        this.nodeScrollManagers.set(m.id, scrollManager)
      }
      scrollManager.append(m)
      return
    }
    if (m.tp === "create_element_node") {
      if(m.tag === "BODY" && this.upperBodyId === -1) {
        this.upperBodyId = m.id
      }
    } else if (m.tp === "set_node_attribute" && 
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
        pNode.innerText.trim().length === 0
    ) {
      logger.log("Trying to insert child to a style tag with virtual rules: ", parent, child);
      return;
    }

    parent.insertChildAt(child, index)
  }

  private applyMessage = (msg: Message): void => {
    let node: Node | undefined
    let vn: VNode | undefined
    let doc: Document | null
    switch (msg.tp) {
      case "create_document":
        doc = this.screen.document;
        if (!doc) {
          logger.error("No iframe document found", msg)
          return;
        }
        doc.open();
        doc.write("<!DOCTYPE html><html></html>");
        doc.close();
        const fRoot = doc.documentElement;
        fRoot.innerText = '';

        vn = new VElement(fRoot)
        this.vElements = new Map([[0, vn ]])
        this.stylesManager.reset();
        return
      case "create_text_node":
        vn = new VText()
        this.vTexts.set(msg.id, vn)
        this.insertNode(msg)
        return
      case "create_element_node":
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
        return
      case "move_node":
        this.insertNode(msg);
        return
      case "remove_node":
        vn = this.vElements.get(msg.id) || this.vTexts.get(msg.id)
        if (!vn) { logger.error("Node not found", msg); return }
        if (!vn.parentNode) { logger.error("Parent node not found", msg); return }
        vn.parentNode.removeChild(vn)
        return
      case "set_node_attribute":
        let { name, value } = msg;
        vn = this.vElements.get(msg.id)
        if (!vn) { logger.error("Node not found", msg); return }
        if (name === "href" && vn.node.tagName === "LINK") {
          // @ts-ignore TODO: global ENV type   // It'd done on backend (remove after testing in saas)
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
        return
      case "remove_node_attribute":
        vn = this.vElements.get(msg.id)
        if (!vn) { logger.error("Node not found", msg); return }
        vn.removeAttribute(msg.name)
        return
      case "set_input_value":
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
      case "set_input_checked":
        vn = this.vElements.get(msg.id)
        if (!vn) { logger.error("Node not found", msg); return }
        (vn.node as HTMLInputElement).checked = msg.checked
        return
      case "set_node_data":
      case "set_css_data": // TODO: remove  css transitions when timeflow is not natural (on jumps)
        vn = this.vTexts.get(msg.id)
        if (!vn) { logger.error("Node not found", msg); return }
        vn.setData(msg.data)
        if (vn.node instanceof HTMLStyleElement) {
          doc = this.screen.document
          // TODO: move to message parsing
          doc && rewriteNodeStyleSheet(doc, vn.node)
        }
        return
      case "css_insert_rule":
        vn = this.vElements.get(msg.id)
        if (!vn) { logger.error("Node not found", msg); return }
        if (!(vn instanceof VStyleElement)) {
          logger.warn("Non-style node in CSS rules message (or sheet is null)", msg, node.sheet);
          return
        }
        vn.onStyleSheet(sheet => {
          try {
            sheet.insertRule(msg.rule, msg.index)
          } catch (e) {
            logger.warn(e, msg)
            try {
              sheet.insertRule(msg.rule)
            } catch (e) {
              logger.warn("Cannot insert rule.", e, msg)
            }
          }
        })
        return
      case "css_delete_rule":
        vn = this.vElements.get(msg.id)
        if (!vn) { logger.error("Node not found", msg); return }
        if (!(vn instanceof VStyleElement)) {
          logger.warn("Non-style node in CSS rules message (or sheet is null)", msg, vn);
          return
        }
        vn.onStyleSheet(sheet => {
          try {
            sheet.deleteRule(msg.index)
          } catch (e) {
            logger.warn(e, msg)
          }
        })
        return
      case "create_i_frame_document":
        vn = this.vElements.get(msg.frameID)
        if (!vn) { logger.error("Node not found", msg); return }
        const host = vn.node
        if (host instanceof HTMLIFrameElement) {
          const vDoc = new VDocument()
          this.vRoots.set(msg.id, vDoc)
          host.onload = () => {
            const doc = host.contentDocument
            if (!doc) {
              logger.warn("No iframe doc onload", msg, host)
              return
            }
            vDoc.setDocument(doc)
            vDoc.applyChanges()
          }    
          return;
        } else if (host instanceof Element) { // shadow DOM
          try {
            const shadowRoot = host.attachShadow({ mode: 'open' })
            vn = new VFragment(shadowRoot)
            this.vRoots.set(msg.id, vn)
          } catch(e) {
            logger.warn("Can not attach shadow dom", e, msg)
          }
        } else {
          logger.warn("Context message host is not Element", msg)
        }
        return
    } 
  }

  moveReady(t: number): Promise<void> {
    this.moveApply(t, this.applyMessage) // This function autoresets pointer if necessary (better name?)

    // @ts-ignore
    this.vElements.get(0).applyChanges()
    this.vRoots.forEach(rt => rt.applyChanges())

    // Thinkabout (read): css preload
    // What if we go back before it is ready? We'll have two handlres?
    return this.stylesManager.moveReady(t).then(() => {
      // Apply all scrolls after the styles got applied
      this.nodeScrollManagers.forEach(manager => {
        const msg = manager.moveGetLast(t)
        if (msg) {
          const vElm = this.vElements.get(msg.id)
          if (vElm) {
            vElm.node.scrollLeft = msg.x
            vElm.node.scrollTop = msg.y
          }
        }
      })
    })
  }
}