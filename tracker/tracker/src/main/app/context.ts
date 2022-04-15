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
  while(context !== window) {
    // @ts-ignore
    if (node instanceof context[constr.name]) {
      return true
    }
    // @ts-ignore
    context = context.parent || window
  }
  // @ts-ignore
  return node instanceof context[constr.name]
}

// TODO: ensure 1. it works in every cases (iframes/detached nodes) and 2. the most efficient
export function inDocument(node: Node) {
  const doc = node.ownerDocument
  if (!doc) { return true } // Document
  let current: Node | null = node
  while(current) {
    if (current === doc) {
      return true
    } else if(isInstance(current, ShadowRoot)) {
      current = current.host
    } else {
      current = current.parentNode
    }
  }
  return false
}

// export function inDocument(node: Node): boolean {
//   // @ts-ignore compatability
//   if (node.getRootNode) {
//     let root: Node
//     while ((root = node.getRootNode()) !== node) {
//        ////
//     }
//   }

//   const doc = node.ownerDocument
//   if (!doc) { return false }
//   if (doc.contains(node)) { return true }
//   let context: Window = 
//     // @ts-ignore (for EI, Safary)
//     doc.parentWindow || 
//     doc.defaultView;
//   while(context.parent && context.parent !== context) {
//     if (context.document.contains(node)) {
//       return true
//     }
//     // @ts-ignore
//     context = context.parent
//   }
//   return false;
// }
