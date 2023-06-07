import { describe, expect, jest, afterEach, beforeEach, test } from '@jest/globals'
import Sanitizer, { SanitizeLevel, Options, stringWiper } from '../main/app/sanitizer.js'

describe('stringWiper', () => {
  test('should replace all characters with █', () => {
    expect(stringWiper('Sensitive Data')).toBe('██████████████')
  })
})

describe('Sanitizer', () => {
  let sanitizer: Sanitizer

  beforeEach(() => {
    const options: Options = {
      obscureTextEmails: true,
      obscureTextNumbers: false,
      domSanitizer: undefined,
    }
    const app = {
      nodes: {
        getID: (el: { mockId: number }) => el.mockId,
      },
    }
    // @ts-expect-error
    sanitizer = new Sanitizer(app, options)
  })

  afterEach(() => {
    sanitizer.clear()
  })

  test('should handle node and mark it as obscured if parent is obscured', () => {
    sanitizer['obscured'].add(2)
    sanitizer.handleNode(1, 2, document.createElement('div'))
    expect(sanitizer.isObscured(1)).toBe(true)
  })

  test('should handle node and mark it as obscured if it has "masked" or "obscured" attribute', () => {
    const node = document.createElement('div')
    node.setAttribute('data-openreplay-obscured', '')
    sanitizer.handleNode(1, 2, node)
    expect(sanitizer.isObscured(1)).toBe(true)
  })

  test('should handle node and mark it as hidden if parent is hidden', () => {
    sanitizer['hidden'].add(2)
    sanitizer.handleNode(1, 2, document.createElement('div'))
    expect(sanitizer.isHidden(1)).toBe(true)
  })

  test('should handle node and mark it as hidden if it has "htmlmasked" or "hidden" attribute', () => {
    const node = document.createElement('div')
    node.setAttribute('data-openreplay-hidden', '')
    sanitizer.handleNode(1, 2, node)
    expect(sanitizer.isHidden(1)).toBe(true)
  })

  test('should handle node and sanitize based on custom domSanitizer function', () => {
    const domSanitizer = (node: Element): SanitizeLevel => {
      if (node.tagName === 'SPAN') {
        return SanitizeLevel.Obscured
      }
      if (node.tagName === 'DIV') {
        return SanitizeLevel.Hidden
      }
      return SanitizeLevel.Plain
    }

    const options: Options = {
      obscureTextEmails: true,
      obscureTextNumbers: false,
      domSanitizer,
    }
    const app = {
      nodes: {
        getID: jest.fn(),
      },
    }

    // @ts-expect-error
    sanitizer = new Sanitizer(app, options)

    const spanNode = document.createElement('span')
    const divNode = document.createElement('div')
    const plainNode = document.createElement('p')

    sanitizer.handleNode(1, 2, spanNode)
    sanitizer.handleNode(3, 4, divNode)
    sanitizer.handleNode(5, 6, plainNode)

    expect(sanitizer.isObscured(1)).toBe(true)
    expect(sanitizer.isHidden(3)).toBe(true)
    expect(sanitizer.isObscured(5)).toBe(false)
    expect(sanitizer.isHidden(5)).toBe(false)
  })

  test('should sanitize data as obscured if node is marked as obscured', () => {
    sanitizer['obscured'].add(1)
    const data = 'Sensitive Data'

    const sanitizedData = sanitizer.sanitize(1, data)
    expect(sanitizedData).toEqual(stringWiper(data))
  })

  test('should sanitize data by obscuring text numbers if enabled', () => {
    sanitizer['options'].obscureTextNumbers = true
    const data = 'Phone: 123-456-7890'
    const sanitizedData = sanitizer.sanitize(1, data)
    expect(sanitizedData).toEqual('Phone: 000-000-0000')
  })

  test('should sanitize data by obscuring text emails if enabled', () => {
    sanitizer['options'].obscureTextEmails = true
    const data = 'john.doe@example.com'
    const sanitizedData = sanitizer.sanitize(1, data)
    expect(sanitizedData).toEqual('********@*******.***')
  })

  test('should return inner text of an element securely by sanitizing it', () => {
    const element = document.createElement('div')
    sanitizer['obscured'].add(1)
    // @ts-expect-error
    element.mockId = 1
    element.innerText = 'Sensitive Data'
    const sanitizedText = sanitizer.getInnerTextSecure(element)
    expect(sanitizedText).toEqual('██████████████')
  })

  test('should return empty string if node element does not exist', () => {
    const element = document.createElement('div')
    element.innerText = 'Sensitive Data'
    const sanitizedText = sanitizer.getInnerTextSecure(element)
    expect(sanitizedText).toEqual('')
  })
})
