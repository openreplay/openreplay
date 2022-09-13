import type App from '../app/index.js'
import { SetViewportScroll, SetNodeScroll } from '../app/messages.gen.js'
import { isNode, isElementNode, isRootNode, isDocument } from '../app/guards.js'

function getDocumentScroll(doc: Document): [number, number] {
  const win = doc.defaultView
  return [
    (win && win.pageXOffset) ||
      (doc.documentElement && doc.documentElement.scrollLeft) ||
      (doc.body && doc.body.scrollLeft) ||
      0,
    (win && win.pageYOffset) ||
      (doc.documentElement && doc.documentElement.scrollTop) ||
      (doc.body && doc.body.scrollTop) ||
      0,
  ]
}

export default function (app: App): void {
  let documentScroll = false
  const nodeScroll: Map<Node, [number, number]> = new Map()

  function setNodeScroll(target: EventTarget | null) {
    if (!isNode(target)) {
      return
    }
    if (isElementNode(target)) {
      nodeScroll.set(target, [target.scrollLeft, target.scrollTop])
    }
    if (isDocument(target)) {
      nodeScroll.set(target, getDocumentScroll(target))
    }
  }

  const sendSetViewportScroll = app.safe((): void =>
    app.send(SetViewportScroll(...getDocumentScroll(document))),
  )

  const sendSetNodeScroll = app.safe((s: [number, number], node: Node): void => {
    const id = app.nodes.getID(node)
    if (id !== undefined) {
      app.send(SetNodeScroll(id, s[0], s[1]))
    }
  })

  app.attachStartCallback(sendSetViewportScroll)

  app.attachStopCallback(() => {
    documentScroll = false
    nodeScroll.clear()
  })

  app.nodes.attachNodeCallback((node, isStart) => {
    // MBTODO: iterate over all the nodes on start instead of using isStart hack
    if (isStart) {
      if (isElementNode(node) && node.scrollLeft + node.scrollTop > 0) {
        nodeScroll.set(node, [node.scrollLeft, node.scrollTop])
      } else if (isDocument(node)) {
        // DRY somehow?
        nodeScroll.set(node, getDocumentScroll(node))
      }
    }

    if (isRootNode(node)) {
      // scroll is not-composed event (https://javascript.info/shadow-dom-events)
      app.nodes.attachNodeListener(node, 'scroll', (e: Event): void => {
        setNodeScroll(e.target)
      })
    }
  })

  app.attachEventListener(document, 'scroll', (e: Event): void => {
    const target = e.target
    if (target === document) {
      documentScroll = true
      return
    }
    setNodeScroll(target)
  })

  app.ticker.attach(
    (): void => {
      if (documentScroll) {
        sendSetViewportScroll()
        documentScroll = false
      }
      nodeScroll.forEach(sendSetNodeScroll)
      nodeScroll.clear()
    },
    5,
    false,
  )
}
