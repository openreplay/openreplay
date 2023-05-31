import { describe, expect, test } from '@jest/globals'
import {
  isNode,
  isSVGElement,
  isElementNode,
  isCommentNode,
  isTextNode,
  isDocument,
  isRootNode,
  hasTag,
} from '../main/app/guards.js'

describe('isNode', () => {
  test('returns true for a valid Node object', () => {
    const node = document.createElement('div')
    expect(isNode(node)).toBe(true)
  })

  test('returns false for a non-Node object', () => {
    const obj = { foo: 'bar' }
    expect(isNode(obj)).toBe(false)
  })
})

describe('isSVGElement', () => {
  test('returns true for an SVGElement object', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    expect(isSVGElement(svg)).toBe(true)
  })

  test('returns false for a non-SVGElement object', () => {
    const div = document.createElement('div')
    expect(isSVGElement(div)).toBe(false)
  })
})

describe('isElementNode', () => {
  test('returns true for an Element object', () => {
    const element = document.createElement('div')
    expect(isElementNode(element)).toBe(true)
  })

  test('returns false for a non-Element object', () => {
    const textNode = document.createTextNode('Hello')
    expect(isElementNode(textNode)).toBe(false)
  })
})

describe('isCommentNode', () => {
  test('returns true for a Comment object', () => {
    const comment = document.createComment('This is a comment')
    expect(isCommentNode(comment)).toBe(true)
  })

  test('returns false for a non-Comment object', () => {
    const div = document.createElement('div')
    expect(isCommentNode(div)).toBe(false)
  })
})

describe('isTextNode', () => {
  test('returns true for a Text object', () => {
    const textNode = document.createTextNode('Hello')
    expect(isTextNode(textNode)).toBe(true)
  })

  test('returns false for a non-Text object', () => {
    const div = document.createElement('div')
    expect(isTextNode(div)).toBe(false)
  })
})

describe('isDocument', () => {
  test('returns true for a Document object', () => {
    const documentObj = document.implementation.createHTMLDocument('Test')
    expect(isDocument(documentObj)).toBe(true)
  })

  test('returns false for a non-Document object', () => {
    const div = document.createElement('div')
    expect(isDocument(div)).toBe(false)
  })
})

describe('isRootNode', () => {
  test('returns true for a Document object', () => {
    const documentObj = document.implementation.createHTMLDocument('Test')
    expect(isRootNode(documentObj)).toBe(true)
  })

  test('returns true for a DocumentFragment object', () => {
    const fragment = document.createDocumentFragment()
    expect(isRootNode(fragment)).toBe(true)
  })

  test('returns false for a non-root Node object', () => {
    const div = document.createElement('div')
    expect(isRootNode(div)).toBe(false)
  })
})

describe('hasTag', () => {
  test('returns true if the element has the specified tag name', () => {
    const element = document.createElement('input')
    expect(hasTag(element, 'input')).toBe(true)
  })

  test('returns false if the element does not have the specified tag name', () => {
    const element = document.createElement('div')
    // @ts-expect-error
    expect(hasTag(element, 'span')).toBe(false)
  })
})
