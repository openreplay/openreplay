import { describe, expect, jest, afterEach, beforeEach, test } from '@jest/globals'
import Sanitizer, { SanitizeLevel, Options, stringWiper } from '../main/app/sanitizer.js'

describe('stringWiper', () => {
  test('should replace all characters with *', () => {
    expect(stringWiper('Sensitive Data')).toBe('********* ****')
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
    sanitizer = new Sanitizer({
      // @ts-expect-error
      app,
      options,
    })
  })

  afterEach(() => {
    sanitizer.clear()
  })

  test('should handle node and mark it as obscured if parent is obscured', () => {
    sanitizer.setLevel(2, SanitizeLevel.Obscured)
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
    sanitizer.setLevel(2, SanitizeLevel.Hidden)
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
    sanitizer = new Sanitizer({ app, options })

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
    sanitizer.setLevel(1, SanitizeLevel.Obscured)
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
    sanitizer.setLevel(1, SanitizeLevel.Obscured)
    // @ts-expect-error
    element.mockId = 1
    element.innerText = 'Sensitive Data'
    const sanitizedText = sanitizer.getInnerTextSecure(element)
    expect(sanitizedText).toEqual('********* ****')
  })

  test('should return empty string if node element does not exist', () => {
    const element = document.createElement('div')
    element.innerText = 'Sensitive Data'
    const sanitizedText = sanitizer.getInnerTextSecure(element)
    expect(sanitizedText).toEqual('')
  })

  describe('two-way level state (dynamic re-sanitization)', () => {
    test('getLevel defaults to Plain for untracked ids', () => {
      expect(sanitizer.getLevel(999)).toBe(SanitizeLevel.Plain)
    })

    test('setLevel returns previous level and can both raise and lower', () => {
      expect(sanitizer.setLevel(1, SanitizeLevel.Obscured)).toBe(SanitizeLevel.Plain)
      expect(sanitizer.getLevel(1)).toBe(SanitizeLevel.Obscured)
      // lower it back
      expect(sanitizer.setLevel(1, SanitizeLevel.Plain)).toBe(SanitizeLevel.Obscured)
      expect(sanitizer.getLevel(1)).toBe(SanitizeLevel.Plain)
      expect(sanitizer.isObscured(1)).toBe(false)
    })

    test('handleNode is escalate-only: it never lowers an existing level', () => {
      sanitizer.setLevel(1, SanitizeLevel.Hidden)
      // a plain div would compute Plain, but handleNode must not downgrade Hidden
      sanitizer.handleNode(1, 0, document.createElement('div'))
      expect(sanitizer.isHidden(1)).toBe(true)
    })

    test('computeLevel reads the live DOM (attributes win over Plain parent)', () => {
      const obscuredNode = document.createElement('div')
      obscuredNode.setAttribute('data-openreplay-obscured', '')
      expect(sanitizer.computeLevel(obscuredNode, SanitizeLevel.Plain)).toBe(SanitizeLevel.Obscured)

      const hiddenNode = document.createElement('div')
      hiddenNode.setAttribute('data-openreplay-hidden', '')
      expect(sanitizer.computeLevel(hiddenNode, SanitizeLevel.Plain)).toBe(SanitizeLevel.Hidden)

      const plainNode = document.createElement('div')
      expect(sanitizer.computeLevel(plainNode, SanitizeLevel.Plain)).toBe(SanitizeLevel.Plain)
    })

    test('computeLevel inherits the parent level (max semantics)', () => {
      const node = document.createElement('div')
      expect(sanitizer.computeLevel(node, SanitizeLevel.Obscured)).toBe(SanitizeLevel.Obscured)
      expect(sanitizer.computeLevel(node, SanitizeLevel.Hidden)).toBe(SanitizeLevel.Hidden)
    })

    test('computeLevel reflects a domSanitizer toggled via class at call time', () => {
      const options: Options = {
        obscureTextEmails: true,
        obscureTextNumbers: false,
        domSanitizer: (node: Element): SanitizeLevel =>
          node.classList.contains('secret') ? SanitizeLevel.Obscured : SanitizeLevel.Plain,
      }
      const app = { nodes: { getID: jest.fn() } }
      // @ts-expect-error partial app mock
      const s = new Sanitizer({ app, options })
      const node = document.createElement('div')

      expect(s.computeLevel(node, SanitizeLevel.Plain)).toBe(SanitizeLevel.Plain)
      // user toggles the marker the callback keys on, then recomputes
      node.classList.add('secret')
      expect(s.computeLevel(node, SanitizeLevel.Plain)).toBe(SanitizeLevel.Obscured)
      node.classList.remove('secret')
      expect(s.computeLevel(node, SanitizeLevel.Plain)).toBe(SanitizeLevel.Plain)
    })
  })
})
