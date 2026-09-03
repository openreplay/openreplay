import type App from '../app/index.js'
import { hasTag, isSVGElement, isDocument } from '../app/guards.js'
import {
  hasOpenreplayAttribute,
  getLabelAttribute,
  getCustomAttributeLabel,
  getCustomAttributeSelector,
  getTextualLabel,
  cssEscape,
  cssAttrValue,
  now,
} from '../utils.js'
import { MouseMove, MouseClick, MouseThrashing } from '../app/messages.gen.js'
import { getInputLabel } from './input.js'


const docClassCache = new WeakMap();

function _getSelector(target: Element, customAttributes?: string[]): string {
  const selector = getCSSPath(target, customAttributes)
  return selector || ''
}

/**
 * short selector for elements we don't build a full css path for
 * (non-clickable targets, or a label fallback when clickmaps are off)
 * */
function getCheapSelector(target: Element, customAttributes?: string[]): string {
  const attributeSelector = getCustomAttributeSelector(target, customAttributes)
  if (attributeSelector) return attributeSelector
  if (target.id) return `#${cssEscape(target.id)}`
  const uniqueClass = getUniqueWordLikeClass(target)
  return uniqueClass ? `${target.tagName.toLowerCase()}.${cssEscape(uniqueClass)}` : ''
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

const CLICKABLE_ROLES = [
  'button',
  'link',
  'tab',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'checkbox',
  'radio',
  'switch',
  'combobox',
]
const MAX_POINTER_CLIMB = 6
const pointerCursorCache = new WeakMap<Element, boolean>()

function hasPointerCursor(element: Element): boolean {
  const cached = pointerCursorCache.get(element)
  if (cached !== undefined) return cached
  let isPointer = false
  try {
    const view = element.ownerDocument.defaultView
    isPointer = !!view && view.getComputedStyle(element).cursor === 'pointer'
  } catch {
    isPointer = false
  }
  pointerCursorCache.set(element, isPointer)
  return isPointer
}

/**
 * framework handlers (react & co) are delegated to the root, so onclick is null
 * on the div that visually is a button; these signals catch it instead.
 * computed style forces a style recalc, so it is only used on the click path
 * */
function looksClickable(element: Element): boolean {
  return (
    element.hasAttribute('onclick') ||
    element.tagName.toUpperCase() === 'SUMMARY' ||
    (element as HTMLElement).isContentEditable === true ||
    CLICKABLE_ROLES.includes(element.getAttribute('role') || '') ||
    (element as HTMLElement).tabIndex >= 0
  )
}

export function isDeepClickable(element: Element): boolean {
  return isClickable(element) || looksClickable(element) || hasPointerCursor(element)
}

/**
 * cursor is inherited, so every child of a clickable div reports a pointer too;
 * climb to the outermost element that still owns the pointer
 * */
export function resolvePointerRoot(element: Element): Element {
  let result = element
  let parent = element.parentElement
  for (let depth = 0; parent !== null && depth < MAX_POINTER_CLIMB; depth++) {
    if (parent === element.ownerDocument.documentElement || parent === element.ownerDocument.body) {
      return result
    }
    if (isClickable(parent) || looksClickable(parent)) return parent
    if (!hasPointerCursor(parent)) return result
    result = parent
    parent = parent.parentElement
  }
  return result
}

//TODO: fix (typescript is not sure about target variable after assignation of svg)
function getTarget(target: EventTarget | null, document: Document, deep = false): Element | null {
  if (target instanceof Element) {
    return _getTarget(target, document, deep)
  }
  return null
}

function _getTarget(target: Element, document: Document, deep = false): Element | null {
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
    if (deep) {
      if (looksClickable(element)) {
        return element
      }
      if (hasPointerCursor(element)) {
        return resolvePointerRoot(element)
      }
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
  customAttributes?: string[]
}

export default function (app: App, options?: MouseHandlerOptions): void {
  const { disableClickmaps = false, customAttributes } = options || {}

  /** innerText exists on html elements only, svg/jsdom nodes would break the sanitizer */
  const getSecureInnerText = (el: HTMLElement) =>
    typeof el.innerText === 'string' ? app.sanitizer.getInnerTextSecure(el) : ''

  function getTargetLabel(target: Element): string {
    const dl = getLabelAttribute(target)
    if (dl !== null) {
      return dl
    }
    if (hasTag(target, 'input')) {
      return getInputLabel(target, customAttributes)
    }
    const customAttributeLabel = getCustomAttributeLabel(target, customAttributes)
    if (customAttributeLabel) return customAttributeLabel
    return getTextualLabel(target, getSecureInnerText)
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

  /** hover is resolved without the computed style check, so it can land on a relative */
  const isHesitationTarget = (target: Element) =>
    mouseTarget === target ||
    (mouseTarget !== null && (target.contains(mouseTarget) || mouseTarget.contains(target)))

  const sendMouseMove = (): void => {
    if (mousePositionChanged) {
      app.send(MouseMove(mousePositionX, mousePositionY))
      mousePositionChanged = false
    }
  }

  const patchDocument = (document: Document, topframe = false) => {
    function getSelector(id: number, target: Element): string {
      if (selectorMap[id]) return selectorMap[id]
      const tagMatch = app.tagMatcher.match(target)
      if (tagMatch) {
        return (selectorMap[id] = tagMatch.selector)
      }
      if (!isDeepClickable(target)) {
        const cheapSelector = getCheapSelector(target, customAttributes)
        if (cheapSelector) return (selectorMap[id] = cheapSelector)
      }
      return (selectorMap[id] = _getSelector(target, customAttributes))
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
      const target = getTarget(e.target, document, true)
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
        const selector = disableClickmaps ? '' : getSelector(id, target)
        // backend drops clicks without a label, so a selector is the last resort
        const label =
          getTargetLabel(target) || selector || getCheapSelector(target, customAttributes)
        app.send(
          MouseClick(
            id,
            isHesitationTarget(target) ? Math.round(performance.now() - mouseTargetTime) : 0,
            app.sanitizer.privateMode ? label.replaceAll(/./g, '*') : label,
            selector,
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

export function getCSSPath(el: any, customAttributes?: string[]) {
    if (!el || el.nodeType !== 1) return false;

    // customer configured attributes are the most stable thing we can get
    const customAttr = getCustomAttributeSelector(el, customAttributes);
    if (customAttr) return customAttr;
    if (el.id) return `#${cssEscape(el.id)}`;
    // if has data attributes - use them as they are more likely to be stable and unique
    const dataAttr = (Array.from(el.attributes) as Attr[]).find(attr => attr.name.startsWith('data-'));
    if (dataAttr) {
        return `[${dataAttr.name}="${cssAttrValue(dataAttr.value)}"]`;
    }
    const parts: string[] = [];

    while (el && el.nodeType === 1 && el !== el.ownerDocument) {
        const ancestorAttr = getCustomAttributeSelector(el, customAttributes);
        if (ancestorAttr) {
            parts.unshift(ancestorAttr);
            break;
        }
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

function getUniqueWordLikeClass(el: Element): string | null {
    if (!el.classList?.length) return null;
    for (const cls of Array.from(el.classList)) {
        if (wordLike(cls) && isDocUniqueClass(cls, el.ownerDocument)) return cls;
    }
    return null;
}

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
