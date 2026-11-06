/**
 * Browsers serialize a var() shorthand followed by one of its longhands
 * (`background: var(--bg); background-clip: padding-box`) as longhands with empty values
 * (`background-color: ; …`), which are dropped when the text is parsed again, so the rule loses
 * the property in the replay. Stencil/Ionic fill constructed sheets with replace()/replaceSync(),
 * so the original text of such rules can be taken from there.
 */

const EMPTY_DECLARATION = /:\s*;/

/** Top-level rules of a stylesheet text, or null when it can't be split reliably. */
export function splitTopLevelRules(text: string): string[] | null {
  const rules: string[] = []
  let depth = 0
  let start = 0
  let i = 0
  const n = text.length
  while (i < n) {
    const c = text[i]
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2)
      if (end < 0) return null
      i = end + 2
      continue
    }
    if (c === '"' || c === "'") {
      i++
      while (i < n && text[i] !== c) {
        if (text[i] === '\\') i++
        i++
      }
      i++
      continue
    }
    if (c === '{') {
      depth++
    } else if (c === '}') {
      depth--
      if (depth < 0) return null
      if (depth === 0) {
        rules.push(text.slice(start, i + 1))
        start = i + 1
      }
    } else if (c === ';' && depth === 0) {
      rules.push(text.slice(start, i + 1))
      start = i + 1
    }
    i++
  }
  if (depth !== 0) return null
  return rules.map((r) => r.replace(/\/\*[\s\S]*?\*\//g, '').trim()).filter(Boolean)
}

const loose = (s: string) => s.replace(/[\s"']/g, '')

function prelude(rule: CSSRule): string {
  const text = rule.cssText
  const brace = text.indexOf('{')
  return brace < 0 ? text : text.slice(0, brace)
}

/**
 * cssText of the rule, or its source text when the serialization lost declarations and
 * `source` (the same-index rule of the text the sheet was filled with) is the same rule.
 */
export function ruleText(rule: CSSRule, source: string | undefined): string {
  const text = rule.cssText
  if (source === undefined || !EMPTY_DECLARATION.test(text)) return text
  const brace = source.indexOf('{')
  if (brace < 0 || loose(prelude(rule)) !== loose(source.slice(0, brace))) return text
  return source
}

/** Source text per rule index when it lines up with the sheet's rules, else undefined. */
export function sourceRules(source: string | undefined, rules: CSSRuleList): string[] | undefined {
  if (source === undefined) return undefined
  const parts = splitTopLevelRules(source)
  return parts && parts.length === rules.length ? parts : undefined
}
