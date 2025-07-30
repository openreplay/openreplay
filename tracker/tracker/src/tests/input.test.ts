import { describe, expect, test } from '@jest/globals'
import { getInputLabel } from '../main/modules/input.js'

describe('getInputLabel', () => {
  test('uses data-openreplay-label attribute and normalizes spaces', () => {
    const input = document.createElement('input')
    input.setAttribute('data-openreplay-label', '  Hello   world  ')
    expect(getInputLabel(input)).toBe('Hello world')
  })

  test('finds associated label element', () => {
    const input = document.createElement('input')
    input.id = 'field1'
    const label = document.createElement('label')
    label.setAttribute('for', 'field1')
    label.innerText = 'Email Address'
    document.body.appendChild(label)
    document.body.appendChild(input)
    expect(getInputLabel(input)).toBe('Email Address')
    document.body.innerHTML = ''
  })

  test('falls back to placeholder then other attributes', () => {
    const input = document.createElement('input')
    input.placeholder = 'Enter name'
    expect(getInputLabel(input)).toBe('Enter name')

    const input2 = document.createElement('input')
    input2.className = 'cls1'
    expect(getInputLabel(input2)).toBe('cls1')
  })

  test('limits label length to 100 characters', () => {
    const long = 'a'.repeat(150)
    const input = document.createElement('input')
    input.setAttribute('data-openreplay-label', long)
    expect(getInputLabel(input).length).toBe(100)
  })
})
