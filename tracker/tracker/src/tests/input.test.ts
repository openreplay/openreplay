import { describe, expect, test, afterEach } from '@jest/globals'
import { getInputLabel } from '../main/modules/input.js'

// jsdom has no innerText
function withInnerText<T extends HTMLElement>(el: T, text: string): T {
  Object.defineProperty(el, 'innerText', { configurable: true, value: text })
  return el
}

describe('getInputLabel', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('uses data-openreplay-label attribute and normalizes spaces', () => {
    const input = document.createElement('input')
    input.setAttribute('data-openreplay-label', '  Hello   world  ')
    expect(getInputLabel(input)).toBe('Hello world')
  })

  test('uses the text of a wrapping label', () => {
    const label = withInnerText(document.createElement('label'), '  Email   Address ')
    const input = document.createElement('input')
    label.appendChild(input)
    document.body.appendChild(label)
    expect(getInputLabel(input)).toBe('Email Address')
  })

  test('an id wins over a <label for> pointing at it', () => {
    const label = withInnerText(document.createElement('label'), 'Email Address')
    label.htmlFor = 'field1'
    const input = document.createElement('input')
    input.id = 'field1'
    document.body.append(label, input)
    expect(input.labels?.length).toBe(1)
    expect(getInputLabel(input)).toBe('#field1')
  })

  test('name beats placeholder and label text', () => {
    const label = withInnerText(document.createElement('label'), 'Label text')
    const input = document.createElement('input')
    input.name = 'username'
    input.placeholder = 'Enter name'
    label.appendChild(input)
    document.body.appendChild(label)
    expect(getInputLabel(input)).toBe('username')
  })

  test('placeholder beats label text, type is the last resort', () => {
    const label = withInnerText(document.createElement('label'), 'Label text')
    const input = document.createElement('input')
    input.placeholder = 'Enter name'
    label.appendChild(input)
    document.body.appendChild(label)
    expect(getInputLabel(input)).toBe('Enter name')

    const bare = document.createElement('input')
    bare.type = 'email'
    expect(getInputLabel(bare)).toBe('email')
  })

  test('custom attributes, id and class selectors', () => {
    const input = document.createElement('input')
    input.className = 'cls1 cls2'
    expect(getInputLabel(input)).toBe('.cls1.cls2')
    input.id = 'the-id'
    expect(getInputLabel(input)).toBe('#the-id')
    input.setAttribute('data-qa', 'x')
    expect(getInputLabel(input, ['data-qa'])).toBe('[data-qa=x]')
  })

  test('limits label length to 100 characters on every path', () => {
    const long = 'a'.repeat(150)

    const attr = document.createElement('input')
    attr.setAttribute('data-openreplay-label', long)
    expect(getInputLabel(attr)).toHaveLength(100)

    const custom = document.createElement('input')
    custom.setAttribute('data-qa', long)
    expect(getInputLabel(custom, ['data-qa'])).toHaveLength(100)

    const id = document.createElement('input')
    id.id = long
    expect(getInputLabel(id)).toHaveLength(100)

    const cls = document.createElement('input')
    cls.className = long
    expect(getInputLabel(cls)).toHaveLength(100)

    const placeholder = document.createElement('input')
    placeholder.placeholder = long
    expect(getInputLabel(placeholder)).toHaveLength(100)
  })
})
