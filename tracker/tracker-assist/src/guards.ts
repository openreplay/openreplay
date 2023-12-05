
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