import type App from '../app/index.js'
import { hasTag, isSVGElement, isDocument } from '../app/guards.js'
import { normSpaces, hasOpenreplayAttribute, getLabelAttribute, now } from '../utils.js'
import { MouseMove, MouseClick, MouseThrashing } from '../app/messages.gen.js'
import { getInputLabel } from './input.js'
import { finder } from '@medv/finder'

function _getSelector(target: Element, document: Document, options?: MouseHandlerOptions): string {
  const selector = finder(target, {
    root: document.body,
    seedMinLength: 3,
    optimizedMinLength: options?.minSelectorDepth || 2,
    threshold: options?.nthThreshold || 1000,
    maxNumberOfTries: options?.maxOptimiseTries || 10_000,
  })

  return selector
}

function isClickable(element: Element): boolean {
  const tag = element.tagName.toUpperCase()
  return (
    tag === 'BUTTON' ||
    tag === 'A' ||
    tag === 'LI' ||
    tag === 'SELECT' ||
    tag === 'TR' ||
    tag === 'TH' ||
    (element as HTMLElement).onclick != null ||
    element.getAttribute('role') === 'button'
  )
  //|| element.className.includes("btn")
  // MBTODO: intercept addEventListener
}

//TODO: fix (typescript is not sure about target variable after assignation of svg)
function getTarget(target: EventTarget | null, document: Document): Element | null {
  if (target instanceof Element) {
    return _getTarget(target, document)
  }
  return null
}

function _getTarget(target: Element, document: Document): Element | null {
  let element: Element | null = target
  while (element !== null && element !== document.documentElement) {
    if (hasOpenreplayAttribute(element, 'masked')) {
      return null
    }
    element = element.parentElement
  }
  if (isSVGElement(target)) {
    let owner = target.ownerSVGElement
    while (owner !== null) {
      target = owner
      owner = owner.ownerSVGElement
    }
  }
  element = target
  while (element !== null && element !== document.documentElement) {
    const tag = element.tagName.toUpperCase()
    if (tag === 'LABEL') {
      return null
    }
    if (tag === 'INPUT') {
      return element
    }
    if (isClickable(element) || getLabelAttribute(element) !== null) {
      return element
    }
    element = element.parentElement
  }
  return target === document.documentElement ? null : target
}

export interface MouseHandlerOptions {
  disableClickmaps?: boolean
  /** minimum length of an optimised selector.
   *
   * body > div > div > p => body > p for example
   *
   * default 2
   * */
  minSelectorDepth?: number
  /** how many selectors to try before falling back to nth-child selectors
   * performance expensive operation
   *
   * default 1000
   * */
  nthThreshold?: number
  /**
   * how many tries to optimise and shorten the selector
   *
   * default 10_000
   * */
  maxOptimiseTries?: number
  /**
   * how many ticks to wait before capturing mouse position
   * (can affect performance)
   * 1 tick = 30ms
   * default 7
   * */
  trackingOffset?: number
}

export default function (app: App, options?: MouseHandlerOptions): void {
  const { disableClickmaps = false } = options || {}
  function getTargetLabel(target: Element): string {
    const dl = getLabelAttribute(target)
    if (dl !== null) {
      return dl
    }
    if (hasTag(target, 'input')) {
      return getInputLabel(target)
    }
    if (isClickable(target)) {
      let label = ''
      if (target instanceof HTMLElement) {
        label = app.sanitizer.getInnerTextSecure(target)
      }
      label = label || target.id || target.className
      return normSpaces(label).slice(0, 100)
    }
    return ''
  }

  let mousePositionX = -1
  let mousePositionY = -1
  let mousePositionChanged = false
  let mouseTarget: Element | null = null
  let mouseTargetTime = 0
  let selectorMap: { [id: number]: string } = {}

  let velocity = 0
  let direction = 0
  let directionChangeCount = 0
  let distance = 0
  let checkIntervalId: NodeJS.Timer
  const shakeThreshold = 0.008
  const shakeCheckInterval = 225

  function checkMouseShaking() {
    const nextVelocity = distance / shakeCheckInterval

    if (!velocity) {
      velocity = nextVelocity
      return
    }

    const acceleration = (nextVelocity - velocity) / shakeCheckInterval
    if (directionChangeCount > 4 && acceleration > shakeThreshold) {
      app.send(MouseThrashing(now()))
    }

    distance = 0
    directionChangeCount = 0
    velocity = nextVelocity
  }

  app.attachStartCallback(() => {
    checkIntervalId = setInterval(() => checkMouseShaking(), shakeCheckInterval)
  })

  app.attachStopCallback(() => {
    mousePositionX = -1
    mousePositionY = -1
    mousePositionChanged = false
    mouseTarget = null
    selectorMap = {}
    if (checkIntervalId) {
      clearInterval(checkIntervalId as unknown as number)
    }
  })

  const sendMouseMove = (): void => {
    if (mousePositionChanged) {
      app.send(MouseMove(mousePositionX, mousePositionY))
      mousePositionChanged = false
    }
  }

  const patchDocument = (document: Document, topframe = false) => {
    function getSelector(id: number, target: Element, options?: MouseHandlerOptions): string {
      return (selectorMap[id] = selectorMap[id] || _getSelector(target, document, options))
    }

    const attachListener = topframe
      ? app.attachEventListener.bind(app) // attached/removed on start/stop
      : app.nodes.attachNodeListener.bind(app.nodes) // attached/removed on node register/unregister

    attachListener(document.documentElement, 'mouseover', (e: MouseEvent): void => {
      const target = getTarget(e.target, document)
      if (target !== mouseTarget) {
        mouseTarget = target
        mouseTargetTime = performance.now()
      }
    })
    attachListener(
      document,
      'mousemove',
      (e: MouseEvent): void => {
        const [left, top] = app.observer.getDocumentOffset(document) // MBTODO?: document-id related message
        mousePositionX = e.clientX + left
        mousePositionY = e.clientY + top
        mousePositionChanged = true

        const nextDirection = Math.sign(e.movementX)
        distance += Math.abs(e.movementX) + Math.abs(e.movementY)

        if (nextDirection !== direction) {
          direction = nextDirection
          directionChangeCount++
        }
      },
      false,
    )
    attachListener(document, 'click', (e: MouseEvent): void => {
      const target = getTarget(e.target, document)
      if ((!e.clientX && !e.clientY) || target === null) {
        return
      }
      const id = app.nodes.getID(target)
      if (id !== undefined) {
        sendMouseMove()
        app.send(
          MouseClick(
            id,
            mouseTarget === target ? Math.round(performance.now() - mouseTargetTime) : 0,
            getTargetLabel(target),
            isClickable(target) && !disableClickmaps ? getSelector(id, target, options) : '',
          ),
          true,
        )
      }
      mouseTarget = null
    })
  }

  app.nodes.attachNodeCallback((node) => {
    if (isDocument(node)) {
      patchDocument(node)
    }
  })
  patchDocument(document, true)

  app.ticker.attach(sendMouseMove, options?.trackingOffset || 7)
}
