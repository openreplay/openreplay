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
  let originalNavigator
  let mockWindow

  beforeEach(() => {
    originalNavigator = global.navigator

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
        cookie: 'testcookie=1',
      },
    }

    global.navigator = mockWindow.navigator
  })

  afterEach(() => {
    global.navigator = originalNavigator
  })

  test('detects Chrome browser and Windows OS correctly', () => {
    const result = uaParse(mockWindow as any)
    expect(result.browser).toBe('Chrome')
    expect(result.browserMajorVersion).toBe(91)
    expect(result.os).toBe('Windows')
    expect(result.osVersion).toBe('10')
  })

  test('detects screen dimensions correctly', () => {
    const result = uaParse(mockWindow as any)
    expect(result.width).toBe(1920)
    expect(result.height).toBe(1080)
    expect(result.screen).toBe('1920 x 1080')
  })

  test('detects mobile devices and iOS correctly', () => {
    mockWindow.navigator.userAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    mockWindow.navigator.appVersion = '5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)'
    const result = uaParse(mockWindow as any)
    expect(result.mobile).toBe(true)
    expect(result.os).toBe('iOS')
  })

  test('detects Firefox browser correctly', () => {
    mockWindow.navigator.userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
    const result = uaParse(mockWindow as any)
    expect(result.browser).toBe('Firefox')
    expect(result.browserMajorVersion).toBe(89)
  })

  test('detects Edge browser correctly', () => {
    mockWindow.navigator.userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
    const result = uaParse(mockWindow as any)
    expect(result.browser).toBe('Microsoft Edge')
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
  test('returns string in UTC±HH:MM format', () => {
    const result = getUTCOffsetString()
    expect(result).toMatch(/^UTC[+-]\d{2}:\d{2}$/)
  })
})
