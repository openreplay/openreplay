import type StatedScreen from '../StatedScreen';
import type { Message, SetNodeScroll, CreateElementNode } from '../messages';

import logger from 'App/logger';
import StylesManager, { rewriteNodeStyleSheet } from './StylesManager';
import ListWalker from './ListWalker';

const IGNORED_ATTRS = [ "autocomplete", "name" ];

const ATTR_NAME_REGEXP = /([^\t\n\f \/>"'=]+)/; // regexp costs ~

export default class DOMManager extends ListWalker<Message> {
  private isMobile: boolean;
  private screen: StatedScreen;
  private nl: Array<Node> = [];
  private isLink: Array<boolean> = []; // Optimisations
  private bodyId: number = -1;
  private postponedBodyMessage: CreateElementNode | null = null;
  private nodeScrollManagers: Array<ListWalker<SetNodeScroll>> = [];

  private stylesManager: StylesManager;

  private startTime: number;

  constructor(screen: StatedScreen, isMobile: boolean, startTime: number) {
    super();
    this.startTime = startTime;
    this.isMobile = isMobile;
    this.screen = screen;
    this.stylesManager = new StylesManager(screen);
  }

  get time(): number {
    return this.startTime;
  }

  add(m: Message): void {
    switch (m.tp) {
    case "set_node_scroll":
      if (!this.nodeScrollManagers[ m.id ]) {
        this.nodeScrollManagers[ m.id ] = new ListWalker();
      }
      this.nodeScrollManagers[ m.id ].add(m);
      return;
    //case "css_insert_rule": // ||   //set_css_data ???
    //case "css_delete_rule":
    // (m.tp === "set_node_attribute" && this.isLink[ m.id ] && m.key === "href")) {
    //  this.stylesManager.add(m);
    //  return;
    default:
      if (m.tp === "create_element_node") {
        switch(m.tag) {
          case "LINK":
            this.isLink[ m.id ] = true;
          break;
          case "BODY":
            this.bodyId = m.id; // Can be several body nodes at one document session?
          break;
        }
      } else if (m.tp === "set_node_attribute" && 
        (IGNORED_ATTRS.includes(m.name) || !ATTR_NAME_REGEXP.test(m.name))) {
        logger.log("Ignorring message: ", m)
        return; // Ignoring...
      }
      super.add(m);
    }

  }

  private removeBodyScroll(id: number): void {
    if (this.isMobile && this.bodyId === id) {
      (this.nl[ id ] as HTMLBodyElement).style.overflow = "hidden";
    }
  }

  // May be make it as a message on message add? 
  private removeAutocomplete({ id, tag }: CreateElementNode): boolean {
    const node = this.nl[ id ] as HTMLElement;
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

  // type = NodeMessage ?
  private insertNode({ parentID, id, index }: { parentID: number, id: number, index: number }): void {
    if (!this.nl[ id ]) {
      logger.error("Insert error. Node not found", id);
      return;
    }
    if (!this.nl[ parentID ]) {
      logger.error("Insert error. Parent node not found", parentID);
      return;
    }
    // WHAT if text info contains some rules and the ordering is just wrong???
    const el = this.nl[ parentID ]
    if ((el instanceof HTMLStyleElement) &&  // TODO: correct ordering OR filter in tracker
        el.sheet && 
        el.sheet.cssRules &&
        el.sheet.cssRules.length > 0 &&
        el.innerText.trim().length === 0) {
      logger.log("Trying to insert child to a style tag with virtual rules: ", this.nl[ parentID ], this.nl[ id ]);
      return;
    }

    const childNodes = this.nl[ parentID ].childNodes;
    if (!childNodes) {
      logger.error("Node has no childNodes", this.nl[ parentID ]);
      return;
    }
    this.nl[ parentID ]
      .insertBefore(this.nl[ id ], childNodes[ index ]);
  }

  private applyMessage = (msg: Message): void => {
    let node;
    let doc: Document | null;
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
        this.nl = [ fRoot ];

        // the last load event I can control
        //if (this.document.fonts) {
        //  this.document.fonts.onloadingerror = () => this.marker.redraw();
        //  this.document.fonts.onloadingdone = () => this.marker.redraw();
        //}
        
        //this.screen.setDisconnected(false);
        this.stylesManager.reset();
      break;
      case "create_text_node":
        this.nl[ msg.id ] = document.createTextNode('');
        this.insertNode(msg);
      break;
      case "create_element_node":
      // console.log('elementnode', msg)
        if (msg.svg) {
          this.nl[ msg.id ] = document.createElementNS('http://www.w3.org/2000/svg', msg.tag);
        } else {
          this.nl[ msg.id ] = document.createElement(msg.tag);
        }
        if (this.bodyId === msg.id) {
          this.postponedBodyMessage = msg;
        } else {
          this.insertNode(msg);
        }
        this.removeBodyScroll(msg.id);
        this.removeAutocomplete(msg);
      break;
      case "move_node":
        this.insertNode(msg);
      break;
      case "remove_node":
        node = this.nl[ msg.id ]
        if (!node) { logger.error("Node not found", msg); break; }
        if (!node.parentElement) { logger.error("Parent node not found", msg); break; }
        node.parentElement.removeChild(node);
      break;
      case "set_node_attribute":
        let { id, name, value } = msg;
        node = this.nl[ id ];
        if (!node) { logger.error("Node not found", msg); break; }
        if (this.isLink[ id ] && name === "href") {
          // @ts-ignore TODO: global ENV type
          if (value.startsWith(window.ENV.ASSETS_HOST)) { // Hack for queries in rewrited urls
            value = value.replace("?", "%3F");
          }
          this.stylesManager.setStyleHandlers(node, value);
        }
        if (node.namespaceURI === 'http://www.w3.org/2000/svg' && value.startsWith("url(")) {
          value = "url(#" + (value.split("#")[1] ||")")
        }
        try {
          node.setAttribute(name, value);
        } catch(e) {
          logger.error(e, msg);
        }
        this.removeBodyScroll(msg.id);
      break;
      case "remove_node_attribute":
        if (!this.nl[ msg.id ]) { logger.error("Node not found", msg); break; }
        try {
          (this.nl[ msg.id ] as HTMLElement).removeAttribute(msg.name);
        } catch(e) {
          logger.error(e, msg);
        }
      break;
      case "set_input_value":
        if (!this.nl[ msg.id ]) { logger.error("Node not found", msg); break; }
        const val = msg.mask > 0 ? '*'.repeat(msg.mask) : msg.value;
        (this.nl[ msg.id ] as HTMLInputElement).value = val;
      break;
      case "set_input_checked":
        node = this.nl[ msg.id ];
        if (!node) { logger.error("Node not found", msg); break; }
        (node as HTMLInputElement).checked = msg.checked;
      break;
      case "set_node_data":
      case "set_css_data":
        node = this.nl[ msg.id ]
        if (!node) { logger.error("Node not found", msg); break; }
        // @ts-ignore
        node.data = msg.data;
        if (node instanceof HTMLStyleElement) {
          doc = this.screen.document
          doc && rewriteNodeStyleSheet(doc, node)
        }
      break;
      case "css_insert_rule":
        node = this.nl[ msg.id ];
        if (!node) { logger.error("Node not found", msg); break; }
        if (!(node instanceof HTMLStyleElement) // link or null
          || node.sheet == null) { 
          logger.warn("Non-style node in  CSS rules message (or sheet is null)", msg);
          break;
        }
        try {
          node.sheet.insertRule(msg.rule, msg.index)
        } catch (e) {
          logger.warn(e, msg)
          try {
            node.sheet.insertRule(msg.rule)
          } catch (e) {
            logger.warn("Cannot insert rule.", e, msg)
          }
        }
      break;
      case "css_delete_rule":
        node = this.nl[ msg.id ];
        if (!node) { logger.error("Node not found", msg); break; }
        if (!(node instanceof HTMLStyleElement) // link or null
          || node.sheet == null) { 
          logger.warn("Non-style node in  CSS rules message (or sheet is null)", msg);
          break;
        }
        try {
          node.sheet.deleteRule(msg.index)
        } catch (e) {
          logger.warn(e, msg)
        }
      break;
      case "create_i_frame_document":
        node = this.nl[ msg.frameID ];
        // console.log('ifr', msg, node)

        if (node instanceof HTMLIFrameElement) {
          doc = node.contentDocument;
          if (!doc) {
            logger.warn("No iframe doc", msg, node, node.contentDocument);
            return;
          }
          this.nl[ msg.id ] = doc.documentElement
          return;
        } else if (node instanceof Element) { // shadow DOM
          try {
            this.nl[ msg.id ] = node.attachShadow({ mode: 'open' })
          } catch(e) {
            logger.warn("Can not attach shadow dom", e, msg)
          }
        } else {
          logger.warn("Context message host is not Element", msg)
        }
        
      break;
        //not sure what to do with this one
      //case "disconnected":
        //setTimeout(() => {
          // if last one
          //if (this.msgs[ this.msgs.length - 1 ] === msg) {
          //  this.setDisconnected(true);
         // }
        //}, 10000);
      //break;
    } 
  }

  moveReady(t: number): Promise<void> {
    this.moveApply(t, this.applyMessage); // This function autoresets pointer if necessary (better name?)
    this.nodeScrollManagers.forEach(manager => {
      const msg = manager.moveToLast(t); // TODO: reset (?)
      
      if (!!msg && !!this.nl[msg.id]) {
        const node = this.nl[msg.id] as HTMLElement;
        node.scrollLeft = msg.x;
        node.scrollTop = msg.y;
      }
    });

    /* Mount body as late as possible */
    if (this.postponedBodyMessage != null) {
      this.insertNode(this.postponedBodyMessage)
      this.postponedBodyMessage = null;
    }

    // Thinkabout (read): css preload
    // What if we go back before it is ready? We'll have two handlres?
    return this.stylesManager.moveReady(t);
  }
}