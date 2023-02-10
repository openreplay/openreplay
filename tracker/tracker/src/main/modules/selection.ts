import type App from '../app/index.js'
import { SelectionChange } from '../app/messages.gen.js'

function selection(app: App) {
  app.attachEventListener(document, 'selectionchange', () => {
    const selection = document.getSelection()
    if (selection !== null && !selection.isCollapsed) {
      const selectionStart = app.nodes.getID(selection.anchorNode!)
      const selectionEnd = app.nodes.getID(selection.focusNode!)
      const selectedText = selection.toString().replace(/\s+/g, ' ')
      if (selectionStart && selectionEnd) {
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
