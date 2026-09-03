import { describe, expect, test } from '@jest/globals'
import { getCustomAttributeSelector, getTextualLabel } from '../main/utils.js'
import { getCSSPath, isDeepClickable, resolvePointerRoot } from '../main/modules/mouse.js'

// jsdom has no innerText, textContent is close enough for these cases
const innerText = (el: HTMLElement) => el.textContent || ''

describe('getTextualLabel', () => {
  test('uses own text of a clickable element', () => {
    const button = document.createElement('button')
    button.textContent = '  Add   to cart '
    expect(getTextualLabel(button, innerText)).toBe('Add to cart')
  })

  test('skips symbol only text in favour of a description', () => {
    const button = document.createElement('button')
    button.textContent = '×'
    button.setAttribute('aria-label', 'Close dialog')
    expect(getTextualLabel(button, innerText)).toBe('Close dialog')
  })

  test('reads a describing attribute of an icon child', () => {
    const div = document.createElement('div')
    div.innerHTML = '<img alt="Delete row" />'
    expect(getTextualLabel(div, innerText)).toBe('Delete row')
  })

  test('uses value of button-like inputs', () => {
    const input = document.createElement('input')
    input.type = 'submit'
    input.value = 'Send'
    expect(getTextualLabel(input, innerText)).toBe('Send')
  })

  test('climbs to an ancestor when element has nothing', () => {
    const wrapper = document.createElement('div')
    wrapper.setAttribute('aria-label', 'Pagination')
    const icon = document.createElement('i')
    wrapper.appendChild(icon)
    expect(getTextualLabel(icon, innerText)).toBe('Pagination')
  })

  test('does not take multiline text of an ancestor', () => {
    const card = document.createElement('div')
    card.textContent = 'Product title\nAdd to cart'
    const icon = document.createElement('i')
    card.appendChild(icon)
    expect(getTextualLabel(icon, innerText)).toBe('')
  })

  test('does not take truncated text of an ancestor', () => {
    const card = document.createElement('div')
    card.textContent = 'a'.repeat(150)
    const icon = document.createElement('i')
    card.appendChild(icon)
    expect(getTextualLabel(icon, innerText)).toBe('')
  })

  test('stops climbing after maxAncestors', () => {
    const top = document.createElement('div')
    top.setAttribute('aria-label', 'Too far')
    const mid = document.createElement('div')
    const inner = document.createElement('div')
    const icon = document.createElement('i')
    top.appendChild(mid)
    mid.appendChild(inner)
    inner.appendChild(icon)
    expect(getTextualLabel(icon, innerText)).toBe('')
  })
})

describe('getCustomAttributeSelector', () => {
  test('takes the first configured attribute present, in configured order', () => {
    const el = document.createElement('div')
    el.setAttribute('data-qa', 'cart')
    el.setAttribute('data-testid', 'cart-button')
    expect(getCustomAttributeSelector(el, ['data-testid', 'data-qa'])).toBe(
      '[data-testid="cart-button"]',
    )
  })

  test('escapes quotes in the value', () => {
    const el = document.createElement('div')
    el.setAttribute('data-testid', 'say "hi"')
    expect(getCustomAttributeSelector(el, ['data-testid'])).toBe('[data-testid="say \\"hi\\""]')
  })

  test('returns empty string without configured attributes', () => {
    const el = document.createElement('div')
    el.setAttribute('data-testid', 'x')
    expect(getCustomAttributeSelector(el)).toBe('')
  })
})

describe('getCSSPath', () => {
  test('prefers a custom attribute over id', () => {
    const el = document.createElement('button')
    el.id = 'submit-1'
    el.setAttribute('data-testid', 'submit')
    expect(getCSSPath(el, ['data-testid'])).toBe('[data-testid="submit"]')
    expect(getCSSPath(el)).toBe('#submit-1')
  })

  test('prefers a custom attribute over any data attribute', () => {
    const el = document.createElement('button')
    el.setAttribute('data-animation', 'fade')
    el.setAttribute('data-testid', 'submit')
    expect(getCSSPath(el, ['data-testid'])).toBe('[data-testid="submit"]')
  })

  test('anchors the path on an ancestor custom attribute', () => {
    document.body.innerHTML =
      '<div data-testid="cart"><ul><li></li><li><span></span></span></li></ul></div>'
    const span = document.querySelector('span') as Element
    expect(getCSSPath(span, ['data-testid'])).toBe(
      '[data-testid="cart"] > ul:nth-of-type(1) > li:nth-of-type(2) > span:nth-of-type(1)',
    )
    document.body.innerHTML = ''
  })
})

describe('isDeepClickable', () => {
  test('accepts a div with a pointer cursor', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    expect(isDeepClickable(div)).toBe(false)
    const pointerDiv = document.createElement('div')
    pointerDiv.style.cursor = 'pointer'
    document.body.appendChild(pointerDiv)
    expect(isDeepClickable(pointerDiv)).toBe(true)
    document.body.innerHTML = ''
  })

  test('accepts interactive roles and focusable elements', () => {
    const tab = document.createElement('div')
    tab.setAttribute('role', 'tab')
    expect(isDeepClickable(tab)).toBe(true)

    const focusable = document.createElement('div')
    focusable.tabIndex = 0
    expect(isDeepClickable(focusable)).toBe(true)

    const inlineHandler = document.createElement('div')
    inlineHandler.setAttribute('onclick', 'noop()')
    expect(isDeepClickable(inlineHandler)).toBe(true)
  })
})

describe('resolvePointerRoot', () => {
  // jsdom does not inherit cursor, so it is set on every level the browser would inherit it on
  test('climbs to the outermost element owning the pointer', () => {
    document.body.innerHTML =
      '<div class="card" style="cursor:pointer"><div style="cursor:pointer"><span style="cursor:pointer">Buy</span></div></div>'
    const span = document.querySelector('span') as Element
    expect(resolvePointerRoot(span)).toBe(document.querySelector('.card'))
    document.body.innerHTML = ''
  })

  test('stops on a real clickable ancestor', () => {
    document.body.innerHTML =
      '<div style="cursor:pointer"><a href="#" style="cursor:pointer"><span style="cursor:pointer">Buy</span></a></div>'
    const span = document.querySelector('span') as Element
    expect(resolvePointerRoot(span)).toBe(document.querySelector('a'))
    document.body.innerHTML = ''
  })

  test('keeps the element when the parent has no pointer', () => {
    document.body.innerHTML = '<div><span style="cursor:pointer">Buy</span></div>'
    const span = document.querySelector('span') as Element
    expect(resolvePointerRoot(span)).toBe(span)
    document.body.innerHTML = ''
  })
})
