import { describe, expect, test, beforeAll, afterAll } from '@jest/globals'
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

const SVG_NS = 'http://www.w3.org/2000/svg'

describe('isNode', () => {
  test('accepts nodes, rejects plain objects and nullish', () => {
    expect(isNode(document.createElement('div'))).toBe(true)
    expect(isNode({ foo: 'bar' })).toBe(false)
    expect(isNode(null)).toBe(false)
    expect(isNode(undefined)).toBe(false)
  })
})

describe('guards on cross-realm (iframe) nodes', () => {
  let frame: HTMLIFrameElement
  let doc: Document

  beforeAll(() => {
    frame = document.createElement('iframe')
    document.body.appendChild(frame)
    doc = frame.contentDocument!
  })

  afterAll(() => {
    frame.remove()
  })

  test('nodes really come from another realm', () => {
    const el = doc.createElement('div')
    expect(el instanceof Element).toBe(false)
    expect(doc instanceof Document).toBe(false)
  })

  test('nodeType-based guards still recognize them', () => {
    const el = doc.createElement('div')
    const text = doc.createTextNode('t')
    const comment = doc.createComment('c')
    const fragment = doc.createDocumentFragment()

    expect(isNode(el)).toBe(true)
    expect(isElementNode(el)).toBe(true)
    expect(isElementNode(text)).toBe(false)
    expect(isTextNode(text)).toBe(true)
    expect(isTextNode(el)).toBe(false)
    expect(isCommentNode(comment)).toBe(true)
    expect(isCommentNode(text)).toBe(false)
    expect(isDocument(doc)).toBe(true)
    expect(isDocument(el)).toBe(false)
    expect(isRootNode(doc)).toBe(true)
    expect(isRootNode(fragment)).toBe(true)
    expect(isRootNode(el)).toBe(false)
  })

  test('shadow root from another realm is a root node', () => {
    const host = doc.createElement('div')
    const shadow = host.attachShadow({ mode: 'open' })
    expect(isRootNode(shadow)).toBe(true)
    expect(isDocument(shadow)).toBe(false)
  })

  test('isSVGElement and hasTag work for iframe elements', () => {
    expect(isSVGElement(doc.createElementNS(SVG_NS, 'circle'))).toBe(true)
    expect(isSVGElement(doc.createElement('div'))).toBe(false)
    expect(hasTag(doc.createElement('input'), 'input')).toBe(true)
  })
})

describe('isSVGElement', () => {
  test('any element in the SVG namespace', () => {
    expect(isSVGElement(document.createElementNS(SVG_NS, 'svg'))).toBe(true)
    expect(isSVGElement(document.createElementNS(SVG_NS, 'path'))).toBe(true)
  })

  test('falls back to localName for an <svg> outside the SVG namespace', () => {
    const svg = document.createElementNS('http://www.w3.org/1999/xhtml', 'svg')
    expect(svg.namespaceURI).not.toBe(SVG_NS)
    expect(isSVGElement(svg)).toBe(true)
  })

  test('HTML-namespaced non-svg elements are not SVG', () => {
    expect(isSVGElement(document.createElement('div'))).toBe(false)
    expect(isSVGElement(document.createElementNS('http://www.w3.org/1999/xhtml', 'path'))).toBe(false)
  })
})

describe('hasTag', () => {
  test('matches by localName', () => {
    expect(hasTag(document.createElement('input'), 'input')).toBe(true)
    // @ts-expect-error
    expect(hasTag(document.createElement('div'), 'span')).toBe(false)
  })

  test('matches SVG <style> as style', () => {
    const style = document.createElementNS(SVG_NS, 'style')
    expect(style.tagName).toBe('style')
    expect(hasTag(style, 'style')).toBe(true)
  })

  test('is case-insensitive for HTML tagName (uses localName)', () => {
    const img = document.createElement('IMG')
    expect(img.tagName).toBe('IMG')
    expect(hasTag(img, 'img')).toBe(true)
  })

  test('non-element nodes never match', () => {
    expect(hasTag(document.createTextNode('style'), 'style')).toBe(false)
  })
})
