// TODO: global type
export interface Window extends globalThis.Window {
  HTMLInputElement: typeof HTMLInputElement,
  HTMLLinkElement: typeof HTMLLinkElement,
  HTMLStyleElement: typeof HTMLStyleElement,
  SVGStyleElement: typeof SVGStyleElement,
  HTMLIFrameElement: typeof HTMLIFrameElement,
  Text: typeof Text,
  Element: typeof Element,
  ShadowRoot: typeof ShadowRoot,
  //parent: Window,
}

type WindowConstructor = 
  Document |
  Element | 
  Text | 
  ShadowRoot |
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

 // TODO: we need a type expert here so we won't have to ignore the lines
 // TODO: use it everywhere (static function; export from which file? <-- global Window typing required)
export function isInstance<T extends WindowConstructor>(node: Node, constr: Constructor<T>): node is T {
  const doc = node.ownerDocument;
  if (!doc) { // null if Document
    return constr.name === 'Document';
  }
  let context: Window = 
    // @ts-ignore (for EI, Safary)
    doc.parentWindow || 
    doc.defaultView; // TODO: smart global typing for Window object
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

export function inDocument(node: Node): boolean {
  const doc = node.ownerDocument
  if (!doc) { return false }
  if (doc.contains(node)) { return true }
  let context: Window = 
    // @ts-ignore (for EI, Safary)
    doc.parentWindow || 
    doc.defaultView;
  while(context.parent && context.parent !== context) {
    if (context.document.contains(node)) {
      return true
    }
    // @ts-ignore
    context = context.parent
  }
  return false;
}
