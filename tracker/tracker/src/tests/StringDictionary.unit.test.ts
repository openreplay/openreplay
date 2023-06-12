import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals'
import { StringDictionary } from '../main/modules/attributeSender.js'

describe('StringDictionary', () => {
  test('key is non-zero', () => {
    const dict = new StringDictionary()

    const [key, isNew] = dict.getKey('We are Asayer')

    expect(key).not.toBe(0)
    expect(isNew).toBe(true)
  })

  test('Different strings have different keys', () => {
    const dict = new StringDictionary()

    const [key1, isNew1] = dict.getKey('Datadog')
    const [key2, isNew2] = dict.getKey('PostHog')

    expect(key1).not.toBe(key2)
    expect(isNew2).toBe(true)
  })

  test('Similar strings have similar keys', () => {
    const dict = new StringDictionary()

    const [key1, isNew1] = dict.getKey("What's up?")
    const [key2, isNew2] = dict.getKey("What's up?")

    expect(key1).toBe(key2)
    expect(isNew2).toBe(false)
  })
})
