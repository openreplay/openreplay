/**
 * Realm-independent DOM guards.
 *
 * Replay nodes are created in (or adopted into) the player <iframe>'s document,
 * so `instanceof` against the outer window's constructors is unreliable:
 * Firefox re-associates an adopted node's prototype with the iframe realm,
 * while Chrome keeps the outer association — so neither realm's constructor
 * alone is correct in both browsers.
 * See https://bugzilla.mozilla.org/show_bug.cgi?id=1821790
 */

export type ValueElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

const VALUE_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];

function tagOf(node: Node | null | undefined): string {
  return node && node.nodeType === Node.ELEMENT_NODE
    ? (node as Element).tagName.toUpperCase()
    : '';
}

export function isRootNode(node: Node): node is Document {
  return node.nodeType === Node.DOCUMENT_NODE;
}

/** Any element whose `.value` we replay: <input>, <textarea>, <select>. */
export function isValueElement(
  node: Node | null | undefined,
): node is ValueElement {
  return VALUE_TAGS.indexOf(tagOf(node)) !== -1;
}

export function isInputElement(
  node: Node | null | undefined,
): node is HTMLInputElement {
  return tagOf(node) === 'INPUT';
}

export function isTextAreaElement(
  node: Node | null | undefined,
): node is HTMLTextAreaElement {
  return tagOf(node) === 'TEXTAREA';
}

export function isSelectElement(
  node: Node | null | undefined,
): node is HTMLSelectElement {
  return tagOf(node) === 'SELECT';
}

export function isIFrameElement(
  node: Node | null | undefined,
): node is HTMLIFrameElement {
  return tagOf(node) === 'IFRAME';
}

export function isDialogElement(
  node: Node | null | undefined,
): node is HTMLDialogElement {
  return tagOf(node) === 'DIALOG';
}

/**
 * HTMLElement has no single tag to test, so try both realms' constructors:
 * whichever one the node is associated with will match.
 */
export function isHTMLElement(
  node: Node | null | undefined,
): node is HTMLElement {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }
  if (node instanceof HTMLElement) {
    return true;
  }
  const view = node.ownerDocument?.defaultView as
    | (Window & typeof globalThis)
    | null
    | undefined;
  return !!view && node instanceof view.HTMLElement;
}

/** CSSRule.STYLE_RULE — numeric constants are realm-independent. */
export function isCSSStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return rule.type === CSSRule.STYLE_RULE;
}
