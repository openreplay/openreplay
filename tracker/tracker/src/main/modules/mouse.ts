import type App from '../app/index.js'
import { hasTag, isSVGElement, isDocument } from '../app/guards.js'
import { normSpaces, hasOpenreplayAttribute, getLabelAttribute } from '../utils.js'
import { MouseMove, MouseClick } from '../app/messages.gen.js'
import { getInputLabel } from './input.js'

function _getSelector(target: Element, document: Document): string {
  let el: Element | null = target
  let selector: string | null = null
  do {
    if (el.id) {
      return `#${el.id}` + (selector ? ` > ${selector}` : '')
    }
    selector =
      el.className
        .split(' ')
        .map((cn) => cn.trim())
        .filter((cn) => cn !== '')
        .reduce((sel, cn) => `${sel}.${cn}`, el.tagName.toLowerCase()) +
      (selector ? ` > ${selector}` : '')
    if (el === document.body) {
      return selector
    }
    el = el.parentElement
  } while (el !== document.body && el !== null)
  return selector
}

function isClickable(element: Element): boolean {
  const tag = element.tagName.toUpperCase()
  return (
    tag === 'BUTTON' ||
    tag === 'A' ||
    tag === 'LI' ||
    tag === 'SELECT' ||
    (element as HTMLElement).onclick != null ||
    element.getAttribute('role') === 'button'
  )
  //|| element.className.includes("btn")
  // MBTODO: intersept addEventListener
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

export default function (app: App): void {
  function getTargetLabel(target: Element): string {
    const dl = getLabelAttribute(target)
    if (dl !== null) {
      return dl
    }
    if (hasTag(target, 'INPUT')) {
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

  app.attachStopCallback(() => {
    mousePositionX = -1
    mousePositionY = -1
    mousePositionChanged = false
    mouseTarget = null
    selectorMap = {}
  })

  const sendMouseMove = (): void => {
    if (mousePositionChanged) {
      app.send(MouseMove(mousePositionX, mousePositionY))
      mousePositionChanged = false
    }
  }

  const patchDocument = (document: Document, topframe = false) => {
    function getSelector(id: number, target: Element): string {
      return (selectorMap[id] = selectorMap[id] || _getSelector(target, document))
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
            getSelector(id, target),
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

  app.ticker.attach(sendMouseMove, 10)
}
