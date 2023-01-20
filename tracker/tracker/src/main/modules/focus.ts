import type App from '../app/index.js'
import { isNode, hasTag } from '../app/guards.js'
import { SetNodeFocus } from '../app/messages.gen.js'

export default function (app: App): void {
  function sendSetNodeFocus(n: Node) {
    const id = app.nodes.getID(n)
    if (id !== undefined) {
      app.send(SetNodeFocus(id))
    }
  }

  let blurred = false
  app.nodes.attachNodeCallback((node) => {
    if (!hasTag(node, 'body')) {
      return
    }
    app.nodes.attachNodeListener(node, 'focus', (e: FocusEvent): void => {
      if (!isNode(e.target)) {
        return
      }
      sendSetNodeFocus(e.target)
      blurred = false
    })
    app.nodes.attachNodeListener(node, 'blur', (e: FocusEvent): void => {
      if (e.relatedTarget === null) {
        blurred = true
        setTimeout(() => {
          if (blurred) {
            app.send(SetNodeFocus(-1))
          }
        }, 0)
      }
    })
  })
  app.attachStartCallback(() => {
    let elem = document.activeElement
    while (elem && hasTag(elem, 'iframe') && elem.contentDocument) {
      elem = elem.contentDocument.activeElement
    }
    if (elem && elem !== elem.ownerDocument.body) {
      sendSetNodeFocus(elem)
    }
  }, true)
}
