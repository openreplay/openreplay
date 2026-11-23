/** Additional source-side filtering. Existing masking runs before this callback. */
export type CaptureData =
  | { kind: 'attribute'; name: string; value: string; node: Element | null }
  | {
      kind: 'resource'
      resourceType: 'image' | 'stylesheet' | 'svg' | 'timing' | 'base'
      value: string
      node: Element | null
    }
  | {
      kind: 'css'
      source: 'attribute' | 'text' | 'rule' | 'adopted'
      value: string
      node: Element | null
    }
  | { kind: 'font'; field: 'family' | 'source' | 'descriptors'; value: string; node: null }

/** Return a replacement string or null to omit the value after existing masking.
 * Must be synchronous; exceptions and non-string results omit the value.
 */
export type CaptureSanitizer = (data: Readonly<CaptureData>) => string | null

export function sanitizeCapture(
  callback: CaptureSanitizer | undefined,
  data: CaptureData,
): string | null {
  if (callback === undefined) return data.value
  try {
    const value: unknown = callback(Object.freeze(data))
    // Async callbacks are invalid, but their rejected data must not escape via unhandledrejection.
    if (value !== null && (typeof value === 'object' || typeof value === 'function'))
      void Promise.resolve(value).catch(() => {})
    return typeof value === 'string' ? value : null
  } catch {
    // Never log captured data or fall back to it after a policy failure.
    return null
  }
}

export const PLACEHOLDER_SRC = 'https://static.openreplay.com/tracker/placeholder.jpeg'

export function emptyStyleRule(rule: string): string {
  if (/^\s*@import\b/i.test(rule)) return '@import url("data:text/css,") not all;'
  if (/^\s*@namespace\b/i.test(rule)) return '@namespace openreplay-omitted "urn:openreplay:omitted";'
  return ':not(*) {}'
}

export function hasStyleRuleCount(text: string, count: number): boolean {
  try {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(text)
    return sheet.cssRules.length === count
  } catch {
    return false
  }
}

export function sanitizeStyleRule(
  callback: CaptureSanitizer | undefined,
  value: string,
  source: 'rule' | 'adopted',
): string {
  if (!callback) return value
  const approved = sanitizeCapture(callback, { kind: 'css', source, value, node: null })
  if (approved === value || (approved && hasStyleRuleCount(approved, 1))) return approved
  return emptyStyleRule(value)
}
