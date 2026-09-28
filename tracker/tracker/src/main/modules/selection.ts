import type App from '../app/index.js'
import { SelectionChange } from '../app/messages.gen.js'
import { stringWiper } from '../app/sanitizer.js'

const MASKED =
  '[data-openreplay-obscured],[data-openreplay-masked],[data-openreplay-hidden],[data-openreplay-htmlmasked]'

function touchesMasked(app: App, selection: Selection, start: number, end: number): boolean {
  if (app.sanitizer.privateMode || app.sanitizer.isObscured(start) || app.sanitizer.isObscured(end)) {
    return true
  }
  // masked content strictly inside the range (endpoints are plain)
  const range = selection.getRangeAt(0)
  const masked = document.querySelectorAll(MASKED)
  for (let i = 0; i < masked.length; i++) {
    if (range.intersectsNode(masked[i])) return true
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
        let selectedText = selection.toString().replace(/\s+/g, ' ')
        if (touchesMasked(app, selection, selectionStart, selectionEnd)) {
          selectedText = stringWiper(selectedText)
        }
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
