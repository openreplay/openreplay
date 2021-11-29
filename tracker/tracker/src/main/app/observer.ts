import { stars, hasOpenreplayAttribute } from '../utils';
import {
  CreateDocument,
  CreateElementNode,
  CreateTextNode,
  SetNodeData,
  SetCSSDataURLBased,
  SetNodeAttribute,
  SetNodeAttributeURLBased,
  RemoveNodeAttribute,
  MoveNode,
  RemoveNode,
  CreateIFrameDocument,
} from '../../messages';
import App from './index';

interface Window extends WindowProxy {
  HTMLInputElement: typeof HTMLInputElement,
  HTMLLinkElement: typeof HTMLLinkElement,
  HTMLStyleElement: typeof HTMLStyleElement,
  SVGStyleElement: typeof SVGStyleElement,
  HTMLIFrameElement: typeof HTMLIFrameElement,
  Text: typeof Text,
  Element: typeof Element,
  //parent: Window,
}


type WindowConstructor = 
  Document |
  Element | 
  Text | 
  HTMLInputElement | 
  HTMLLinkElement | 
  HTMLStyleElement | 
  HTMLIFrameElement

// type ConstructorNames = 
//   'Element' | 
//   'Text' | 
//   'HTMLInputElement' | 
//   'HTMLLinkElement' |
//   'HTMLStyleElement' |
//   'HTMLIFrameElement'
type Constructor<T> = { new (...args: any[]): T , name: string  };


function isSVGElement(node: Element): node is SVGElement {
  return node.namespaceURI === 'http://www.w3.org/2000/svg';
}

export interface Options {
  obscureTextEmails: boolean;
  obscureTextNumbers: boolean;
  captureIFrames: boolean;
}

export default class Observer {
  private readonly observer: MutationObserver;
  private readonly commited: Array<boolean | undefined>;
  private readonly recents: Array<boolean | undefined>;
  private readonly indexes: Array<number>;
  private readonly attributesList: Array<Set<string> | undefined>;
  private readonly textSet: Set<number>;
  private readonly textMasked: Set<number>;
  constructor(private readonly app: App, private readonly options: Options, private readonly context: Window = window) {
    this.observer = new MutationObserver(
      this.app.safe((mutations) => {
        for (const mutation of mutations) {
          const target = mutation.target;
          const type = mutation.type;

          // Special case
          // Document 'childList' might happen in case of iframe. 
          // TODO: generalize as much as possible
          if (this.isInstance(target, Document) 
              && type === 'childList' 
              //&& new Array(mutation.addedNodes).some(node => this.isInstance(node, HTMLHtmlElement))
          ) {
            const parentFrame = target.defaultView?.frameElement
            if (!parentFrame) { continue }
            this.bindTree(target.documentElement)
            const frameID = this.app.nodes.getID(parentFrame)
            const docID = this.app.nodes.getID(target.documentElement)
            if (frameID === undefined || docID === undefined) { continue }
            this.app.send(CreateIFrameDocument(frameID, docID));
            continue;
          }

          if (this.isIgnored(target) || !context.document.contains(target)) {
            continue;
          }
          if (type === 'childList') {
            for (let i = 0; i < mutation.removedNodes.length; i++) {
              this.bindTree(mutation.removedNodes[i]);
            }
            for (let i = 0; i < mutation.addedNodes.length; i++) {
              this.bindTree(mutation.addedNodes[i]);
            }
            continue;
          }
          const id = this.app.nodes.getID(target);
          if (id === undefined) {
            continue;
          }
          if (id >= this.recents.length) {
            this.recents[id] = undefined;
          }
          if (type === 'attributes') {
            const name = mutation.attributeName;
            if (name === null) {
              continue;
            }
            let attr = this.attributesList[id];
            if (attr === undefined) {
              this.attributesList[id] = attr = new Set();
            }
            attr.add(name);
            continue;
          }
          if (type === 'characterData') {
            this.textSet.add(id);
            continue;
          }
        }
        this.commitNodes();
      }),
    );
    this.commited = [];
    this.recents = [];
    this.indexes = [0];
    this.attributesList = [];
    this.textSet = new Set();
    this.textMasked = new Set();
  }
  private clear(): void {
    this.commited.length = 0;
    this.recents.length = 0;
    this.indexes.length = 1;
    this.attributesList.length = 0;
    this.textSet.clear();
    this.textMasked.clear();
  }

  // TODO: we need a type expert here so we won't have to ignore the lines
  private isInstance<T extends WindowConstructor>(node: Node, constr: Constructor<T>): node is T {
    let context = this.context;
    while(context.parent && context.parent !== context) {
      // @ts-ignore
      if (node instanceof context[constr.name]) {
        return true
      }
      // @ts-ignore
      context = context.parent
    }
    // @ts-ignore
    return node instanceof context[constr.name]
  }

  private isIgnored(node: Node): boolean {
    if (this.isInstance(node, Text)) {
      return false;
    }
    if (!this.isInstance(node, Element)) {
      return true;
    }
    const tag = node.tagName.toUpperCase();
    if (tag === 'LINK') {
      const rel = node.getAttribute('rel');
      const as = node.getAttribute('as');
      return !(rel?.includes('stylesheet') || as === "style" || as === "font");
    }
    return (
      tag === 'SCRIPT' ||
      tag === 'NOSCRIPT' ||
      tag === 'META' ||
      tag === 'TITLE' ||
      tag === 'BASE'
    );
  }

  private sendNodeAttribute(
    id: number,
    node: Element,
    name: string,
    value: string | null,
  ): void {
    if (isSVGElement(node)) {
      if (name.substr(0, 6) === 'xlink:') {
        name = name.substr(6);
      }
      if (value === null) {
        this.app.send(new RemoveNodeAttribute(id, name));
      } else if (name === 'href') {
        if (value.length > 1e5) {
          value = '';
        }
        this.app.send(new SetNodeAttributeURLBased(id, name, value, this.app.getBaseHref()));
      } else {
        this.app.send(new SetNodeAttribute(id, name, value));
      }
      return;
    }
    if (
      name === 'src' ||
      name === 'srcset' ||
      name === 'integrity' ||
      name === 'crossorigin' ||
      name === 'autocomplete' ||
      name.substr(0, 2) === 'on'
    ) {
      return;
    }
    if (
      name === 'value' &&
      this.isInstance(node, HTMLInputElement) &&
      node.type !== 'button' &&
      node.type !== 'reset' &&
      node.type !== 'submit'
    ) {
      return;
    }
    if (value === null) {
      this.app.send(new RemoveNodeAttribute(id, name));
      return;
    }
    if (name === 'style' || name === 'href' && this.isInstance(node, HTMLLinkElement)) {
      this.app.send(new SetNodeAttributeURLBased(id, name, value, this.app.getBaseHref()));
      return;
    }
    if (name === 'href' || value.length > 1e5) {
      value = '';
    }
    this.app.send(new SetNodeAttribute(id, name, value));
  }

  /* TODO:  abstract sanitation */
  getInnerTextSecure(el: HTMLElement): string {
    const id = this.app.nodes.getID(el)
    if (!id) { return '' }
    return this.checkObscure(id, el.innerText)

  }

  private checkObscure(id: number, data: string): string {
    if (this.textMasked.has(id)) {
      return data.replace(
        /[^\f\n\r\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/g,
        '█',
      );
    } 
    if (this.options.obscureTextNumbers) {
      data = data.replace(/\d/g, '0');
    }
    if (this.options.obscureTextEmails) {
      data = data.replace(
        /([^\s]+)@([^\s]+)\.([^\s]+)/g,
        (...f: Array<string>) =>
          stars(f[1]) + '@' + stars(f[2]) + '.' + stars(f[3]),
      );
    }
    return data
  }

  private sendNodeData(id: number, parentElement: Element, data: string): void {
    if (this.isInstance(parentElement, HTMLStyleElement) || this.isInstance(parentElement, SVGStyleElement)) {
      this.app.send(new SetCSSDataURLBased(id, data, this.app.getBaseHref()));
      return;
    }
    data = this.checkObscure(id, data)
    this.app.send(new SetNodeData(id, data));
  }
  /* end TODO:  abstract sanitation */

  private bindNode(node: Node): void {
    const r = this.app.nodes.registerNode(node);
    const id = r[0];
    this.recents[id] = r[1] || this.recents[id] || false;
  }

  private bindTree(node: Node): void {
    if (this.isIgnored(node)) {
      return;
    }
    this.bindNode(node);
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_ELEMENT + NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) =>
          this.isIgnored(node) || this.app.nodes.getID(node) !== undefined
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
      },
      false,
    );
    while (walker.nextNode()) {
      this.bindNode(walker.currentNode);
    }
  }

  private unbindNode(node: Node): void {
    const id = this.app.nodes.unregisterNode(node);
    if (id !== undefined && this.recents[id] === false) {
      this.app.send(new RemoveNode(id));
    }
  }

  private _commitNode(id: number, node: Node): boolean {
    const parent = node.parentNode;
    let parentID: number | undefined;
    if (this.isInstance(node, HTMLHtmlElement)) { 
      this.indexes[id] = 0
    } else {
      if (parent === null) {
        this.unbindNode(node);
        return false;
      }
      parentID = this.app.nodes.getID(parent);
      if (parentID === undefined) {
        this.unbindNode(node);
        return false;
      }
      if (!this.commitNode(parentID)) {
        this.unbindNode(node);
        return false;
      }
      if (
        this.textMasked.has(parentID) ||
        (this.isInstance(node, Element) && hasOpenreplayAttribute(node, 'masked'))
      ) {
        this.textMasked.add(id);
      }
      let sibling = node.previousSibling;
      while (sibling !== null) {
        const siblingID = this.app.nodes.getID(sibling);
        if (siblingID !== undefined) {
          this.commitNode(siblingID);
          this.indexes[id] = this.indexes[siblingID] + 1;
          break;
        }
        sibling = sibling.previousSibling;
      }
      if (sibling === null) {
        this.indexes[id] = 0;
      }
    }
    const isNew = this.recents[id];
    const index = this.indexes[id];
    if (index === undefined) {
      throw 'commitNode: missing node index';
    }
    if (isNew === true) {
      if (this.isInstance(node, Element)) {
        if (parentID !== undefined) {
          this.app.send(new 
            CreateElementNode(
              id,
              parentID,
              index,
              node.tagName,
              isSVGElement(node),
            ),
          );
        }
        for (let i = 0; i < node.attributes.length; i++) {
          const attr = node.attributes[i];
          this.sendNodeAttribute(id, node, attr.nodeName, attr.value);
        }

        if (this.isInstance(node, HTMLIFrameElement) && 
          (this.options.captureIFrames || node.getAttribute("data-openreplay-capture"))) {
          this.handleIframe(node);
        }
      } else if (this.isInstance(node, Text)) {
        // for text node id != 0, hence parentID !== undefined and parent is Element
        this.app.send(new CreateTextNode(id, parentID as number, index));
        this.sendNodeData(id, parent as Element, node.data);
      }
      return true;
    }
    if (isNew === false && parentID !== undefined) {
      this.app.send(new MoveNode(id, parentID, index));
    }
    const attr = this.attributesList[id];
    if (attr !== undefined) {
      if (!this.isInstance(node, Element)) {
        throw 'commitNode: node is not an element';
      }
      for (const name of attr) {
        this.sendNodeAttribute(id, node, name, node.getAttribute(name));
      }
    }
    if (this.textSet.has(id)) {
      if (!this.isInstance(node, Text)) {
        throw 'commitNode: node is not a text';
      }
      // for text node id != 0, hence parent is Element
      this.sendNodeData(id, parent as Element, node.data);
    }
    return true;
  }
  private commitNode(id: number): boolean {
    const node = this.app.nodes.getNode(id);
    if (node === undefined) {
      return false;
    }
    const cmt = this.commited[id];
    if (cmt !== undefined) {
      return cmt;
    }
    return (this.commited[id] = this._commitNode(id, node));
  }
  private commitNodes(): void {
    let node;
    for (let id = 0; id < this.recents.length; id++) {
      this.commitNode(id);
      if (this.recents[id] === true && (node = this.app.nodes.getNode(id))) {
        this.app.nodes.callNodeCallbacks(node);
      }
    }
    this.clear();
  }

  private iframeObservers: Observer[] = [];
  private handleIframe(iframe: HTMLIFrameElement): void {
    let context: Window | null = null
    const handle = this.app.safe(() => {
      const id = this.app.nodes.getID(iframe)
      if (id === undefined) { return }
      if (iframe.contentWindow === context) { return }
      context = iframe.contentWindow as Window | null;
      if (!context) { return }
      const observer = new Observer(this.app, this.options, context)
      this.iframeObservers.push(observer)
      observer.observeIframe(id, context)
    })
    this.app.attachEventListener(iframe, "load", handle)
    handle()
  }

  // TODO: abstract common functionality, separate FrameObserver
  private observeIframe(id: number, context: Window) {
    const doc = context.document;
    this.observer.observe(doc, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true,
      attributeOldValue: false,
      characterDataOldValue: false,
    });
    this.bindTree(doc.documentElement);
    const docID = this.app.nodes.getID(doc.documentElement);
    if (docID === undefined) {
      console.log("Wrong")
      return;
    }
    this.app.send(CreateIFrameDocument(id,docID));
    this.commitNodes();
  }

  observe(): void {
    this.observer.observe(this.context.document, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true,
      attributeOldValue: false,
      characterDataOldValue: false,
    });
    this.app.send(new CreateDocument());
    this.bindTree(this.context.document.documentElement);
    this.commitNodes();
  }

  disconnect(): void {
    this.iframeObservers.forEach(o => o.disconnect());
    this.iframeObservers = [];
    this.observer.disconnect();
    this.clear();
  }
}
