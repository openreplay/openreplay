import { hasTag, } from '../src/guards'
import { describe, expect, test, } from '@jest/globals'

describe('hasTag', () => {
  test('returns true for matching tag', () => {
    const canvas = document.createElement('canvas')
    expect(hasTag(canvas, 'canvas')).toBe(true)
  })

  test('returns false for non-matching tag', () => {
    const div = document.createElement('div')
    expect(hasTag(div, 'canvas')).toBe(false)
  })

  test('uses lowercase localName comparison', () => {
    const input = document.createElement('INPUT')
    expect(hasTag(input, 'input')).toBe(true)
  })

  test('narrows the type so element-specific properties are accessible', () => {
    const node: Node = document.createElement('input')
    if (hasTag(node, 'input')) {
      // Should compile because hasTag narrows to HTMLInputElement
      node.value = 'test'
      expect(node.value).toBe('test')
    } else {
      throw new Error('expected hasTag to narrow node to input')
    }
  })
})
