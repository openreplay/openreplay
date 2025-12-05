// @ts-nocheck
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { uaParse, isObject } from '../utils.js'

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
  let originalScreen
  let originalDocument
  let mockWindow

  beforeEach(() => {
    // Save original objects
    originalNavigator = global.navigator
    originalScreen = global.screen
    originalDocument = global.document

    // Create mock screen
    global.screen = {
      width: 1920,
      height: 1080,
    }

    // Setup mock document
    global.document = {
      cookie: 'testcookie=1',
    }

    // Setup mock window with basic navigator
    mockWindow = {
      navigator: {
        appVersion: 'test version',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        appName: 'Netscape',
        cookieEnabled: true,
      },
      screen: {
        width: 1920,
        height: 1080,
      },
      document: global.document,
    }

    // Set global navigator
    global.navigator = mockWindow.navigator
  })

  afterEach(() => {
    // Restore original objects
    global.navigator = originalNavigator
    global.screen = originalScreen
    global.document = originalDocument
  })

  test('detects Chrome browser correctly', () => {
    const result = uaParse(mockWindow)
    expect(result.browser).toBe('Chrome')
    expect(result.browserMajorVersion).toBe(91)
    expect(result.os).toBe('Windows')
  })

  test('detects screen dimensions correctly', () => {
    const result = uaParse(mockWindow)
    expect(result.width).toBe(1920)
    expect(result.height).toBe(1080)
    expect(result.screen).toBe('1920 x 1080')
  })

  test('detects mobile devices correctly', () => {
    mockWindow.navigator.userAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    mockWindow.navigator.appVersion = 'iPhone'
    const result = uaParse(mockWindow)
    expect(result.mobile).toBe(true)
    expect(result.os).toBe('iOS')
  })

  test('detects Firefox browser correctly', () => {
    mockWindow.navigator.userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
    const result = uaParse(mockWindow)
    expect(result.browser).toBe('Firefox')
    expect(result.browserMajorVersion).toBe(89)
  })

  test('detects Edge browser correctly', () => {
    mockWindow.navigator.userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
    const result = uaParse(mockWindow)
    expect(result.browser).toBe('Microsoft Edge')
  })

  test('detects cookies correctly', () => {
    const result = uaParse(mockWindow)
    expect(result.cookies).toBe(true)

    mockWindow.navigator.cookieEnabled = false
    const result2 = uaParse(mockWindow)
    expect(result2.cookies).toBe(false)
  })

  test('handles undefined screen dimensions', () => {
    delete global.screen.width
    delete global.screen.height
    delete mockWindow.screen.width
    delete mockWindow.screen.height

    const result = uaParse(mockWindow)
    expect(result.width).toBe(0)
    expect(result.height).toBe(0)
    expect(result.screen).toBe('')
  })
})
