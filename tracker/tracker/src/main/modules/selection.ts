import type App from '../app/index.js'
import { isTextNode } from '../app/guards.js'
import { SelectionChange } from '../app/messages.gen.js'
import { stringWiper } from '../app/sanitizer.js'
import { firstChild, nextSibling, parentNode } from '../app/untaintedDom.js'

/** First node after `n` and its subtree, in document order. */
function following(n: Node): Node | null {
  for (let x: Node | null = n; x !== null; x = parentNode(x)) {
    const next = nextSibling(x)
    if (next !== null) return next
  }
  return null
}

/** `n.childNodes[offset]` without the page-patchable `childNodes` (e.g. LWC synthetic shadow) */
function childAt(n: Node, offset: number): Node | null {
  let c = firstChild(n)
  for (let i = 0; c !== null && i < offset; i++) c = nextSibling(c)
  return c
}

function isCharacterData(n: Node) {
  return n.nodeType === Node.TEXT_NODE || n.nodeType === Node.CDATA_SECTION_NODE || n.nodeType === Node.COMMENT_NODE
}

/** Any element in the range masked by its level (attributes, domSanitizer, inheritance). */
function rangeHasMasked(app: App, range: Range): boolean {
  const sc = range.startContainer
  const ec = range.endContainer
  let n: Node | null = isCharacterData(sc) ? sc : (childAt(sc, range.startOffset) ?? following(sc))
  const stop = isCharacterData(ec) ? following(ec) : (childAt(ec, range.endOffset) ?? following(ec))
  while (n !== null && n !== stop) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      const id = app.nodes.getID(n)
      if (id !== undefined && app.sanitizer.isObscured(id)) return true
    }
    n = firstChild(n) ?? following(n)
  }
  return false
}

/** obscureTextEmails/-Numbers rewrite it; an email cut by an end matches only in its node */
function rewritesText(app: App, sel: Selection, text: string, start: number, end: number): boolean {
  const s = app.sanitizer
  const cut = (n: Node | null, id: number) =>
    n !== null && isTextNode(n) && s.sanitize(id, n.data) !== n.data
  return s.sanitize(start, text) !== text || cut(sel.anchorNode, start) || cut(sel.focusNode, end)
}

/** Firefox's toString() includes a textarea's default value, where React keeps typed text */
function rangeHasTextarea(range: Range): boolean {
  const ca = range.commonAncestorContainer
  if (ca.nodeType !== Node.ELEMENT_NODE && ca.nodeType !== Node.DOCUMENT_NODE) return false
  const fields = (ca as Element).getElementsByTagName('textarea')
  for (let i = 0; i < fields.length; i++) {
    if (fields[i].defaultValue.trim() && range.intersectsNode(fields[i])) return true
  }
  return false
}

function touchesMasked(app: App, selection: Selection, start: number, end: number): boolean {
  const sanitizer = app.sanitizer
  if (sanitizer.privateMode || sanitizer.isObscured(start) || sanitizer.isObscured(end)) {
    return true
  }
  return sanitizer.hasMasked() && rangeHasMasked(app, selection.getRangeAt(0))
}

function selection(app: App) {
  // a caret move in a text field fires selectionchange too
  let selected = false
  app.attachEventListener(document, 'selectionchange', () => {
    const selection = document.getSelection()
    if (selection !== null && !selection.isCollapsed) {
      const selectionStart = app.nodes.getID(selection.anchorNode!)
      const selectionEnd = app.nodes.getID(selection.focusNode!)
      if (selectionStart && selectionEnd) {
        let selectedText = selection.toString().replace(/\s+/g, ' ')
        if (
          touchesMasked(app, selection, selectionStart, selectionEnd) ||
          rangeHasTextarea(selection.getRangeAt(0)) ||
          rewritesText(app, selection, selectedText, selectionStart, selectionEnd)
        ) {
          selectedText = stringWiper(selectedText)
        }
        selected = true
        app.send(SelectionChange(selectionStart, selectionEnd, selectedText))
      }
    } else if (selected) {
      selected = false
      app.send(SelectionChange(-1, -1, ''))
    }
  })
}

export default selection
