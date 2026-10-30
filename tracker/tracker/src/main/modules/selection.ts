import type App from '../app/index.js'
import { SelectionChange } from '../app/messages.gen.js'
import { stringWiper } from '../app/sanitizer.js'

// Selected text is read from the live page, so wipe it when it covers masked text.
function touchesObscured(app: App, selection: Selection): boolean {
  for (let i = 0; i < selection.rangeCount; i++) {
    if (app.sanitizer.intersectsObscured(selection.getRangeAt(i))) return true
  }
  return false
}

function selection(app: App) {
  app.attachEventListener(document, 'selectionchange', () => {
    const selection = document.getSelection()
    if (selection !== null && !selection.isCollapsed) {
      const selectionStart = app.nodes.getID(selection.anchorNode!)
      const selectionEnd = app.nodes.getID(selection.focusNode!)
      if (selectionStart && selectionEnd) {
        const text = selection.toString().replace(/\s+/g, ' ')
        const selectedText = touchesObscured(app, selection) ? stringWiper(text) : text
        app.send(SelectionChange(selectionStart, selectionEnd, selectedText))
      }
    } else {
      app.send(SelectionChange(-1, -1, ''))
    }
  })
}

export default selection

/** TODO: research how to get all in-between nodes inside selection range
 *        including nodes between anchor and focus nodes and their children
 *        without recursively searching the dom tree
 */

// if (selection.rangeCount) {
//   const nodes = [];
//   for (let i = 0; i < selection.rangeCount; i++) {
//     const range = selection.getRangeAt(i);
//     let node: Node | null = range.startContainer;
//     while (node) {
//       nodes.push(node);
//       if (node === range.endContainer) break;
//       node = node.nextSibling;
//     }
//   }
//   // send selected nodes
// }
