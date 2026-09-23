// @ts-nocheck
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { uaParse, isObject, getUTCOffsetString } from '../utils.js'

describe('isObject', () => {
  test('returns true for objects', () => {
    expect(isObject({})).toBe(true)
    expect(isObject({ a: 1 })).toBe(true)
    expect(isObject(new Object())).toBe(true)
  })

  test('returns false for non-objects', () => {
    expect(isObject(null)).toBe(false)
    expect(isObject(undefined)).toBe(false)
    expect(isObject([])).toBe(false)
    expect(isObject('string')).toBe(false)
    expect(isObject(123)).toBe(false)
    expect(isObject(true)).toBe(false)
    expect(isObject(function () {})).toBe(false)
  })
})

describe('uaParse', () => {
  let mockWindow

  beforeEach(() => {
    mockWindow = {
      navigator: {
        appVersion: '5.0 (Windows NT 10.0; Win64; x64)',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        appName: 'Netscape',
        cookieEnabled: true,
      },
      screen: {
        width: 1920,
        height: 1080,
      },
      document: {
        cookie: '',
      },
    }
  })

  test('detects Chrome browser and Windows OS correctly', () => {
    const result = uaParse(mockWindow as any)
    expect(result.browser).toBe('Chrome')
    expect(result.browserMajorVersion).toBe(91)
    expect(result.os).toBe('Windows')
    expect(result.osVersion).toBe('10')
  })

  test('detects mobile devices and iOS correctly', () => {
    mockWindow.navigator.userAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    mockWindow.navigator.appVersion = '5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)'
    const result = uaParse(mockWindow as any)
    expect(result.mobile).toBe(true)
    expect(result.os).toBe('iOS')
    expect(result.osVersion).toBe('14.6.0')
    expect(result.browser).toBe('Safari')
    expect(result.browserVersion).toBe('14.0')
    expect(result.browserMajorVersion).toBe(14)
  })

  test('detects Firefox browser correctly', () => {
    mockWindow.navigator.userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
    const result = uaParse(mockWindow as any)
    expect(result.browser).toBe('Firefox')
    expect(result.browserMajorVersion).toBe(89)
  })

  test('detects Chromium Edge and legacy Edge', () => {
    mockWindow.navigator.userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
    const edge = uaParse(mockWindow as any)
    expect(edge.browser).toBe('Microsoft Edge')
    expect(edge.browserVersion).toBe('91.0.864.59')
    expect(edge.browserMajorVersion).toBe(91)

    mockWindow.navigator.userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.19582'
    const legacy = uaParse(mockWindow as any)
    expect(legacy.browser).toBe('Microsoft Legacy Edge')
    expect(legacy.browserMajorVersion).toBe(18)
  })

  test('detects Mac OS X and version correctly', () => {
    mockWindow.navigator.userAgent =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
    mockWindow.navigator.appVersion = '5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    const result = uaParse(mockWindow as any)
    expect(result.os).toBe('Mac OS X')
    expect(result.osVersion).toBe('10_15_7')
  })

  test('detects cookies correctly from navigator.cookieEnabled', () => {
    const result = uaParse(mockWindow as any)
    expect(result.cookies).toBe(true)

    mockWindow.navigator.cookieEnabled = false
    const result2 = uaParse(mockWindow as any)
    expect(result2.cookies).toBe(false)
  })

  test('falls back to a test cookie when navigator.cookieEnabled is missing', () => {
    delete mockWindow.navigator.cookieEnabled
    const original = Object.getOwnPropertyDescriptor(window, 'navigator')
    Object.defineProperty(window, 'navigator', { value: mockWindow.navigator, configurable: true })
    try {
      expect(uaParse(mockWindow as any).cookies).toBe(true)
      expect(mockWindow.document.cookie).toBe('testcookie')

      // cookie write silently rejected
      Object.defineProperty(mockWindow.document, 'cookie', { get: () => '', set: () => {} })
      expect(uaParse(mockWindow as any).cookies).toBe(false)
    } finally {
      if (original) Object.defineProperty(window, 'navigator', original)
      else delete (window as any).navigator
    }
  })

  test('handles undefined screen dimensions', () => {
    delete mockWindow.screen.width
    delete mockWindow.screen.height

    const result = uaParse(mockWindow as any)
    expect(result.width).toBe(0)
    expect(result.height).toBe(0)
    expect(result.screen).toBe('')
  })
})

describe('getUTCOffsetString', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test.each([
    [-330, 'UTC+05:30'],
    [0, 'UTC+00:00'],
    [300, 'UTC-05:00'],
    [-345, 'UTC+05:45'],
    [210, 'UTC-03:30'],
  ])('offset %i minutes → %s', (offset, expected) => {
    jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(offset)
    expect(getUTCOffsetString()).toBe(expected)
  })
})
