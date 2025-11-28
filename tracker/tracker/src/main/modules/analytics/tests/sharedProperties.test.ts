// @ts-nocheck
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import SharedProperties from '../sharedProperties.js'
import * as utils from '../utils.js'

// Mock the utils module
jest.mock('../utils.js', () => ({
  uaParse: jest.fn(),
  isObject: jest.requireActual('../utils.js').isObject,
  getUTCOffsetString: () => 'UTC+01:00'
}))

describe('SharedProperties', () => {
  let mockApp
  let mockWindow
  let sessionStorage
  let localStorage

  const refKey = '$__initial_ref__$'
  const distinctIdKey = '$__distinct_device_id__$'

  beforeEach(() => {
    // Create mock storage implementations
    sessionStorage = {
      [refKey]: 'https://example.com',
    }
    localStorage = {}

    // Mock app with storage methods
    mockApp = {
      sessionStorage: {
        getItem: jest.fn((key) => sessionStorage[key] || null),
        setItem: jest.fn((key, value) => {
          sessionStorage[key] = value
        }),
      },
      localStorage: {
        getItem: jest.fn((key) => localStorage[key] || null),
        setItem: jest.fn((key, value) => {
          localStorage[key] = value
        }),
      },
    }

    // Mock window
    mockWindow = {
      location: {
        search: '?utm_source=test_source&utm_medium=test_medium&utm_campaign=test_campaign',
      },
    }

    // Mock document
    global.document = {
      referrer: 'https://example.com',
    }

    // Mock window globally to make it available to the constructor
    global.window = mockWindow

    // Setup mock data for uaParse
    utils.uaParse.mockReturnValue({
      width: 1920,
      height: 1080,
      browser: 'Chrome',
      browserVersion: '91.0.4472.124',
      browserMajorVersion: 91,
      os: 'Windows',
      osVersion: '10',
      mobile: false,
    })

    // Reset Math.random to ensure predictable device IDs for testing
    jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.1) // First call
      .mockReturnValueOnce(0.2) // Second call
      .mockReturnValueOnce(0.3) // Third call
  })

  afterEach(() => {
    jest.restoreAllMocks()
    delete global.document
    delete global.window
  })

  test('constructs with correct properties', () => {
    const properties = new SharedProperties(mockApp.localStorage, mockApp.sessionStorage)

    expect(utils.uaParse).toHaveBeenCalledWith(window)
    expect(properties.os).toBe('Windows')
    expect(properties.osVersion).toBe('10')
    expect(properties.browser).toBe('Chrome')
    expect(properties.browserVersion).toBe('91.0.4472.124 (91)')
    expect(properties.device).toBe('Desktop')
    expect(properties.screenHeight).toBe(1080)
    expect(properties.screenWidth).toBe(1920)
  })

  test('detects UTM parameters correctly', () => {
    const properties = new SharedProperties(mockApp.localStorage, mockApp.sessionStorage)

    expect(properties.utmSource).toBe('test_source')
    expect(properties.utmMedium).toBe('test_medium')
    expect(properties.utmCampaign).toBe('test_campaign')
  })

  test('handles missing UTM parameters', () => {
    mockWindow.location.search = ''
    const properties = new SharedProperties(mockApp.localStorage, mockApp.sessionStorage)

    expect(properties.utmSource).toBeNull()
    expect(properties.utmMedium).toBeNull()
    expect(properties.utmCampaign).toBeNull()
  })

  test('generates new device ID if none exists', () => {
    const properties = new SharedProperties(mockApp.localStorage, mockApp.sessionStorage)

    expect(mockApp.localStorage.getItem).toHaveBeenCalledWith(distinctIdKey)
    expect(mockApp.localStorage.setItem).toHaveBeenCalled()
    // (a-z0-9)\-(a-z0-9)\-(a-z0-9)
    expect(properties.deviceId).toMatch(/^[a-z0-9]{6,12}-[a-z0-9]{6,12}-[a-z0-9]{6,12}$/)
  })

  test('uses existing device ID if available', () => {
    localStorage[distinctIdKey] = 'existing-device-id'
    const properties = new SharedProperties(mockApp.localStorage, mockApp.sessionStorage)

    expect(mockApp.localStorage.getItem).toHaveBeenCalledWith(distinctIdKey)
    expect(mockApp.localStorage.setItem).not.toHaveBeenCalled()
    expect(properties.deviceId).toBe('existing-device-id')
  })

  test('gets referrer from session storage if available', () => {
    sessionStorage[refKey] = 'https://stored-referrer.com'
    const properties = new SharedProperties(mockApp.localStorage, mockApp.sessionStorage)

    expect(mockApp.sessionStorage.getItem).toHaveBeenCalledWith(refKey)
    expect(mockApp.sessionStorage.setItem).not.toHaveBeenCalled()
    expect(properties.initialReferrer).toBe('https://stored-referrer.com')
  })

  test('returns all properties with correct prefixes', () => {
    const properties = new SharedProperties(mockApp.localStorage, mockApp.sessionStorage)
    const allProps = properties.all

    expect(allProps).toMatchObject({
      $os: 'Windows',
      $os_version: '10',
      $browser: 'Chrome',
      $browser_version: '91.0.4472.124 (91)',
      $device: 'Desktop',
      $screen_height: 1080,
      $screen_width: 1920,
      $initial_referrer: expect.stringMatching(/^https:\/\/example\.com$/),
      $utm_source: 'test_source',
      $utm_medium: 'test_medium',
      $utm_campaign: 'test_campaign',
      $distinct_id: expect.stringMatching(/^[a-z0-9]{6,12}-[a-z0-9]{6,12}-[a-z0-9]{6,12}$/),
      $search_engine: null,
      $user_id: null,
      $device_id: expect.stringMatching(/^[a-z0-9]{6,12}-[a-z0-9]{6,12}-[a-z0-9]{6,12}$/),
    })
  })

  test('handles mobile device detection', () => {
    utils.uaParse.mockReturnValue({
      width: 375,
      height: 812,
      browser: 'Safari',
      browserVersion: '14.1.1',
      browserMajorVersion: 14,
      os: 'iOS',
      osVersion: '14.6',
      mobile: true,
    })

    const properties = new SharedProperties(mockApp.localStorage, mockApp.sessionStorage)

    expect(properties.device).toBe('Mobile')
    expect(properties.os).toBe('iOS')
    expect(properties.osVersion).toBe('14.6')
    expect(properties.browser).toBe('Safari')
    expect(properties.browserVersion).toBe('14.1.1 (14)')
  })
})
