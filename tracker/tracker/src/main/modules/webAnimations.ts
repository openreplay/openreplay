import type App from '../app/index.js'
import { NodeAnimationResult } from '../app/messages.gen.js'
import { isRootNode } from '../app/guards.js'

/**
 * this will only work for custom elements by default (because of ionic)
 */

export interface Options {
  allElements?: boolean
}

const toIgnore = ["composite", "computedOffset", "easing", "offset"]

// CSS animations and transitions are replayed by the player from the stylesheets
const isScriptAnimation = (anim: Animation) =>
  !(typeof CSSAnimation !== 'undefined' && anim instanceof CSSAnimation) &&
  !(typeof CSSTransition !== 'undefined' && anim instanceof CSSTransition)

function webAnimations(app: App, options: Options = {}) {
  const { allElements = false } = options
  let listening = new WeakSet<Node>()
  let handled = new WeakSet()
  // animations whose target had no id yet: created right before the node was observed, or
  // already running/finished when tracking (re)started (e.g. an open overlay when an Assist agent joins)
  let pending = new WeakMap<Element, Animation[]>()

  function sendResult(anim, el, nodeId) {
    const lastKF = anim.effect?.getKeyframes().at(-1)
    if (!lastKF) return
    // no instanceof, and the element's own window: it may live in an iframe
    if (!el || el.nodeType !== Node.ELEMENT_NODE || !el.isConnected) return
    const computedStyle = (el.ownerDocument.defaultView ?? window).getComputedStyle(el)
    const keys = Object.keys(lastKF).filter((p) => !toIgnore.includes(p))
    // @ts-ignore
    const finalStyle = {}
    keys.forEach((key) => {
      finalStyle[key] = computedStyle[key]
    })
    app.send(NodeAnimationResult(nodeId, JSON.stringify(finalStyle)))
  }

  function wire(anim, el, nodeId) {
    if (handled.has(anim)) return
    handled.add(anim)
    if (anim.playState === 'finished') {
      const fill = anim.effect?.getComputedTiming?.().fill
      // after the node's own messages
      if (fill === 'forwards' || fill === 'both') queueMicrotask(() => sendResult(anim, el, nodeId))
      return
    }
    anim.addEventListener('finish', () => sendResult(anim, el, nodeId), { once: true })
  }

  function track(anim: Animation) {
    const el = (anim.effect as KeyframeEffect | null)?.target
    if (!el || !isScriptAnimation(anim)) return
    const id = app.nodes.getID(el)
    if (id !== undefined) {
      wire(anim, el, id)
      return
    }
    const list = pending.get(el)
    if (list) list.push(anim)
    else pending.set(el, [anim])
  }

  function scanElement(el, nodeId) {
    el.getAnimations({ subtree: false }).forEach((anim) => wire(anim, el, nodeId))
  }

  app.nodes.attachNodeCallback((node) => {
    if (isRootNode(node)) {
      // document.getAnimations() doesn't include shadow trees
      if (node instanceof ShadowRoot && 'getAnimations' in node) node.getAnimations().forEach(track)
      return
    }
    const waiting = pending.get(node as Element)
    if (waiting) {
      pending.delete(node as Element)
      const id = app.nodes.getID(node)
      if (id !== undefined) waiting.forEach((anim) => wire(anim, node, id))
    }
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
  const animate = function (this: Element, ...args: Parameters<Element['animate']>) {
    const anim = origAnimate.apply(this, args)
    track(anim)
    return anim
  }

  // patched per start: the stop callback restores the original, and Assist restarts tracking
  // whenever an agent joins
  app.attachStartCallback(() => {
    Element.prototype.animate = animate
    document.getAnimations?.().forEach(track)
  })

  app.attachStopCallback(() => {
    if (Element.prototype.animate === animate) Element.prototype.animate = origAnimate
    listening = new WeakSet<Node>()
    handled = new WeakSet()
    pending = new WeakMap()
  })
}

export default webAnimations
