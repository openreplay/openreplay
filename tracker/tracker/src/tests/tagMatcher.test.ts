import TagMatcher from '../main/modules/tagMatcher'
import { describe, expect, beforeEach, test } from '@jest/globals'

function el(html: string): Element {
  const tpl = document.createElement('template')
  tpl.innerHTML = html.trim()
  document.body.appendChild(tpl.content.firstElementChild!)
  return document.body.lastElementChild!
}

function cleanup() {
  document.body.innerHTML = ''
}

describe('TagMatcher', () => {
  let matcher: TagMatcher

  beforeEach(() => {
    matcher = new TagMatcher()
    cleanup()
  })

  describe('setTags / getTags / clear', () => {
    test('getTags returns current tags', () => {
      const tags = [{ id: 1, selector: '#app' }]
      matcher.setTags(tags)
      expect(matcher.getTags()).toBe(tags)
    })

    test('clear resets state', () => {
      matcher.setTags([{ id: 1, selector: '#app' }])
      matcher.clear()
      expect(matcher.getTags()).toEqual([])
      const node = el('<div id="app"></div>')
      expect(matcher.match(node)).toBeNull()
    })

    test('setTags replaces previous tags', () => {
      matcher.setTags([{ id: 1, selector: '#old' }])
      matcher.setTags([{ id: 2, selector: '#new' }])
      expect(matcher.getTags()).toEqual([{ id: 2, selector: '#new' }])
      const node = el('<div id="old"></div>')
      expect(matcher.match(node)).toBeNull()
    })
  })

  describe('match by id', () => {
    test('matches element by id selector', () => {
      const tag = { id: 1, selector: '#submit-btn' }
      matcher.setTags([tag])
      const node = el('<button id="submit-btn"></button>')
      expect(matcher.match(node)).toBe(tag)
    })

    test('no match when id differs', () => {
      matcher.setTags([{ id: 1, selector: '#submit-btn' }])
      const node = el('<button id="cancel-btn"></button>')
      expect(matcher.match(node)).toBeNull()
    })
  })

  describe('match by data attribute', () => {
    test('matches element by data attribute selector', () => {
      const tag = { id: 2, selector: '[data-testid="login"]' }
      matcher.setTags([tag])
      const node = el('<form data-testid="login"></form>')
      expect(matcher.match(node)).toBe(tag)
    })

    test('no match when data attribute value differs', () => {
      matcher.setTags([{ id: 2, selector: '[data-testid="login"]' }])
      const node = el('<form data-testid="signup"></form>')
      expect(matcher.match(node)).toBeNull()
    })
  })

  describe('match by class', () => {
    test('matches element by class in selector', () => {
      const tag = { id: 3, selector: 'button.primary' }
      matcher.setTags([tag])
      const node = el('<button class="primary large"></button>')
      expect(matcher.match(node)).toBe(tag)
    })

    test('no match when class absent', () => {
      matcher.setTags([{ id: 3, selector: 'button.primary' }])
      const node = el('<button class="secondary"></button>')
      expect(matcher.match(node)).toBeNull()
    })
  })

  describe('fallback matching', () => {
    test('matches via element.matches for nth-child selectors', () => {
      const wrapper = document.createElement('ul')
      wrapper.innerHTML = '<li>a</li><li>b</li><li>c</li>'
      document.body.appendChild(wrapper)
      const tag = { id: 4, selector: 'ul > li:nth-child(2)' }
      matcher.setTags([tag])
      expect(matcher.match(wrapper.children[1])).toBe(tag)
      expect(matcher.match(wrapper.children[0])).toBeNull()
    })
  })

  describe('compound selectors', () => {
    test('matches nested selector by last segment fingerprint', () => {
      document.body.innerHTML = '<div class="container"><span id="target"></span></div>'
      const tag = { id: 5, selector: 'div.container > #target' }
      matcher.setTags([tag])
      const node = document.getElementById('target')!
      expect(matcher.match(node)).toBe(tag)
    })

    test('fingerprint matches but full selector does not', () => {
      document.body.innerHTML = '<section><span id="target"></span></section>'
      const tag = { id: 5, selector: 'div.container > #target' }
      matcher.setTags([tag])
      const node = document.getElementById('target')!
      // id fingerprint hits, but full selector fails because parent is section, not div.container
      expect(matcher.match(node)).toBeNull()
    })
  })

  describe('parent matching', () => {
    test('matches tag on parent when element itself has no match', () => {
      document.body.innerHTML = '<button id="submit"><span class="icon">X</span></button>'
      const tag = { id: 1, selector: '#submit' }
      matcher.setTags([tag])
      const span = document.querySelector('.icon')!
      expect(matcher.match(span)).toBe(tag)
    })

    test('direct match takes priority over parent match', () => {
      document.body.innerHTML = '<button id="parent"><span id="child"></span></button>'
      const parentTag = { id: 1, selector: '#parent' }
      const childTag = { id: 2, selector: '#child' }
      matcher.setTags([parentTag, childTag])
      const span = document.querySelector('#child')!
      expect(matcher.match(span)).toBe(childTag)
    })
  })

  describe('children matching', () => {
    test('matches tag on direct child when element itself has no match', () => {
      document.body.innerHTML = '<div class="wrapper"><input id="email" /></div>'
      const tag = { id: 1, selector: '#email' }
      matcher.setTags([tag])
      const wrapper = document.querySelector('.wrapper')!
      expect(matcher.match(wrapper)).toBe(tag)
    })

    test('does not match nested grandchildren', () => {
      document.body.innerHTML = '<div class="wrapper"><div><input id="deep" /></div></div>'
      const tag = { id: 1, selector: '#deep' }
      matcher.setTags([tag])
      const wrapper = document.querySelector('.wrapper')!
      expect(matcher.match(wrapper)).toBeNull()
    })

    test('parent match takes priority over children match', () => {
      document.body.innerHTML = '<form id="form"><div class="mid"><input id="field" /></div></form>'
      const formTag = { id: 1, selector: '#form' }
      const fieldTag = { id: 2, selector: '#field' }
      matcher.setTags([formTag, fieldTag])
      const mid = document.querySelector('.mid')!
      // parent (#form) should match before child (#field)
      expect(matcher.match(mid)).toBe(formTag)
    })
  })

  describe('priority order', () => {
    test('id match takes priority over class match', () => {
      const idTag = { id: 1, selector: '#btn' }
      const classTag = { id: 2, selector: 'button.action' }
      matcher.setTags([idTag, classTag])
      const node = el('<button id="btn" class="action"></button>')
      expect(matcher.match(node)).toBe(idTag)
    })
  })

  describe('edge cases', () => {
    test('returns null with no tags set', () => {
      const node = el('<div></div>')
      expect(matcher.match(node)).toBeNull()
    })

    test('handles empty selector gracefully', () => {
      matcher.setTags([{ id: 1, selector: '' }])
      const node = el('<div></div>')
      expect(matcher.match(node)).toBeNull()
    })

    test('handles invalid selector without throwing', () => {
      matcher.setTags([{ id: 1, selector: '[[[invalid' }])
      const node = el('<div></div>')
      expect(matcher.match(node)).toBeNull()
    })

    test('multiple tags can coexist across tiers', () => {
      const idTag = { id: 1, selector: '#hero' }
      const dataTag = { id: 2, selector: '[data-role="nav"]' }
      const classTag = { id: 3, selector: 'div.sidebar' }
      const fallbackTag = { id: 4, selector: 'ul > li:nth-child(1)' }
      matcher.setTags([idTag, dataTag, classTag, fallbackTag])

      document.body.innerHTML = `
        <div id="hero"></div>
        <nav data-role="nav"></nav>
        <div class="sidebar"></div>
        <ul><li>first</li><li>second</li></ul>
      `
      expect(matcher.match(document.getElementById('hero')!)).toBe(idTag)
      expect(matcher.match(document.querySelector('[data-role="nav"]')!)).toBe(dataTag)
      expect(matcher.match(document.querySelector('.sidebar')!)).toBe(classTag)
      expect(matcher.match(document.querySelector('li')!)).toBe(fallbackTag)
    })
  })
})
