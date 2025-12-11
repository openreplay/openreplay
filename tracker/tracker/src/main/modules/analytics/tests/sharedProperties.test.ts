// @ts-nocheck
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import ConstantProperties from '../constantProperties.js'
import * as utils from '../utils.js'

jest.mock('../utils.js', () => ({
  uaParse: jest.fn(),
  isObject: jest.requireActual('../utils.js').isObject,
  getUTCOffsetString: () => 'UTC+01:00',
}))

describe('ConstantProperties', () => {
  const refKey = '$__or__initial_ref__$'
  const distinctIdKey = '$__or__distinct_device_id__$'
  const utmParamsKey = '$__or__utm_params__$'
  const superPropKey = '$__or__super_properties__$'
  const userIdKey = '$__or__user_id__$'

  let sessionStorageStore: Record<string, string>
  let localStorageStore: Record<string, string>
  let sessionStorageMock: any
  let localStorageMock: any
  let originalReferrer: string
  let originalLocation: Location | any

  beforeEach(() => {
    sessionStorageStore = {}
    localStorageStore = {}

    sessionStorageMock = {
      getItem: jest.fn((key: string) =>
        Object.prototype.hasOwnProperty.call(sessionStorageStore, key)
          ? sessionStorageStore[key]
          : null,
      ),
      setItem: jest.fn((key: string, value: string) => {
        sessionStorageStore[key] = value
      }),
    }

    localStorageMock = {
      getItem: jest.fn((key: string) =>
        Object.prototype.hasOwnProperty.call(localStorageStore, key)
          ? localStorageStore[key]
          : null,
      ),
      setItem: jest.fn((key: string, value: string) => {
        localStorageStore[key] = value
      }),
    }

    originalReferrer = document.referrer
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: 'https://example.com',
    })

    ;(utils.uaParse as jest.Mock).mockReturnValue({
      width: 1920,
      height: 1080,
      browser: 'Chrome',
      browserVersion: '91.0.4472.124',
      browserMajorVersion: 91,
      os: 'Windows',
      osVersion: '10',
      mobile: false,
    })
  })

  afterEach(() => {
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: originalReferrer,
    })

    jest.restoreAllMocks()
  })

  test('constructs with correct base properties', () => {
    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)

    expect(utils.uaParse).toHaveBeenCalledWith(window)
    expect(properties.os).toBe('Windows')
    expect(properties.osVersion).toBe('10')
    expect(properties.browser).toBe('Chrome')
    expect(properties.browserVersion).toBe('91.0.4472.124 (91)')
    expect(properties.platform).toBe('desktop')
    expect(properties.screenHeight).toBe(1080)
    expect(properties.screenWidth).toBe(1920)
    expect(properties.initialReferrer).toBe('https://example.com')
    expect(properties.searchEngine).toBeNull()
    expect(properties.user_id).toBeNull()
  })

  test('detects UTM parameters from URL and stores them', () => {
    const OriginalURLSearchParams = global.URLSearchParams
    ;(global as any).URLSearchParams = class {
      constructor(search: string) {
        this._search = search
      }
      get(name: string) {
        const map: Record<string, string> = {
          utm_source: 'test_source',
          utm_medium: 'test_medium',
          utm_campaign: 'test_campaign',
        }
        return map[name] ?? null
      }
    } as any
    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)

    expect(properties.utmSource).toBe('test_source')
    expect(properties.utmMedium).toBe('test_medium')
    expect(properties.utmCampaign).toBe('test_campaign')

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      utmParamsKey,
      JSON.stringify({
        utm_source: 'test_source',
        utm_medium: 'test_medium',
        utm_campaign: 'test_campaign',
      }),
    )
    ;(global as any).URLSearchParams = OriginalURLSearchParams
  })

  test('reuses stored UTM parameters if present in sessionStorage', () => {
    sessionStorageStore[utmParamsKey] = JSON.stringify({
      utm_source: 'stored_source',
      utm_medium: 'stored_medium',
      utm_campaign: 'stored_campaign',
    })

    window.location.search =
      '?utm_source=ignored_source&utm_medium=ignored_medium&utm_campaign=ignored_campaign'

    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)

    expect(properties.utmSource).toBe('stored_source')
    expect(properties.utmMedium).toBe('stored_medium')
    expect(properties.utmCampaign).toBe('stored_campaign')

    expect(sessionStorageMock.setItem).not.toHaveBeenCalledWith(utmParamsKey, expect.any(String))
  })

  test('handles missing UTM parameters when not provided', () => {
    window.location.search = ''

    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)

    expect(properties.utmSource).toBeNull()
    expect(properties.utmMedium).toBeNull()
    expect(properties.utmCampaign).toBeNull()

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      utmParamsKey,
      JSON.stringify({
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
      }),
    )
  })

  test('generates new device ID if none exists in localStorage', () => {
    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)

    expect(localStorageMock.getItem).toHaveBeenCalledWith(distinctIdKey)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(distinctIdKey, expect.any(String))
    expect(properties.deviceId).toMatch(/^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/)
  })

  test('uses existing device ID from localStorage when available', () => {
    localStorageStore[distinctIdKey] = 'existing-device-id'

    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)

    expect(localStorageMock.getItem).toHaveBeenCalledWith(distinctIdKey)
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith(distinctIdKey, expect.any(String))
    expect(properties.deviceId).toBe('existing-device-id')
  })

  test('distinctId getter returns deviceId', () => {
    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)
    expect(properties.distinctId).toBe(properties.deviceId)
  })

  test('gets referrer from session storage if available', () => {
    sessionStorageStore[refKey] = 'https://stored-referrer.com'

    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)

    expect(sessionStorageMock.getItem).toHaveBeenCalledWith(refKey)
    expect(sessionStorageMock.setItem).not.toHaveBeenCalledWith(refKey, expect.any(String))
    expect(properties.initialReferrer).toBe('https://stored-referrer.com')
  })

  test('detects search engine from referrer', () => {
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: 'https://www.google.com/search?q=openreplay',
    })

    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)

    expect(properties.initialReferrer).toBe('https://www.google.com/search?q=openreplay')
    expect(properties.searchEngine).toBe('google')
  })

  test('reads user id from session storage when present', () => {
    sessionStorageStore[userIdKey] = 'user-123'

    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)

    expect(properties.user_id).toBe('user-123')
  })

  test('setUserId updates user_id and persists to sessionStorage', () => {
    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)

    properties.setUserId('abc-123')
    expect(properties.user_id).toBe('abc-123')
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(userIdKey, 'abc-123')

    properties.setUserId(null)
    expect(properties.user_id).toBeNull()
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(userIdKey, '')
  })

  test('resetUserId soft reset clears user_id but keeps deviceId', () => {
    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)
    properties.setUserId('abc-123')
    const deviceIdBefore = properties.deviceId

    properties.resetUserId()
    expect(properties.user_id).toBeNull()
    expect(properties.deviceId).toBe(deviceIdBefore)
  })

  test('resetUserId hard reset regenerates deviceId', () => {
    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)
    const oldDeviceId = properties.deviceId

    properties.resetUserId(true)

    expect(properties.user_id).toBeNull()
    expect(properties.deviceId).toMatch(/^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/)
    expect(properties.deviceId).not.toBe(oldDeviceId)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(distinctIdKey, properties.deviceId)
  })

  test('getSuperProperties returns empty object when not set', () => {
    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)

    const result = properties.getSuperProperties()
    expect(result).toEqual({})
  })

  test('getSuperProperties returns parsed object when stored', () => {
    localStorageStore[superPropKey] = JSON.stringify({ foo: 'bar', answer: 42 })

    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)

    const result = properties.getSuperProperties()
    expect(result).toEqual({ foo: 'bar', answer: 42 })
  })

  test('saveSuperProperties persists object as JSON', () => {
    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)

    const props = { a: 1, b: 'two' }
    properties.saveSuperProperties(props)

    expect(localStorageMock.setItem).toHaveBeenCalledWith(superPropKey, JSON.stringify(props))
    expect(JSON.parse(localStorageStore[superPropKey])).toEqual(props)
  })

  test('clearSuperProperties stores empty object', () => {
    localStorageStore[superPropKey] = JSON.stringify({ foo: 'bar' })

    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)
    properties.clearSuperProperties()

    expect(localStorageMock.setItem).toHaveBeenCalledWith(superPropKey, JSON.stringify({}))
    expect(JSON.parse(localStorageStore[superPropKey])).toEqual({})
  })

  test('all getter returns full property map with correct keys', () => {
    const OriginalURLSearchParams = global.URLSearchParams
    ;(global as any).URLSearchParams = class {
      constructor(search: string) {
        this._search = search
      }
      get(name: string) {
        const map: Record<string, string> = {
          utm_source: 'test_source',
          utm_medium: 'test_medium',
          utm_campaign: 'test_campaign',
        }
        return map[name] ?? null
      }
    } as any
    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)
    const all = properties.all

    expect(all).toMatchObject({
      os: 'Windows',
      os_version: '10',
      browser: 'Chrome',
      browser_version: '91.0.4472.124 (91)',
      platform: 'desktop',
      screen_height: 1080,
      screen_width: 1920,
      initial_referrer: 'https://example.com',
      utm_source: 'test_source',
      utm_medium: 'test_medium',
      utm_campaign: 'test_campaign',
      user_id: null,
      sdk_edition: 'web',
      sdk_version: 'TRACKER_VERSION',
      timezone: 'UTC+01:00',
      search_engine: null,
    })

    expect(all.distinct_id).toBe(properties.deviceId)
    ;(global as any).URLSearchParams = OriginalURLSearchParams
  })

  test('defaultPropertyKeys matches keys of all', () => {
    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)

    const keysFromGetter = properties.defaultPropertyKeys
    const keysFromAll = Object.keys(properties.all)

    expect(keysFromGetter.sort()).toEqual(keysFromAll.sort())
  })

  test('handles mobile device detection and updates platform', () => {
    ;(utils.uaParse as jest.Mock).mockReturnValue({
      width: 375,
      height: 812,
      browser: 'Safari',
      browserVersion: '14.1.1',
      browserMajorVersion: 14,
      os: 'iOS',
      osVersion: '14.6',
      mobile: true,
    })

    const properties = new ConstantProperties(localStorageMock, sessionStorageMock)

    expect(properties.platform).toBe('mobile')
    expect(properties.os).toBe('iOS')
    expect(properties.osVersion).toBe('14.6')
    expect(properties.browser).toBe('Safari')
    expect(properties.browserVersion).toBe('14.1.1 (14)')
  })
})
