import type App from '../app/index.js'
import { SetViewportScroll, SetNodeScroll } from '../app/messages.gen.js'
import { isElementNode, isRootNode } from '../app/guards.js'

export default function (app: App): void {
  let documentScroll = false
  const nodeScroll: Map<Node, [number, number]> = new Map()

  function setNodeScroll(target: EventTarget | null) {
    if (target instanceof Element) {
      nodeScroll.set(target, [target.scrollLeft, target.scrollTop])
    }
  }

  const sendSetViewportScroll = app.safe((): void =>
    app.send(
      SetViewportScroll(
        window.pageXOffset ||
          (document.documentElement && document.documentElement.scrollLeft) ||
          (document.body && document.body.scrollLeft) ||
          0,
        window.pageYOffset ||
          (document.documentElement && document.documentElement.scrollTop) ||
          (document.body && document.body.scrollTop) ||
          0,
      ),
    ),
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
    if (isStart && isElementNode(node) && node.scrollLeft + node.scrollTop > 0) {
      nodeScroll.set(node, [node.scrollLeft, node.scrollTop])
    } else if (isRootNode(node)) {
      // scroll is not-composed event (https://javascript.info/shadow-dom-events)
      app.attachEventListener(node, 'scroll', (e: Event): void => {
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
