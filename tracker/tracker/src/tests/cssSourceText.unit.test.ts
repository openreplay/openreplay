import { describe, expect, test } from '@jest/globals'
import { ruleText, sourceRules, splitTopLevelRules } from '../main/modules/cssSourceText.js'

const rule = (cssText: string) => ({ cssText }) as CSSRule
const list = (n: number) => ({ length: n }) as CSSRuleList

describe('cssSourceText', () => {
  test('splits top-level rules, keeping nested blocks, strings and statements whole', () => {
    const text =
      '@import url("a;b.css");/* c { } */:host{--x:1}.a{content:"}{;"}@media (max-width:10px){.b{color:red}.c{margin:0}}'
    expect(splitTopLevelRules(text)).toEqual([
      '@import url("a;b.css");',
      ':host{--x:1}',
      '.a{content:"}{;"}',
      '@media (max-width:10px){.b{color:red}.c{margin:0}}',
    ])
  })

  test('returns null for unbalanced text', () => {
    expect(splitTopLevelRules('.a{color:red')).toBeNull()
    expect(splitTopLevelRules('.a{}}')).toBeNull()
  })

  test('uses the source text only for rules whose serialization lost declarations', () => {
    const source = '.button-native{background:var(--background);background-clip:padding-box}'
    const lossy = rule('.button-native { background-image: ; background-color: ; background-clip: padding-box; }')
    expect(ruleText(lossy, source)).toBe(source)
    const fine = rule('.button-native { color: red; }')
    expect(ruleText(fine, '.button-native{color:red}')).toBe('.button-native { color: red; }')
  })

  test('keeps the serialization when the source rule is a different rule', () => {
    const lossy = rule('.a { background-color: ; }')
    expect(ruleText(lossy, '.b{background:var(--x)}')).toBe('.a { background-color: ; }')
    expect(ruleText(lossy, undefined)).toBe('.a { background-color: ; }')
  })

  test('matches selectors and at-rule preludes regardless of whitespace and quotes', () => {
    const lossy = rule(':host([dir="rtl"]) .x > .y { padding-top: ; }')
    const source = ':host([dir=rtl]) .x>.y{padding:var(--p) 0;padding-left:0}'
    expect(ruleText(lossy, source)).toBe(source)
    const media = rule('@media (max-width: 10px) {\n  .b { background-color: ; }\n}')
    const mediaSource = '@media (max-width:10px){.b{background:var(--b);background-size:0}}'
    expect(ruleText(media, mediaSource)).toBe(mediaSource)
  })

  test('source rules are used only when they line up with the sheet', () => {
    expect(sourceRules('.a{}.b{}', list(2))).toEqual(['.a{}', '.b{}'])
    expect(sourceRules('.a{}.b{}', list(3))).toBeUndefined()
    expect(sourceRules(undefined, list(0))).toBeUndefined()
  })
})
