import { isIFrameElement, isRootNode } from '../../../guards';
import { insertRule, deleteRule, replaceRule } from './safeCSSRules';
import { parseSanitizedSvgContent } from './sanitize';

function isNode(sth: any): sth is Node {
  return !!sth && sth.nodeType != null;
}

type Callback<T> = (o: T) => void;

/**
 * Virtual Node base class.
 * Implements common abstract methods and lazy node creation logic.
 *
 * @privateRemarks
 * Would be better to export type-only, but didn't find a nice way to do that.
 */
export abstract class VNode<T extends Node = Node> {
  protected abstract createNode(): T;
  assignedSlot: VSlot | null = null;
  private _node: T | null;

  /**
   * JS DOM Node getter with lazy node creation
   *
   * @returns underneath JS DOM Node
   * @remarks should not be called unless the real node is required since creation might be expensive
   * 	It is better to use `onNode` callback applicator unless in the `applyChanges` implementation
   */
  get node(): T {
    if (!this._node) {
      const node = (this._node = this.createNode());
      this.nodeCallbacks.forEach((cb) => cb(node));
      this.nodeCallbacks = [];
    }
    return this._node;
  }

  private nodeCallbacks: Callback<T>[] = [];

  /**
   * Lazy Node callback applicator
   *
   * @param callback - Callback that fires on existing JS DOM Node instantly if it exists
   * or whenever it gets created. Call sequence is concerned.
   */
  onNode(callback: Callback<T>) {
    if (this._node) {
      callback(this._node);
      return;
    }
    this.nodeCallbacks.push(callback);
  }

  /**
   * Abstract method, should be implemented by the actual classes
   * It is supposed to apply virtual changes into the actual DOM
   */
  public abstract applyChanges(): void;
}

type VChild = VElement | VText;
abstract class VParent<T extends Node = Node> extends VNode<T> {
  /**
   */
  protected children: VChild[] = [];

  protected notMontedChildren: Set<VChild> = new Set();

  insertChildAt(child: VChild, index: number) {
    child.pendingRoot = null;
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    this.children.splice(index, 0, child);
    this.notMontedChildren.add(child);
    child.parentNode = this;
  }

  removeChild(child: VChild) {
    this.children = this.children.filter((ch) => ch !== child);
    this.notMontedChildren.delete(child);
    child.parentNode = null;
  }

  protected mountChildren(shouldInsert?: (child: VChild) => boolean) {
    let nextMounted: VChild | null = null;
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child.assignedSlot) {
        continue;
      }
      if (
        this.notMontedChildren.has(child) &&
        (!shouldInsert || shouldInsert(child)) // is there a better way of not-knowing about subclass logic on prioritized insertion?
      ) {
        this.node.insertBefore(
          child.node,
          nextMounted ? nextMounted.node : null,
        );
        this.notMontedChildren.delete(child);
      }
      if (!this.notMontedChildren.has(child)) {
        nextMounted = child;
      }
    }
  }

  applyChanges() {
    /* Building a sub-trees first (in-memory for non-mounted children) */
    this.children.forEach((child) => child.applyChanges());
    /* Inserting */
    this.mountChildren();
    if (this.notMontedChildren.size !== 0) {
      console.error(
        'VParent: Something went wrong with children insertion',
        this.notMontedChildren,
      );
    }
    /* Removing in-between */
    const { node } = this;
    const realChildren = node.childNodes;
    const expected = this.children.filter((c) => !c.assignedSlot);
    if (realChildren.length > 0 && expected.length > 0) {
      for (let j = 0; j < expected.length; j++) {
        while (realChildren[j] !== expected[j].node) {
          if (isNode(realChildren[j])) {
            node.removeChild(realChildren[j]);
          }
        }
      }
    }
    /* Removing tail */
    while (realChildren.length > expected.length) {
      node.removeChild(
        node.lastChild as Node,
      ); /* realChildren.length > this.children.length >= 0 so it is not null */
    }
  }
}

export class VDocument extends VParent<Document> {
  constructor(protected readonly createNode: () => Document) {
    super();
  }

  applyChanges() {
    if (this.children.length > 1) {
      console.error('VDocument expected to have a single child.', this);
    }
    const child = this.children[0];
    if (!child) {
      return;
    }
    child.applyChanges();
    const htmlNode = child.node;
    if (htmlNode.parentNode !== this.node) {
      this.node.replaceChild(htmlNode, this.node.documentElement);
    }
  }
}

export class VShadowRoot extends VParent<ShadowRoot> {
  constructor(protected readonly createNode: () => ShadowRoot) {
    super();
  }
}

export type VRoot = VDocument | VShadowRoot;

export class VElement extends VParent<Element> {
  parentNode: VParent | null =
    null; /** Should be modified only by he parent itself */
  /** Root this node waits to be inserted into (see OnloadVRoot.insertChildAt) */
  pendingRoot: OnloadVRoot | null = null;

  private newAttributes: Map<string, string | false> = new Map();

  constructor(
    readonly tagName: string,
    readonly isSVG = false,
    public readonly index: number,
    private readonly nodeId: number,
  ) {
    super();
  }

  getAttribute(name: string): string | null {
    const queued = this.newAttributes.get(name);
    if (queued !== undefined) {
      return queued === false ? null : queued;
    }
    return this.node.getAttribute(name);
  }

  protected createNode() {
    // In the replay's document: a shadow host moved into a node of another document loses
    // its adopted (constructed) stylesheets, also once moved back.
    const parent = this.parentNode?.node;
    const doc = parent ? parent.ownerDocument || (parent as Document) : document;
    try {
      const element = this.isSVG
        ? doc.createElementNS('http://www.w3.org/2000/svg', this.tagName)
        : doc.createElement(this.tagName);
      element.dataset.openreplayId = this.nodeId.toString();
      return element;
    } catch (e) {
      console.error(
        'Openreplay: Player received invalid html tag',
        this.tagName,
        e,
      );
      return doc.createElement(this.tagName.replace(/[^a-z]/gi, ''));
    }
  }

  setAttribute(name: string, value: string) {
    this.newAttributes.set(name, value);
  }

  private animationResult: Animation | null = null;

  /**
   * Final state of a recorded web animation, kept as a filling animation like on the page:
   * an inline style would be dropped by the app's next style write (Ionic clears its
   * before-styles right after an animation finishes).
   */
  applyAnimationResult(styles: Record<string, string>) {
    // onNode: creating the node here, before its parent root exists, would put it in the wrong document
    this.onNode((node) => {
      this.animationResult?.cancel();
      this.animationResult = null;
      try {
        this.animationResult = node.animate([styles], {
          duration: 0,
          fill: 'forwards',
        });
      } catch {
        this.applyStyleChanges(Object.entries(styles));
      }
    });
  }

  applyStyleChanges(styles: [prop: string, value: string][]) {
    let existingStyles = this.node.getAttribute('style') || '';
    let newStyles = existingStyles;
    styles.forEach(([prop, value]) => {
      if (existingStyles.includes(prop)) {
        const regex = new RegExp(`(${prop}:[^;]+;?)`, 'g');
        const newStyle = `${prop}:${value};`;
        newStyles = newStyles.replace(regex, newStyle);
      } else {
        newStyles += `${prop}:${value};`;
      }
    });
    this.newAttributes.set('style', newStyles);
  }

  removeAttribute(name: string) {
    this.newAttributes.set(name, false);
  }

  private applyAttributeChanges() {
    // "changes" -> "updates" ?
    this.newAttributes.forEach((value, key) => {
      if (value === false) {
        this.node.removeAttribute(key);
      } else {
        try {
          this.node.setAttribute(key, value);
        } catch (e) {
          console.error(e);
        }
      }
    });
    this.newAttributes.clear();
  }

  applyChanges() {
    this.prioritized && this.applyPrioritizedChanges();
    this.applyAttributeChanges();
    super.applyChanges();
  }

  /** Insertion Prioritization
   * Made for styles that should be inserted as prior,
   * otherwise it will show visual styling lag if there is a transition CSS property)
   */
  prioritized = false;

  insertChildAt(child: VChild, index: number) {
    super.insertChildAt(child, index);
    /* Bubble prioritization */
    if (child instanceof VElement && child.prioritized) {
      let parent: VParent | null = this;
      while (parent instanceof VElement && !parent.prioritized) {
        parent.prioritized = true;
        parent = parent.parentNode;
      }
    }
  }

  private applyPrioritizedChanges() {
    this.children.forEach((child) => {
      if (child instanceof VText) {
        child.applyChanges();
      } else if (child.prioritized) {
        /* Update prioritized VElement-s */
        child.applyPrioritizedChanges();
        child.applyAttributeChanges();
      }
    });
    this.mountChildren((child) => child instanceof VText || child.prioritized);
  }
}

export class VSlot extends VElement {
  protected createNode() {
    const element = super.createNode() as HTMLSlotElement;
    return element;
  }

  applyChanges() {
    super.applyChanges();
    // todo safety checks here ?
  }
}

export class VHTMLElement extends VElement {
  constructor(node: HTMLElement) {
    super('HTML', false);
    this.createNode = () => node;
  }
}

/**
 * Host for the `<symbol>`s rebuilt from `_$OPENREPLAY_SPRITE$_` messages, kept as the last child
 * of every <body> so the `<use href="#symbol-N">` rewrite done in MessageManager resolves inside
 * the replay document (`<use>` refuses external and data: refs as cross-origin).
 * Its content is set wholesale instead of coming from the message stream, so VParent's child
 * reconciliation must not run here: it would prune every symbol as an unexpected node.
 */
export class VSpriteMap extends VElement {
  private content = '';

  private dirty = false;

  setContent(content: string) {
    if (content === this.content) {
      return;
    }
    this.content = content;
    this.dirty = true;
  }

  applyChanges() {
    if (!this.dirty) {
      return;
    }
    this.dirty = false;
    const node = this.node;
    const parsed = this.content ? parseSanitizedSvgContent(this.content) : null;
    const symbols = node.ownerDocument.createDocumentFragment();
    while (parsed?.firstChild) {
      symbols.appendChild(parsed.firstChild);
    }
    node.replaceChildren(symbols);
  }

  protected createNode() {
    // Created before it has a parent (DOMManager.attachSpriteMap), where VElement falls back
    // to the app page's document; detached SVG <image>s there still load. Adopted on mount.
    return document.implementation.createDocument(
      'http://www.w3.org/2000/svg',
      'svg',
      null,
    ).documentElement;
  }
}

export class VText extends VNode<Text> {
  parentNode: VParent | null = null;
  pendingRoot: OnloadVRoot | null = null;

  protected createNode() {
    return new Text();
  }

  private data: string = '';

  private changed: boolean = false;

  setData(data: string) {
    this.data = data;
    this.changed = true;
  }

  applyChanges() {
    if (this.changed) {
      this.node.data = this.data;
      this.changed = false;
    }
  }
}

class PromiseQueue<T> {
  onCatch?: (err?: any) => void;

  constructor(private promise: Promise<void | T>) {}

  /**
   * Call sequence is concerned.
   */
  // Doing this with callbacks list instead might be more efficient (but more wordy). TODO: research
  whenReady(cb: Callback<T>) {
    this.promise = this.promise
      .then((vRoot) => {
        cb(vRoot as T);
        return vRoot;
      })
      .catch((e) => {
        this.onCatch?.(e);
      });
  }

  catch(cb: (err?: any) => void) {
    this.onCatch = cb;
  }
}

/**
 * VRoot wrapper that allows to defer all the API calls till the moment
 * when VNode CAN be created (for example, on <iframe> mount&load)
 */
export class OnloadVRoot extends PromiseQueue<VRoot> {
  static fromDocumentNode(doc: Document): OnloadVRoot {
    return new OnloadVRoot(Promise.resolve(new VDocument(() => doc)));
  }

  static fromVElement(vElem: VElement): OnloadVRoot {
    return new OnloadVRoot(
      new Promise((resolve, reject) => {
        vElem.onNode((host) => {
          if (isIFrameElement(host)) {
            /* IFrame case: creating Document */
            const doc = host.contentDocument;
            if (doc) {
              resolve(new VDocument(() => doc));
            } else {
              host.addEventListener('load', () => {
                const doc = host.contentDocument;
                if (doc) {
                  resolve(new VDocument(() => doc));
                } else {
                  reject('No default Document found on iframe load'); // Send `host` for logging as well
                }
              });
            }
          } else {
            /* ShadowDom case */
            try {
              const shadowRoot = host.attachShadow({ mode: 'open' });
              resolve(new VShadowRoot(() => shadowRoot));
            } catch (e) {
              reject(e); // "Can not attach shadow dom"
            }
          }
        });
      }),
    );
  }

  onNode(cb: Callback<Document | ShadowRoot>) {
    this.whenReady((vRoot) => vRoot.onNode(cb));
  }

  applyChanges() {
    this.whenReady((vRoot) => vRoot.applyChanges());
  }

  insertChildAt(child: VChild, index: number) {
    // a child removed or moved before the root exists must not appear once it does
    child.pendingRoot = this;
    this.whenReady((vRoot) => {
      if (child.pendingRoot !== this) return;
      vRoot.insertChildAt(child, index);
    });
  }
}

export type StyleElement = HTMLStyleElement | SVGStyleElement;

/**
 * CSSStyleSheet wrapper that collects all the insertRule/deleteRule calls
 * and then applies them when the sheet is ready
 */
export class OnloadStyleSheet extends PromiseQueue<CSSStyleSheet> {
  static fromStyleElement(node: StyleElement) {
    return new OnloadStyleSheet(
      new Promise((resolve, reject) => {
        node.addEventListener('load', () => {
          const { sheet } = node;
          if (sheet) {
            resolve(sheet);
          } else {
            reject('Style node onload: sheet is null');
          }
        });
      }),
    );
  }

  private addContext?: (vRoot: OnloadVRoot) => void;

  /**
   * Constructed sheet, created in the window of the first owner root that gets a node:
   * an owner removed before the replay reaches it never does, see addOwnerContext.
   */
  static fromVRootContext(vRoot: OnloadVRoot) {
    let resolveSheet: (sheet: CSSStyleSheet) => void = () => {};
    const olSheet = new OnloadStyleSheet(
      new Promise<CSSStyleSheet>((resolve) => {
        resolveSheet = resolve;
      }),
    );
    let resolved = false;
    olSheet.addContext = (root) =>
      root.onNode((node) => {
        if (resolved) return;
        const doc =
          (node as Document | ShadowRoot).ownerDocument || (node as Document);
        /* a StyleSheet from another Window context won't work */
        const context = doc.defaultView;
        if (!context) return;
        resolved = true;
        resolveSheet(new context.CSSStyleSheet());
      });
    olSheet.addContext(vRoot);
    return olSheet;
  }

  addOwnerContext(vRoot: OnloadVRoot) {
    this.addContext?.(vRoot);
  }

  insertRule(rule: string, index: number) {
    this.whenReady((s) => insertRule(s, { rule, index }));
  }

  deleteRule(index: number) {
    this.whenReady((s) => deleteRule(s, { index }));
  }
}
