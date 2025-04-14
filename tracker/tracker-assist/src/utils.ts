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

export function hasOpenreplayAttribute(e: Element, attr: string): boolean {
    const newName = `data-openreplay-${attr}`
    if (e.hasAttribute(newName)) {
      // @ts-ignore
      if (DEPRECATED_ATTRS[attr]) {
        deprecationWarn(
          `"${newName}" attribute`,
          // @ts-ignore
          `"${DEPRECATED_ATTRS[attr] as string}" attribute`,
          '/en/sdk/sanitize-data',
        )
      }
      return true
    }
  
    return false
  }