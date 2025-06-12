import type App from '../app/index.js'
import { hasTag, isSVGElement, isDocument } from '../app/guards.js'
import { normSpaces, hasOpenreplayAttribute, getLabelAttribute, now } from '../utils.js'
import { MouseMove, MouseClick, MouseThrashing } from '../app/messages.gen.js'
import { getInputLabel } from './input.js'


const cssEscape = (typeof CSS !== 'undefined' && CSS.escape) || ((t) => t);
const docClassCache = new WeakMap();

function _getSelector(target: Element, document: Document, options?: MouseHandlerOptions): string {
  const selector = getCSSPath(target)
  return selector || ''
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
  /**
   * how many ticks to wait before capturing mouse position
   * (can affect performance)
   * 1 tick = 30ms
   * default 7 = 210ms
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
  let checkIntervalId: ReturnType<typeof setInterval>
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
    function getSelector(id: number, target: Element): string {
      return (selectorMap[id] = selectorMap[id] || _getSelector(target))
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
        const clickX = e.pageX
        const clickY = e.pageY

        const contentWidth = document.documentElement.scrollWidth
        const contentHeight = document.documentElement.scrollHeight

        const normalizedX = roundNumber(clickX / contentWidth)
        const normalizedY = roundNumber(clickY / contentHeight)

        sendMouseMove()
        const label = getTargetLabel(target)
        app.send(
          MouseClick(
            id,
            mouseTarget === target ? Math.round(performance.now() - mouseTargetTime) : 0,
            app.sanitizer.privateMode ? label.replaceAll(/./g, '*') : label,
            isClickable(target) && !disableClickmaps ? getSelector(id, target) : '',
            normalizedX,
            normalizedY,
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

/**
 * we get 0 to 1 decimal number, convert and round it, then turn to %
 * 0.39643 => 396.43 => 396 => 39.6%
 * */
function roundNumber(num: number) {
  return Math.round(num * 1e4)
}

function isDocUniqueClass(cls: string, doc: Document): boolean {
    let cache = docClassCache.get(doc);
    if (!cache) {
        cache = Object.create(null);
        docClassCache.set(doc, cache);
    }
    if (cls in cache) return cache[cls];
    const unique = doc.querySelectorAll(`.${cssEscape(cls)}`).length === 1;
    cache[cls] = unique;
    return unique;
};

function wordLike(name: string): boolean {
    if (/^[a-z\-]{3,}$/i.test(name)) {
        const words = name.split(/-|[A-Z]/)
        for (const word of words) {
            if (word.length <= 2) {
                return false
            }
            if (/[^aeiou]{4,}/i.test(word)) {
                return false
            }
        }
        return true
    }
    return false
}

export function getCSSPath(el) {
    if (!el || el.nodeType !== 1) return false;

    if (el.id) return `#${cssEscape(el.id)}`;

    const parts: string[] = [];

    while (el && el.nodeType === 1 && el !== el.ownerDocument) {
        if (el.id) {
            parts.unshift(`#${cssEscape(el.id)}`);
            break;
        }

        const tag = el.tagName.toLowerCase();

        if (el.classList?.length) {
            for (const cls of el.classList) {
                if (wordLike(cls) && isDocUniqueClass(cls, el.ownerDocument) ) {
                    parts.unshift(`${tag}.${cssEscape(cls)}`);
                    return parts.join(' > ');
                }
            }
        }

        const sibCls = getUniqueSiblingClass(el);
        if (sibCls) {
            parts.unshift(`${tag}.${cssEscape(sibCls)}`);
        } else if (
            el === el.ownerDocument.body ||
            el === el.ownerDocument.documentElement
        ) {
            parts.unshift(tag);
        } else {
            let idx = 1;
            for (let sib = el.previousElementSibling; sib; sib = sib.previousElementSibling) {
                if (sib.tagName.toLowerCase() === tag) idx++;
            }
            parts.unshift(`${tag}:nth-of-type(${idx})`);
        }

        el = el.parentNode;
    }

    return parts.join(' > ');
};

function getUniqueSiblingClass(el) {
    if (!el.classList?.length || !el.parentNode) return null;

    const sibs = el.parentNode.children;

    outer: for (const cls of el.classList) {
        if (!wordLike(cls) || !isDocUniqueClass(cls, el.ownerDocument)) continue;
        for (const sib of sibs) {
            if (sib !== el && sib.classList?.contains(cls)) continue outer;
        }
        return cls;
    }
    return null;
}
