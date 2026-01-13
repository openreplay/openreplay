import type App from '../app/index.js'
import { NodeAnimationResult } from '../app/messages.gen.js'

/**
 * this will only work for custom elements by default (because of ionic)
 */

export interface Options {
  allElements?: boolean
}

const toIgnore = ["composite", "computedOffset", "easing", "offset"]

function webAnimations(app: App, options: Options = {}) {
  const { allElements = false } = options
  let listening = new WeakSet<Node>()
  let handled = new WeakSet()
  function wire(anim, el, nodeId) {
    if (handled.has(anim)) return
    handled.add(anim)

    anim.addEventListener(
      'finish',
      () => {
        const lastKF = anim.effect.getKeyframes().at(-1)
        if (!lastKF) return
        const computedStyle = getComputedStyle(el)
        const keys = Object.keys(lastKF).filter((p) => !toIgnore.includes(p))
        // @ts-ignore
        const finalStyle = {}
        keys.forEach((key) => {
          finalStyle[key] = computedStyle[key]
        })
        app.send(NodeAnimationResult(nodeId, JSON.stringify(finalStyle)))
      },
      { once: true },
    )
  }

  function scanElement(el, nodeId) {
    el.getAnimations({ subtree: false }).forEach((anim) => wire(anim, el, nodeId))
  }

  app.nodes.attachNodeCallback((node) => {
    if ((allElements || node.nodeName.includes('-')) && 'getAnimations' in node) {
      const animations = (node as Element).getAnimations({ subtree: false })
      const id = app.nodes.getID(node)
      if (animations.length > 0 && !listening.has(node) && id) {
        listening.add(node)
        scanElement(node, id)
        node.addEventListener('animationstart', () => scanElement(node, id))
      }
    }
  })

  const origAnimate = Element.prototype.animate
  Element.prototype.animate = function (...args) {
    const anim = origAnimate.apply(this, args)
    const id = app.nodes.getID(this)
    if (!id) return anim;
    wire(anim, this, id)
    return anim
  }

  app.attachStopCallback(() => {
    Element.prototype.animate = origAnimate // Restore original animate method
    listening = new WeakSet<Node>()
    handled = new WeakSet()
  })
}

export default webAnimations
