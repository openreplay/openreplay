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

  test('getInnerTextSecure works for node id 0', () => {
    const element = document.createElement('div')
    sanitizer.setLevel(0, SanitizeLevel.Obscured)
    // @ts-expect-error
    element.mockId = 0
    element.innerText = 'Secret'
    expect(sanitizer.getInnerTextSecure(element)).toEqual('******')
  })

  test.each(['data-openreplay-masked', 'data-openreplay-obscured'])('%s obscures', (attr) => {
    const node = document.createElement('div')
    node.setAttribute(attr, '')
    expect(sanitizer.computeLevel(node, SanitizeLevel.Plain)).toBe(SanitizeLevel.Obscured)
  })

  test.each(['data-openreplay-htmlmasked', 'data-openreplay-hidden'])('%s hides', (attr) => {
    const node = document.createElement('div')
    node.setAttribute(attr, '')
    expect(sanitizer.computeLevel(node, SanitizeLevel.Plain)).toBe(SanitizeLevel.Hidden)
    expect(sanitizer.computeLevel(node, SanitizeLevel.Obscured)).toBe(SanitizeLevel.Hidden)
  })

  test('masks embedded, multiple and multi-part-TLD emails', () => {
    expect(sanitizer.sanitize(1, 'mail a@b.co.uk or c@d.com')).toBe('mail *@*.**.** or *@*.***')
    expect(sanitizer.sanitize(1, 'contact: john.doe@mail.example.org!')).toBe(
      'contact: ********@****.*******.****',
    )
    expect(sanitizer.sanitize(1, 'no email @ here')).toBe('no email @ here')
  })

  test('domSanitizer returning Plain cannot lower an attribute mask', () => {
    const app = { nodes: { getID: jest.fn() } }
    const s = new Sanitizer({
      // @ts-expect-error partial app mock
      app,
      options: { domSanitizer: () => SanitizeLevel.Plain },
    })
    const obscured = document.createElement('div')
    obscured.setAttribute('data-openreplay-obscured', '')
    const hidden = document.createElement('div')
    hidden.setAttribute('data-openreplay-hidden', '')
    expect(s.computeLevel(obscured, SanitizeLevel.Plain)).toBe(SanitizeLevel.Obscured)
    expect(s.computeLevel(hidden, SanitizeLevel.Plain)).toBe(SanitizeLevel.Hidden)
    expect(s.computeLevel(document.createElement('div'), SanitizeLevel.Obscured)).toBe(
      SanitizeLevel.Obscured,
    )
  })

  test('domSanitizer returning Obscured does not lower Hidden', () => {
    const app = { nodes: { getID: jest.fn() } }
    const s = new Sanitizer({
      // @ts-expect-error partial app mock
      app,
      options: { domSanitizer: () => SanitizeLevel.Obscured },
    })
    const hidden = document.createElement('div')
    hidden.setAttribute('data-openreplay-hidden', '')
    expect(s.computeLevel(hidden, SanitizeLevel.Plain)).toBe(SanitizeLevel.Hidden)
  })

  describe('level state', () => {
    test('handleNode is escalate-only: it never lowers an existing level', () => {
      sanitizer.setLevel(1, SanitizeLevel.Hidden)
      // a plain div would compute Plain, but handleNode must not downgrade Hidden
      sanitizer.handleNode(1, 0, document.createElement('div'))
      expect(sanitizer.isHidden(1)).toBe(true)
    })

    test('setLevel can lower a level (used by resanitize)', () => {
      sanitizer.setLevel(1, SanitizeLevel.Hidden)
      expect(sanitizer.setLevel(1, SanitizeLevel.Plain)).toBe(SanitizeLevel.Hidden)
      expect(sanitizer.isObscured(1)).toBe(false)
      expect(sanitizer.sanitize(1, 'text')).toBe('text')
    })
  })

  describe('privateMode unmask', () => {
    let s: Sanitizer
    beforeEach(() => {
      const app = { nodes: { getID: jest.fn() } }
      // @ts-expect-error partial app mock
      s = new Sanitizer({ app, options: { privateMode: true } })
    })

    test('unmask applies to deep descendants and their text', () => {
      const root = document.createElement('div')
      root.setAttribute('data-openreplay-unmask', '')
      root.innerHTML = '<section><p><b>deep</b></p></section>'
      document.body.appendChild(root)
      const b = root.querySelector('b')!
      expect(s.computeLevel(b, SanitizeLevel.Plain)).toBe(SanitizeLevel.Plain)
      expect(s.computeLevel(b.firstChild!, SanitizeLevel.Plain)).toBe(SanitizeLevel.Plain)
      root.remove()
    })

    test('unmask region root ignores the private default of its parent', () => {
      const outer = document.createElement('div')
      outer.innerHTML = '<div data-openreplay-unmask><p>x</p></div>'
      document.body.appendChild(outer)
      const region = outer.firstElementChild!
      // outer is obscured by privateMode itself
      expect(s.computeLevel(outer, SanitizeLevel.Plain)).toBe(SanitizeLevel.Obscured)
      expect(s.computeLevel(region, SanitizeLevel.Obscured)).toBe(SanitizeLevel.Plain)
      expect(s.computeLevel(region.firstElementChild!, SanitizeLevel.Plain)).toBe(SanitizeLevel.Plain)
      outer.remove()
    })

    test('explicit mask above an unmask region still wins', () => {
      const outer = document.createElement('div')
      outer.setAttribute('data-openreplay-obscured', '')
      outer.innerHTML = '<div data-openreplay-unmask>x</div>'
      document.body.appendChild(outer)
      expect(s.computeLevel(outer.firstElementChild!, SanitizeLevel.Obscured)).toBe(
        SanitizeLevel.Obscured,
      )
      outer.remove()
    })

    test('hidden parent keeps an unmask region hidden', () => {
      const el = document.createElement('div')
      el.setAttribute('data-openreplay-unmask', '')
      document.body.appendChild(el)
      expect(s.computeLevel(el, SanitizeLevel.Hidden)).toBe(SanitizeLevel.Hidden)
      el.remove()
    })

    test('elements outside unmasked subtree stay obscured', () => {
      const el = document.createElement('p')
      el.textContent = 'secret'
      document.body.appendChild(el)
      expect(s.computeLevel(el, SanitizeLevel.Plain)).toBe(SanitizeLevel.Obscured)
      expect(s.computeLevel(el.firstChild!, SanitizeLevel.Plain)).toBe(SanitizeLevel.Obscured)
      el.remove()
    })

    test('explicit mask inside unmasked subtree wins', () => {
      const root = document.createElement('div')
      root.setAttribute('data-openreplay-unmask', '')
      root.innerHTML = '<div data-openreplay-obscured><span>x</span></div>'
      document.body.appendChild(root)
      const masked = root.firstElementChild!
      const span = masked.firstElementChild!
      expect(s.computeLevel(masked, SanitizeLevel.Plain)).toBe(SanitizeLevel.Obscured)
      expect(s.computeLevel(span, SanitizeLevel.Obscured)).toBe(SanitizeLevel.Obscured)
      root.remove()
    })

    test('hidden rules still apply outside unmask regions', () => {
      const container = document.createElement('div')
      container.innerHTML =
        '<div data-openreplay-hidden>a</div><div data-openreplay-htmlmasked>b</div><p>c</p>'
      document.body.appendChild(container)
      const [hidden, htmlmasked, p] = Array.from(container.children)
      expect(s.computeLevel(hidden, SanitizeLevel.Plain)).toBe(SanitizeLevel.Hidden)
      expect(s.computeLevel(htmlmasked, SanitizeLevel.Plain)).toBe(SanitizeLevel.Hidden)
      expect(s.computeLevel(p, SanitizeLevel.Hidden)).toBe(SanitizeLevel.Hidden)
      expect(s.computeLevel(p.firstChild!, SanitizeLevel.Hidden)).toBe(SanitizeLevel.Hidden)
      expect(s.computeLevel(p, SanitizeLevel.Plain)).toBe(SanitizeLevel.Obscured)
      container.remove()
    })

    test('domSanitizer Hidden applies outside unmask regions', () => {
      const app = { nodes: { getID: jest.fn() } }
      const ps = new Sanitizer({
        // @ts-expect-error partial app mock
        app,
        options: {
          privateMode: true,
          domSanitizer: (n) => (n.classList.contains('secret') ? SanitizeLevel.Hidden : SanitizeLevel.Plain),
        },
      })
      const el = document.createElement('div')
      el.className = 'secret'
      document.body.appendChild(el)
      expect(ps.computeLevel(el, SanitizeLevel.Plain)).toBe(SanitizeLevel.Hidden)
      el.classList.remove('secret')
      expect(ps.computeLevel(el, SanitizeLevel.Plain)).toBe(SanitizeLevel.Obscured)
      el.remove()
    })

    test('text directly under a shadow root follows the host unmask', () => {
      const host = document.createElement('div')
      host.setAttribute('data-openreplay-unmask', '')
      const shadow = host.attachShadow({ mode: 'open' })
      const text = document.createTextNode('visible')
      shadow.appendChild(text)
      document.body.appendChild(host)
      expect(text.parentElement).toBe(null)
      expect(s.computeLevel(text, SanitizeLevel.Plain)).toBe(SanitizeLevel.Plain)
      host.removeAttribute('data-openreplay-unmask')
      expect(s.computeLevel(text, SanitizeLevel.Plain)).toBe(SanitizeLevel.Obscured)
      host.remove()
    })

    test('unmask on shadow host applies inside its shadow root', () => {
      const host = document.createElement('div')
      host.setAttribute('data-openreplay-unmask', '')
      const shadow = host.attachShadow({ mode: 'open' })
      shadow.innerHTML = '<span>inside</span>'
      document.body.appendChild(host)
      const span = shadow.querySelector('span')!
      expect(s.computeLevel(span, SanitizeLevel.Plain)).toBe(SanitizeLevel.Plain)
      host.remove()
    })
  })
})
