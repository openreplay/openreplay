import { describe, beforeEach, expect, test } from '@jest/globals'
import {
  isNode,
  isSVGElement,
  isElementNode,
  isCommentNode,
  isTextNode,
  isDocument,
  isRootNode,
  hasTag,
} from '../main/app/guards'

describe('DOM utility functions', () => {
  let elementNode: Element
  let commentNode: Comment
  let textNode: Text
  let documentNode: Document
  let fragmentNode: DocumentFragment
  let svgElement: SVGElement

  beforeEach(() => {
    elementNode = document.createElement('div')
    commentNode = document.createComment('This is a comment')
    textNode = document.createTextNode('This is text')
    documentNode = document
    fragmentNode = document.createDocumentFragment()
    svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  })

  test('isNode', () => {
    expect(isNode(elementNode)).toBeTruthy()
    expect(isNode(null)).toBeFalsy()
  })

  test('isSVGElement', () => {
    expect(isSVGElement(svgElement)).toBeTruthy()
    expect(isSVGElement(elementNode)).toBeFalsy()
  })

  test('isElementNode', () => {
    expect(isElementNode(elementNode)).toBeTruthy()
    expect(isElementNode(textNode)).toBeFalsy()
  })

  test('isCommentNode', () => {
    expect(isCommentNode(commentNode)).toBeTruthy()
    expect(isCommentNode(elementNode)).toBeFalsy()
  })

  test('isTextNode', () => {
    expect(isTextNode(textNode)).toBeTruthy()
    expect(isTextNode(elementNode)).toBeFalsy()
  })

  test('isDocument', () => {
    expect(isDocument(documentNode)).toBeTruthy()
    expect(isDocument(elementNode)).toBeFalsy()
  })

  test('isRootNode', () => {
    expect(isRootNode(documentNode)).toBeTruthy()
    expect(isRootNode(fragmentNode)).toBeTruthy()
    expect(isRootNode(elementNode)).toBeFalsy()
  })

  test('hasTag', () => {
    const imgElement = document.createElement('img')
    expect(hasTag(imgElement, 'img')).toBeTruthy()
    expect(hasTag(elementNode, 'img')).toBeFalsy()
  })
})
