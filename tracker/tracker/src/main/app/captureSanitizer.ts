import { splitTopLevelRules } from '../modules/cssSourceText.js'

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
      sourceUrl?: string
    }
  | { kind: 'font'; field: 'family' | 'source' | 'descriptors'; value: string; node: null }
  | { kind: 'svg'; value: string; node: SVGUseElement; sourceUrl: string }

/** Return a replacement string or null to omit the value after existing masking.
 * Must be synchronous; exceptions and non-string results omit the value.
 * Inlining retains the original asset only for unchanged URLs or query-parameter removal.
 * Canvas capture is disabled when this policy is set.
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

/** Inlining can strip query parameters, but must not substitute a different asset. */
export function resolveInlineAsset(original: string, approved: string, base: string) {
  if (!original || !approved) return null
  try {
    const source = new URL(original, base)
    const replay = new URL(approved, base)
    const sourceUrl = source.href
    const replayUrl = replay.href
    const kept = Array.from(replay.searchParams)
    let index = 0
    for (const [key, value] of source.searchParams) {
      const entry = kept[index]
      if (entry && key === entry[0] && value === entry[1]) index++
    }
    source.search = replay.search = ''
    return source.href === replay.href && index === kept.length ? { sourceUrl, replayUrl } : null
  } catch {
    return null
  }
}

function ruleHeader(rule: string): string | undefined {
  let start = rule.trimStart()
  while (start.startsWith('/*')) {
    const end = start.indexOf('*/', 2)
    if (end < 0) return
    start = start.slice(end + 2).trimStart()
  }
  return /^(@(?:import|namespace)\b)/i.exec(start)?.[1].toLowerCase()
}

export function emptyStyleRule(rule: string): string {
  const header = ruleHeader(rule)
  if (header === '@import') return '@import url("data:text/css,") not all;'
  if (header === '@namespace') return '@namespace openreplay-omitted "urn:openreplay:omitted";'
  return ':not(*) {}'
}

const replaceSync = typeof CSSStyleSheet === 'undefined'
  ? undefined
  : CSSStyleSheet.prototype.replaceSync
let validationSheet: CSSStyleSheet | undefined

export function hasStyleRuleCount(text: string, count: number): boolean {
  const rules = splitTopLevelRules(text, ' ')
  if (rules?.length !== count || rules.some((rule) => /^@(?:charset|import)\b/i.test(rule))) {
    return false
  }
  if (!replaceSync) return true
  try {
    validationSheet ??= new CSSStyleSheet()
  } catch {
    return true
  }
  try {
    replaceSync.call(validationSheet, text)
    const matches = validationSheet.cssRules.length === count
    replaceSync.call(validationSheet, '')
    return matches
  } catch {
    validationSheet = undefined
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
  if (approved === value) return value
  if (!approved) return emptyStyleRule(value)
  const originalType = ruleHeader(value)
  const rules = splitTopLevelRules(approved, ' ')
  const approvedRule = rules?.length === 1 ? rules[0] : ''
  const approvedType = ruleHeader(approvedRule)
  if (originalType !== approvedType) return emptyStyleRule(value)
  // Constructed stylesheets drop @import even when the rule is valid.
  if (approvedType === '@import') {
    return /^@import\s*(?:url\(|["'])[\s\S]+;$/i.test(approvedRule)
      ? approved
      : emptyStyleRule(value)
  }
  if (hasStyleRuleCount(approved, 1)) return approved
  return emptyStyleRule(value)
}
