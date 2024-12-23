//@ts-ignore
export function isNode(sth: any): sth is Node {
  return !!sth && sth.nodeType != null
}

export function isSVGElement(node: Element): node is SVGElement {
  return (
    node.namespaceURI === 'http://www.w3.org/2000/svg' || node.localName === 'svg'
  )
}

export function isUseElement(node: Element): node is SVGUseElement {
  return node.localName === 'use'
}

export function isElementNode(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE
}

export function isCommentNode(node: Node): node is Comment {
  return node.nodeType === Node.COMMENT_NODE
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
  html: HTMLHtmlElement
  body: HTMLBodyElement
  img: HTMLImageElement
  input: HTMLInputElement
  textarea: HTMLTextAreaElement
  select: HTMLSelectElement
  label: HTMLLabelElement
  iframe: HTMLIFrameElement
  style: HTMLStyleElement | SVGStyleElement
  link: HTMLLinkElement
  canvas: HTMLCanvasElement
}
export function hasTag<T extends keyof TagTypeMap>(
  el: Node,
  tagName: T,
): el is TagTypeMap[typeof tagName] {
  // @ts-ignore
  return el.localName === tagName
}
