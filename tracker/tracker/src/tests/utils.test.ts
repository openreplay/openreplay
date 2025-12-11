import { describe, expect, test, jest, afterEach, beforeEach } from '@jest/globals'
import {
  adjustTimeOrigin,
  getTimeOrigin,
  now,
  stars,
  normSpaces,
  isURL,
  deprecationWarn,
  getLabelAttribute,
  hasOpenreplayAttribute,
  canAccessIframe,
  generateRandomId,
  ngSafeBrowserMethod,
  requestIdleCb,
  inIframe,
  canAccessTarget,
  createEventListener,
  deleteEventListener,
  simpleMerge,
  throttleWithTrailing,
} from '../main/utils.js'

afterEach(() => {
  jest.useRealTimers()
})

describe('canAccessTarget', () => {
  test('returns false when access throws SecurityError', () => {
    const iframe = document.createElement('iframe')
    Object.defineProperty(iframe, 'contentDocument', {
      get: () => {
        throw new DOMException('denied', 'SecurityError')
      },
    })
    expect(canAccessTarget(iframe)).toBe(false)
  })

  test('returns true when target is accessible', () => {
    const iframe = document.createElement('iframe')
    Object.defineProperty(iframe, 'contentDocument', {
      get: () => document,
    })
    expect(canAccessTarget(iframe)).toBe(true)
  })
})

describe('createEventListener/deleteEventListener', () => {
  test('attaches and detaches listener', () => {
    const div = document.createElement('div')
    const handler = jest.fn()

    createEventListener(div, 'click', handler)
    div.dispatchEvent(new Event('click'))
    expect(handler).toHaveBeenCalledTimes(1)

    deleteEventListener(div, 'click', handler)
    div.dispatchEvent(new Event('click'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('does nothing if target cannot be accessed', () => {
    const iframe = document.createElement('iframe')
    Object.defineProperty(iframe, 'contentDocument', {
      get: () => {
        throw new DOMException('blocked', 'SecurityError')
      },
    })
    const spy = jest.spyOn(iframe, 'addEventListener')
    createEventListener(iframe, 'load', jest.fn())
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('simpleMerge', () => {
  test('merges objects recursively without mutating defaults', () => {
    const defaults = { a: 1, b: { c: 2, d: 3 } }
    const given = { b: { c: 5 }, e: 6 } as any

    const result = simpleMerge(defaults, given)

    expect(result).toEqual({ a: 1, b: { c: 5, d: 3 }, e: 6 })
    expect(defaults).toEqual({ a: 1, b: { c: 2, d: 3 } })
  })
})

describe('throttleWithTrailing', () => {
  test('executes trailing call with last arguments', () => {
    jest.useFakeTimers()
    const fn = jest.fn()
    const throttled = throttleWithTrailing<string, [number]>(fn, 50)

    throttled('a', 1)
    throttled('a', 2)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('a', 1)

    jest.advanceTimersByTime(60)

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('a', 2)
  })

  test('clear prevents pending trailing call', () => {
    jest.useFakeTimers()
    const fn = jest.fn()
    const throttled = throttleWithTrailing(fn, 50)

    throttled('a')
    throttled('a')

    throttled.clear()
    jest.advanceTimersByTime(60)

    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('adjustTimeOrigin', () => {
  test('adjusts the time origin based on performance.now', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000)
    jest.spyOn(performance, 'now').mockReturnValue(1000)
    adjustTimeOrigin()

    expect(getTimeOrigin()).toBe(0)
  })
})

describe('now', () => {
  test('returns the current timestamp in milliseconds', () => {
    jest.spyOn(Date, 'now').mockReturnValue(2550)
    jest.spyOn(performance, 'now').mockReturnValue(2550)

    adjustTimeOrigin()

    expect(now()).toBe(2550)
  })
})

describe('stars', () => {
  test('returns a string of asterisks with the same length as the input string', () => {
    expect(stars('hello')).toBe('*****')
  })

  test('returns an empty string if the input string is empty', () => {
    expect(stars('')).toBe('')
  })
})

describe('normSpaces', () => {
  test('trims the string and replaces multiple spaces with a single space', () => {
    expect(normSpaces('  hello   world  ')).toBe('hello world')
  })

  test('returns an empty string if the input string is empty', () => {
    expect(normSpaces('')).toBe('')
  })
})

describe('isURL', () => {
  test('returns true for a valid URL starting with "https://"', () => {
    expect(isURL('https://example.com')).toBe(true)
  })

  test('returns true for a valid URL starting with "http://"', () => {
    expect(isURL('http://example.com')).toBe(true)
  })

  test('returns false for a URL without a valid protocol', () => {
    expect(isURL('example.com')).toBe(false)
  })

  test('returns false for an empty string', () => {
    expect(isURL('')).toBe(false)
  })
})

describe('deprecationWarn', () => {
  let consoleWarnSpy: jest.SpiedFunction<(args: any) => void>

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((args) => args)
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
  })

  test('prints a warning message for a deprecated feature', () => {
    deprecationWarn('oldFeature', 'newFeature')
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'OpenReplay: oldFeature is deprecated. Please, use newFeature instead. Visit https://docs.openreplay.com/ for more information.',
    )
  })

  test('does not print a warning message for a deprecated feature that has already been warned', () => {
    deprecationWarn('oldFeature2', 'newFeature')
    deprecationWarn('oldFeature2', 'newFeature')
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
  })
})

describe('getLabelAttribute', () => {
  test('returns the value of "data-openreplay-label" attribute if present', () => {
    const element = document.createElement('div')
    element.setAttribute('data-openreplay-label', 'Label')
    expect(getLabelAttribute(element)).toBe('Label')
  })

  test('returns the value of "data-asayer-label" attribute if "data-openreplay-label" is not present (with deprecation warning)', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((args) => args)
    const element = document.createElement('div')
    element.setAttribute('data-asayer-label', 'Label')
    expect(getLabelAttribute(element)).toBe('Label')
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'OpenReplay: "data-asayer-label" attribute is deprecated. Please, use "data-openreplay-label" attribute instead. Visit https://docs.openreplay.com/ for more information.',
    )
    consoleWarnSpy.mockRestore()
  })

  test('returns null if neither "data-openreplay-label" nor "data-asayer-label" are present', () => {
    const element = document.createElement('div')
    expect(getLabelAttribute(element)).toBeNull()
  })
})

describe('hasOpenreplayAttribute', () => {
  let consoleWarnSpy: jest.SpiedFunction<(args: any) => void>

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((args) => args)
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
  })

  test('returns true and prints a deprecation warning for a deprecated openreplay attribute', () => {
    const element = document.createElement('div')
    element.setAttribute('data-openreplay-htmlmasked', 'true')
    const result = hasOpenreplayAttribute(element, 'htmlmasked')
    expect(result).toBe(true)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'OpenReplay: "data-openreplay-htmlmasked" attribute is deprecated. Please, use "hidden" attribute instead. Visit https://docs.openreplay.com/en/sdk/sanitize-data for more information.',
    )
  })

  test('returns false for a non-existent openreplay attribute', () => {
    const element = document.createElement('div')
    const result = hasOpenreplayAttribute(element, 'nonexistent')
    expect(result).toBe(false)
    expect(consoleWarnSpy).not.toHaveBeenCalled()
  })
})

describe('canAccessIframe', () => {
  test('returns true if the iframe has a contentDocument', () => {
    const iframe = document.createElement('iframe')
    Object.defineProperty(iframe, 'contentDocument', {
      get: () => document.createElement('div'),
    })
    expect(canAccessIframe(iframe)).toBe(true)
  })

  test('returns false if the iframe does not have a contentDocument', () => {
    const iframe = document.createElement('iframe')
    // Mock iframe.contentDocument to throw an error
    Object.defineProperty(iframe, 'contentDocument', {
      get: () => {
        throw new Error('securityError')
      },
    })
    expect(canAccessIframe(iframe)).toBe(false)
  })
})

describe('generateRandomId', () => {
  test('generates a random ID with the specified length', () => {
    const id = generateRandomId(10)
    expect(id).toHaveLength(10)
    expect(/^[0-9a-f]+$/.test(id)).toBe(true)
  })

  test('generates a random ID with the default length if no length is specified', () => {
    const id = generateRandomId()
    expect(id).toHaveLength(40)
    expect(/^[0-9a-f]+$/.test(id)).toBe(true)
  })

  test('falls back to Math.random if crypto api is not available', () => {
    const originalCrypto = window.crypto
    // @ts-ignore
    window.crypto = undefined
    const id = generateRandomId(20)
    expect(id).toHaveLength(20)
    expect(/^[0-9a-f]+$/.test(id)).toBe(true)
  })
})

describe('ngSafeBrowserMethod', () => {
  test('returns the method as-is if Zone and __symbol__ are not in window.Zone', () => {
    //@ts-ignore
    window.Zone = undefined // Ensure Zone is not in the window object
    expect(ngSafeBrowserMethod('someMethod')).toBe('someMethod')
  })

  test('returns the __symbol__ of the method if Zone and __symbol__ are in window.Zone', () => {
    //@ts-ignore
    window.Zone = {
      __symbol__: (method: string) => `__${method}__`,
    }
    expect(ngSafeBrowserMethod('someMethod')).toBe('__someMethod__')
  })
})

describe('requestIdleCb', () => {
  test('testing FIFO scheduler', async () => {
    jest.useFakeTimers()
    // @ts-ignore
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => cb())
    const cb1 = jest.fn()
    const cb2 = jest.fn()

    requestIdleCb(cb1)
    requestIdleCb(cb2)

    expect(cb1).toHaveBeenCalled()
    expect(cb2).toHaveBeenCalledTimes(0)
    await jest.advanceTimersToNextTimerAsync(1)

    expect(cb2).toHaveBeenCalledTimes(1)
  })
})

describe('inIframe', () => {
  test('returns true if the code is running inside an iframe', () => {
    const originalSelf = window.self

    Object.defineProperty(window, 'self', { value: {} })

    expect(inIframe()).toBe(true)

    Object.defineProperty(window, 'self', { value: originalSelf })
  })
})
