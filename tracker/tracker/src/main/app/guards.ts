//@ts-ignore
export function isNode(sth: any): sth is Node {
  return !!sth && sth.nodeType != null
}

export function isSVGElement(node: Element): node is SVGElement {
  return node.namespaceURI === 'http://www.w3.org/2000/svg'
}

export function isElementNode(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE
}

export function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE
}

export function isDocument(node: Node): node is Document {
  return node.nodeType === Node.DOCUMENT_NODE
}

export function isRootNode(node: Node): node is Document | DocumentFragment {
  return node.nodeType === Node.DOCUMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE
}

type TagTypeMap = {
  HTML: HTMLHtmlElement
  IMG: HTMLImageElement
  INPUT: HTMLInputElement
  TEXTAREA: HTMLTextAreaElement
  SELECT: HTMLSelectElement
  LABEL: HTMLLabelElement
  IFRAME: HTMLIFrameElement
  STYLE: HTMLStyleElement
  style: SVGStyleElement
  LINK: HTMLLinkElement
}
export function hasTag<T extends keyof TagTypeMap>(
  el: Node,
  tagName: T,
): el is TagTypeMap[typeof tagName] {
  return el.nodeName === tagName
}
