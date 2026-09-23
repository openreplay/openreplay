import { describe, expect, test, jest, afterEach } from '@jest/globals'
import { StringDictionary } from '../main/modules/attributeSender.js'

afterEach(() => {
  jest.restoreAllMocks()
})

describe('StringDictionary', () => {
  test('different strings get different keys within the same ms', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    const dict = new StringDictionary()

    const [key1, isNew1] = dict.getKey('Datadog')
    const [key2, isNew2] = dict.getKey('PostHog')

    expect(key1).not.toBe(key2)
    expect(isNew1).toBe(true)
    expect(isNew2).toBe(true)
  })

  test('identical strings share a key', () => {
    const dict = new StringDictionary()

    const [key1] = dict.getKey("What's up?")
    const [key2, isNew2] = dict.getKey("What's up?")

    expect(key1).toBe(key2)
    expect(isNew2).toBe(false)
  })

  test('keys stay unique with more than 10k new strings in one ms and across the next ms', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    const dict = new StringDictionary()
    const keys = new Set<number>()
    for (let i = 0; i < 25_000; i++) {
      keys.add(dict.getKey(`a${i}`)[0])
    }
    now.mockReturnValue(1_700_000_000_001)
    for (let i = 0; i < 25_000; i++) {
      keys.add(dict.getKey(`b${i}`)[0])
    }
    expect(keys.size).toBe(50_000)
    for (const k of keys) {
      expect(Number.isSafeInteger(k)).toBe(true)
    }
  })

  test('keys stay unique when the clock goes backwards', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_500)
    const dict = new StringDictionary()
    const [k1] = dict.getKey('x')
    now.mockReturnValue(1_700_000_000_000)
    const [k2] = dict.getKey('y')
    expect(k2).not.toBe(k1)
  })

  test('clear() drops entries but never reuses keys', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    const dict = new StringDictionary()
    const [k1] = dict.getKey('x')
    dict.clear()
    const [k2, isNew] = dict.getKey('x')
    expect(isNew).toBe(true)
    expect(k2).not.toBe(k1)
  })
})

describe('StringDictionary eviction', () => {
  test('evicts least recently used entry past maxEntries and re-keys it', () => {
    const dict = new StringDictionary(2, Infinity)
    const [a] = dict.getKey('a')
    const [b] = dict.getKey('b')
    dict.getKey('a') // refresh a, b is now oldest
    dict.getKey('c') // evicts b

    expect(dict.getKey('a')).toEqual([a, false])
    const [b2, isNewB] = dict.getKey('b')
    expect(isNewB).toBe(true)
    expect(b2).not.toBe(a)
    expect(b2).not.toBe(b)
  })

  test('evicts by total string length', () => {
    const dict = new StringDictionary(Infinity, 10)
    dict.getKey('12345')
    dict.getKey('67890')
    dict.getKey('x') // 11 chars total, evicts '12345'

    expect(dict.getKey('67890')[1]).toBe(false)
    expect(dict.getKey('12345')[1]).toBe(true)
  })

  test('keeps a single oversized entry', () => {
    const dict = new StringDictionary(Infinity, 3)
    const [key] = dict.getKey('longer than limit')
    expect(dict.getKey('longer than limit')).toEqual([key, false])
  })
})
