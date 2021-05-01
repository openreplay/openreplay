//@flow
import type StatedScreen from '../StatedScreen';
import type { Message, SetNodeScroll, CreateElementNode } from '../messages';
import type { TimedMessage } from '../Timed';

import logger from 'App/logger';
import StylesManager from './StylesManager';
import ListWalker from './ListWalker';

const IGNORED_ATTRS = [ "autocomplete", "name" ];

const ATTR_NAME_REGEXP = /([^\t\n\f \/>"'=]+)/; // regexp costs ~

export default class DOMManager extends ListWalker<TimedMessage> {
  #isMobile: boolean;
  #screen: StatedScreen;
  // #prop compiles to method that costs mor than strict property call.
  _nl: Array<Element> = [];
  _isLink: Array<boolean> = []; // Optimisations
  _bodyId: number = -1;
  _postponedBodyMessage: ?CreateElementNode = null;
  #nodeScrollManagers: Array<ListWalker<SetNodeScroll>> = [];

  #stylesManager: StylesManager;

  #startTime: number;

  constructor(screen: StatedScreen, isMobile: boolean, startTime: number) {
    super();
    this.#startTime = startTime;
    this.#isMobile = isMobile;
    this.#screen = screen;
    this.#stylesManager = new StylesManager(screen);
  }

  get time(): number {
    return this.#startTime;
  }

  add(m: TimedMessage): void {
    switch (m.tp) {
    case "set_node_scroll":
      if (!this.#nodeScrollManagers[ m.id ]) {
        this.#nodeScrollManagers[ m.id ] = new ListWalker();
      }
      this.#nodeScrollManagers[ m.id ].add(m);
      return;
    //case "css_insert_rule": // ||   //set_css_data ???
    //case "css_delete_rule":
    // (m.tp === "set_node_attribute" && this._isLink[ m.id ] && m.key === "href")) {
    //  this.#stylesManager.add(m);
    //  return;
    default:
      if (m.tp === "create_element_node") {
        switch(m.tag) {
          case "LINK":
            this._isLink[ m.id ] = true;
          break;
          case "BODY":
            this._bodyId = m.id; // Can be several body nodes at one document session?
          break;
        }
      } else if (m.tp === "set_node_attribute" && 
        (IGNORED_ATTRS.includes(m.key) || !ATTR_NAME_REGEXP.test(m.key))) {
        logger.log("Ignorring message: ", m)
        return; // Ignoring...
      }
      super.add(m);
    }

  }

  _removeBodyScroll(id: number): void {
    if (this.#isMobile && this._bodyId === id) {
      this._nl[ id ].style.overflow = "hidden";
    }
  }

  // May be make it as a message on message add? 
  _removeAutocomplete({ id, tag }: { id: number, tag: string }): boolean {
    const node = this._nl[ id ];
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
  _insertNode({ parentID, id, index }: { parentID: number, id: number, index: number }): void {
    if (!this._nl[ id ]) {
      logger.error("Insert error. Node not found", id);
      return;
    }
    if (!this._nl[ parentID ]) {
      logger.error("Insert error. Parent node not found", parentID);
      return;
    }
    // WHAT if text info contains some rules and the ordering is just wrong???
    if ((this._nl[ parentID ] instanceof HTMLStyleElement) &&  // TODO: correct ordering OR filter in tracker
        this._nl[ parentID ].sheet && 
        this._nl[ parentID ].sheet.cssRules &&
        this._nl[ parentID ].sheet.cssRules.length > 0) {
      logger.log("Trying to insert child to style tag with virtual rules: ", this._nl[ parentID ], this._nl[ id ]);
      return;
    }

    const childNodes = this._nl[ parentID ].childNodes;
    if (!childNodes) {
      logger.error("Node has no childNodes", this._nl[ parentID ]);
      return;
    }
    this._nl[ parentID ]
      .insertBefore(this._nl[ id ], childNodes[ index ]);
  }

  #applyMessage: (Message => void) = msg => {
    let node;
    switch (msg.tp) {
      case "create_document":
        this.#screen.document.open();
        this.#screen.document.write(`${ msg.doctype || "<!DOCTYPE html>" }<html></html>`);
        this.#screen.document.close();
        const fRoot = this.#screen.document.documentElement;
        fRoot.innerText = '';
        //this._nl[ 0 ] = fRoot; // vs 
        this._nl = [ fRoot ];

        // the last load event I can control
        //if (this.document.fonts) {
        //  this.document.fonts.onloadingerror = () => this.marker.redraw();
        //  this.document.fonts.onloadingdone = () => this.marker.redraw();
        //}
        
        //this.#screen.setDisconnected(false);
        this.#stylesManager.reset();
      break;
      case "create_text_node":
        this._nl[ msg.id ] = document.createTextNode('');
        this._insertNode(msg);
      break;
      case "create_element_node":
        if (msg.svg) {
          this._nl[ msg.id ] = document.createElementNS('http://www.w3.org/2000/svg', msg.tag);
        } else {
          this._nl[ msg.id ] = document.createElement(msg.tag);
        }
        if (this._bodyId === msg.id) {
          this._postponedBodyMessage = msg;
        } else {
          this._insertNode(msg);
        }
        this._removeBodyScroll(msg.id);
        this._removeAutocomplete(msg);
      break;
      case "move_node":
        this._insertNode(msg);
      break;
      case "remove_node":
        if (!this._nl[ msg.id ]) { logger.error("Node not found", msg); break; }
        if (!this._nl[ msg.id ].parentElement) { logger.error("Parent node not found", msg); break; }
        this._nl[ msg.id ].parentElement.removeChild(this._nl[ msg.id ]);
      break;
      case "set_node_attribute":
        let { id, name, value } = msg;
        node = this._nl[ id ];
        if (!node) { logger.error("Node not found", msg); break; }
        if (this._isLink[ id ] && name === "href") {
          if (value.startsWith(window.ENV.ASSETS_HOST)) { // Hack for queries in rewrited urls
            value = value.replace("?", "%3F");
          }
          this.#stylesManager.setStyleHandlers(node, value);
        }
        try {
          node.setAttribute(name, value);
        } catch(e) {
          logger.error(e, msg);
        }
        this._removeBodyScroll(msg.id);
      break;
      case "remove_node_attribute":
        if (!this._nl[ msg.id ]) { logger.error("Node not found", msg); break; }
        try {
          this._nl[ msg.id ].removeAttribute(msg.name);
        } catch(e) {
          logger.error(e, msg);
        }
      break;
      case "set_input_value":
        if (!this._nl[ msg.id ]) { logger.error("Node not found", msg); break; }
        const val = msg.mask > 0 ? '*'.repeat(msg.mask) : msg.value;
        this._nl[ msg.id ].value = val;
      break;
      case "set_input_checked":
        if (!this._nl[ msg.id ]) { logger.error("Node not found", msg); break; }
        this._nl[ msg.id ].checked = msg.checked;
      break;
      case "set_node_data":
      case "set_css_data":
        if (!this._nl[ msg.id ]) { logger.error("Node not found", msg); break; }
        this._nl[ msg.id ].data = msg.data;
      break;
      case "css_insert_rule":
        if (!this._nl[ msg.id ]) { logger.error("Node not found", msg); break; }
        if (!(this._nl[ msg.id ] instanceof HTMLStyleElement) // link or null
          || this._nl[ msg.id ].sheet == null) { 
          logger.warn("Non-style node in  CSS rules message (or sheet is null)", msg);

          // prev version fallback (TODO: delete on 30.10.20)
          let styleSheet = this.#screen.document.styleSheets[ msg.id ];
          if (!styleSheet) {
            styleSheet = this.#screen.document.styleSheets[0];
          }
          if (!styleSheet) {
            logger.log("Old-fasion insert rule: No stylesheet found;", msg);
            break;
          }
          try {
             styleSheet.insertRule(msg.rule, msg.index);
           } catch(e) {
            logger.log("Old-fasion insert rule:", e, msg);
            styleSheet.insertRule(msg.rule);
           }
          //

          break;
        }
        try {
          this._nl[ msg.id ].sheet.insertRule(msg.rule, msg.index)
        } catch (e) {
          logger.warn(e, msg)
          this._nl[ msg.id ].sheet.insertRule(msg.rule)
        }
      break;
      case "css_delete_rule":
        if (!this._nl[ msg.id ]) { logger.error("Node not found", msg); break; }
        if (!this._nl[ msg.id ] instanceof HTMLStyleElement) { // link or null
          logger.warn("Non-style node in  CSS rules message", msg);
          break;
        }
        try {
          this._nl[ msg.id ].sheet.deleteRule(msg.rule, msg.index)
        } catch (e) {
          logger.warn(e, msg)
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
    this.moveApply(t, this.#applyMessage); // This function autoresets pointer if necessary (better name?)
    this.#nodeScrollManagers.forEach(manager => {
      const msg = manager.moveToLast(t); // TODO: reset (?)
      if (!!msg && !!this._nl[msg.id]) {
        this._nl[msg.id].scrollLeft = msg.x;
        this._nl[msg.id].scrollTop = msg.y;
      }
    });

    /* Mount body as late as possible */
    if (this._postponedBodyMessage != null) {
      this._insertNode(this._postponedBodyMessage)
      this._postponedBodyMessage = null;
    }

    // Thinkabout (read): css preload
    // What if we go back before it is ready? We'll have two handlres?
    return this.#stylesManager.moveReady(t);
  }
}