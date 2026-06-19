import { describe, expect, test } from '@jest/globals'
import { shouldSkipValueAttribute } from '../main/app/observer/observer.js'

function input(type?: string): HTMLInputElement {
  const el = document.createElement('input')
  if (type !== undefined) el.setAttribute('type', type)
  return el
}

describe('shouldSkipValueAttribute', () => {
  test('keeps value for checkbox/radio (needed by conditional CSS selectors)', () => {
    // Regression: Tailwind `has-[[value=duck]:checked]` / `:has([value=duck]:checked)`
    // rules never match in replay if the value attribute is stripped, hiding the
    // elements they style.
    expect(shouldSkipValueAttribute(input('checkbox'))).toBe(false)
    expect(shouldSkipValueAttribute(input('radio'))).toBe(false)
  })

  test('keeps value for button/reset/submit (label, not user content)', () => {
    expect(shouldSkipValueAttribute(input('button'))).toBe(false)
    expect(shouldSkipValueAttribute(input('reset'))).toBe(false)
    expect(shouldSkipValueAttribute(input('submit'))).toBe(false)
  })

  test('strips value for free-form text inputs (masked via SetInputValue instead)', () => {
    // default type is "text"
    expect(shouldSkipValueAttribute(input())).toBe(true)
    expect(shouldSkipValueAttribute(input('text'))).toBe(true)
    expect(shouldSkipValueAttribute(input('password'))).toBe(true)
    expect(shouldSkipValueAttribute(input('email'))).toBe(true)
    expect(shouldSkipValueAttribute(input('number'))).toBe(true)
    expect(shouldSkipValueAttribute(input('search'))).toBe(true)
  })

  test('does not strip value for non-input elements', () => {
    expect(shouldSkipValueAttribute(document.createElement('option'))).toBe(false)
    expect(shouldSkipValueAttribute(document.createElement('li'))).toBe(false)
    expect(shouldSkipValueAttribute(document.createElement('progress'))).toBe(false)
  })
})
