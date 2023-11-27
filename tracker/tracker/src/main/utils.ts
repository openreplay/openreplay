const DEPRECATED_ATTRS = { htmlmasked: 'hidden', masked: 'obscured' }

export const IN_BROWSER = !(typeof window === 'undefined')

export const IS_FIREFOX = IN_BROWSER && navigator.userAgent.match(/firefox|fxios/i)

export const MAX_STR_LEN = 1e5

// Buggy to use `performance.timeOrigin || performance.timing.navigationStart`
// https://github.com/mdn/content/issues/4713
// Maybe move to timer/ticker
let timeOrigin: number = IN_BROWSER ? Date.now() - performance.now() : 0
export function adjustTimeOrigin() {
  timeOrigin = Date.now() - performance.now()
}
export function getTimeOrigin() {
  return timeOrigin
}
export const now: () => number =
  IN_BROWSER && !!performance.now
    ? () => Math.round(performance.now() + timeOrigin)
    : () => Date.now()

export const stars: (str: string) => string =
  'repeat' in String.prototype
    ? (str: string): string => '*'.repeat(str.length)
    : (str: string): string => str.replace(/./g, '*')

export function normSpaces(str: string): string {
  return str.trim().replace(/\s+/g, ' ')
}

// isAbsoluteUrl regexp:  /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url)
export function isURL(s: string): boolean {
  return s.startsWith('https://') || s.startsWith('http://')
}

// TODO: JOIN IT WITH LOGGER somehow (use logging decorators?); Don't forget about index.js loggin when there is no logger instance.

export const DOCS_HOST = 'https://docs.openreplay.com'

const warnedFeatures: { [key: string]: boolean } = {}
export function deprecationWarn(nameOfFeature: string, useInstead: string, docsPath = '/'): void {
  if (warnedFeatures[nameOfFeature]) {
    return
  }
  console.warn(
    `OpenReplay: ${nameOfFeature} is deprecated. ${
      useInstead ? `Please, use ${useInstead} instead.` : ''
    } Visit ${DOCS_HOST}${docsPath} for more information.`,
  )
  warnedFeatures[nameOfFeature] = true
}

export function getLabelAttribute(e: Element): string | null {
  let value = e.getAttribute('data-openreplay-label')
  if (value !== null) {
    return value
  }
  value = e.getAttribute('data-asayer-label')
  if (value !== null) {
    deprecationWarn('"data-asayer-label" attribute', '"data-openreplay-label" attribute', '/')
  }
  return value
}

export function hasOpenreplayAttribute(e: Element, attr: string): boolean {
  const newName = `data-openreplay-${attr}`
  if (e.hasAttribute(newName)) {
    // @ts-ignore
    if (DEPRECATED_ATTRS[attr]) {
      deprecationWarn(
        `"${newName}" attribute`,
        // @ts-ignore
        `"${DEPRECATED_ATTRS[attr] as string}" attribute`,
        '/installation/sanitize-data',
      )
    }
    return true
  }

  return false
}

/**
 * checks if iframe is accessible
 **/
export function canAccessIframe(iframe: HTMLIFrameElement) {
  try {
    return Boolean(iframe.contentDocument)
  } catch (e) {
    return false
  }
}

function dec2hex(dec: number) {
  return dec.toString(16).padStart(2, '0')
}

export function generateRandomId(len?: number) {
  const arr: Uint8Array = new Uint8Array((len || 40) / 2)
  // msCrypto = IE11
  // @ts-ignore
  const safeCrypto = window.crypto || window.msCrypto
  safeCrypto.getRandomValues(arr)
  return Array.from(arr, dec2hex).join('')
}

export function inIframe() {
  try {
    return window.self !== window.top
  } catch (e) {
    return true
  }
}

/**
 * Because angular devs decided that its a good idea to override a browser apis
 * we need to use this to achieve safe behavior
 * */
export function ngSafeBrowserMethod(method: string): string {
  // @ts-ignore
  return window.Zone && '__symbol__' in window.Zone
    ? // @ts-ignore
      window['Zone']['__symbol__'](method)
    : method
}

export function createMutationObserver(cb: MutationCallback) {
  const mObserver = ngSafeBrowserMethod('MutationObserver') as 'MutationObserver'
  return new window[mObserver](cb)
}

export function createEventListener(
  target: EventTarget,
  event: string,
  cb: EventListenerOrEventListenerObject,
  capture?: boolean,
) {
  const safeAddEventListener = ngSafeBrowserMethod('addEventListener') as 'addEventListener'
  try {
    target[safeAddEventListener](event, cb, capture)
  } catch (e) {
    console.debug(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `Openreplay: ${e.messages}; if this error is caused by an IframeObserver, ignore it`,
    )
  }
}

export function deleteEventListener(
  target: EventTarget,
  event: string,
  cb: EventListenerOrEventListenerObject,
  capture?: boolean,
) {
  const safeRemoveEventListener = ngSafeBrowserMethod(
    'removeEventListener',
  ) as 'removeEventListener'
  try {
    target[safeRemoveEventListener](event, cb, capture)
  } catch (e) {
    console.debug(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `Openreplay: ${e.messages}; if this error is caused by an IframeObserver, ignore it`,
    )
  }
}

/**
 * This is a brief polyfill that suits our needs
 * I took inspiration from Microsoft Clarity polyfill on this one
 * then adapted it a little bit
 *
 * I'm very grateful for their bright idea
 * */
export function requestIdleCb(callback: () => void) {
  const taskTimeout = 3000
  if (window.requestIdleCallback) {
    return window.requestIdleCallback(callback, { timeout: taskTimeout })
  } else {
    const channel = new MessageChannel()
    const incoming = channel.port1
    const outgoing = channel.port2

    incoming.onmessage = (): void => {
      callback()
    }
    requestAnimationFrame((): void => {
      outgoing.postMessage(1)
    })
  }
}
