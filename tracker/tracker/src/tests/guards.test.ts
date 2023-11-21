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
} from '../main/app/guards' // Replace with your actual file name

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

  test('isNode function', () => {
    expect(isNode(elementNode)).toBeTruthy()
    expect(isNode(null)).toBeFalsy()
  })

  test('isSVGElement function', () => {
    expect(isSVGElement(svgElement)).toBeTruthy()
    expect(isSVGElement(elementNode)).toBeFalsy()
  })

  test('isElementNode function', () => {
    expect(isElementNode(elementNode)).toBeTruthy()
    expect(isElementNode(textNode)).toBeFalsy()
  })

  test('isCommentNode function', () => {
    expect(isCommentNode(commentNode)).toBeTruthy()
    expect(isCommentNode(elementNode)).toBeFalsy()
  })

  test('isTextNode function', () => {
    expect(isTextNode(textNode)).toBeTruthy()
    expect(isTextNode(elementNode)).toBeFalsy()
  })

  test('isDocument function', () => {
    expect(isDocument(documentNode)).toBeTruthy()
    expect(isDocument(elementNode)).toBeFalsy()
  })

  test('isRootNode function', () => {
    expect(isRootNode(documentNode)).toBeTruthy()
    expect(isRootNode(fragmentNode)).toBeTruthy()
    expect(isRootNode(elementNode)).toBeFalsy()
  })

  test('hasTag function', () => {
    const imgElement = document.createElement('img')
    expect(hasTag(imgElement, 'img')).toBeTruthy()
    expect(hasTag(elementNode, 'img')).toBeFalsy()
  })
})
