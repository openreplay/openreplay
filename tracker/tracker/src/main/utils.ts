const DEPRECATED_ATTRS = { htmlmasked: 'hidden', masked: 'obscured' }

export const IN_BROWSER = !(typeof window === 'undefined')

export const IS_FIREFOX = IN_BROWSER && navigator.userAgent.match(/firefox|fxios/i)

export const MAX_STR_LEN = 1e5

const navigationStart: number | false =
  (IN_BROWSER && performance.timing.navigationStart) || performance.timeOrigin
// performance.now() is buggy in some browsers
export const timestamp: () => number =
  IN_BROWSER && performance.now() && navigationStart
    ? () => Math.round(performance.now() + navigationStart)
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
