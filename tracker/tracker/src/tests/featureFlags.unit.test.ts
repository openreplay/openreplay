import FeatureFlags, { PersistFlagsData } from '../main/modules/FeatureFlags'
import { describe, expect, jest, afterEach, beforeEach, test } from '@jest/globals'

jest.mock('../main/app/index.js')

const sessionInfo = {
  projectID: 'project1',
  userID: 'user1',
  metadata: {},
}

describe('FeatureFlags', () => {
  // @ts-ignore
  let featureFlags: FeatureFlags
  let appMock = {
    localStorage: { setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn() },
    options: {
      ingestPoint: 'test',
    },
    session: {
      getInfo: () => sessionInfo,
      getSessionToken: () => '123',
    },
  }

  beforeEach(() => {
    // @ts-ignore
    featureFlags = new FeatureFlags(appMock)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('should check if a flag is enabled', () => {
    const flagName = 'flag1'
    featureFlags.flags = {
      flag1: { enabled: true },
      flag2: { enabled: false },
    }

    const result = featureFlags.isFlagEnabled(flagName)

    expect(result).toBe(true)
  })

  test('should invoke the callback function when flags are loaded', () => {
    const flags = [{ key: 'flag1', is_persist: false, value: true, payload: 'payload1' }]
    const callback = jest.fn()

    featureFlags.onFlagsLoad(callback)
    featureFlags.handleFlags(flags)

    expect(callback).toHaveBeenCalledWith(flags)
  })

  test('should reload flags and handle the response', async () => {
    const flags = [
      { key: 'flag1', is_persist: true, value: true, payload: 'payload1' },
      { key: 'flag2', is_persist: false, value: false, payload: 'payload2' },
    ]
    const expectedRequestObject = {
      projectID: sessionInfo.projectID,
      userID: sessionInfo.userID,
      metadata: sessionInfo.metadata,
      referrer: document.referrer,
      featureFlags: featureFlags.flags,
      os: 'test',
      osVersion: 'test',
      device: 'test',
      country: 'test',
      state: 'test',
      city: 'test',
      ua: 'test',
      browser: 'test',
      browserVersion: 'test',
      deviceType: 'test',
      persistFlags: [],
    }
    const spyOnHandle = jest.spyOn(featureFlags, 'handleFlags')
    const expectedResponse = { flags }
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      // @ts-ignore
      json: jest.fn().mockResolvedValue(expectedResponse),
    })

    await featureFlags.reloadFlags()

    expect(fetch).toHaveBeenCalledWith(
      `${appMock.options.ingestPoint}/v1/web/feature-flags`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appMock.session.getSessionToken()}`,
        }),
        body: JSON.stringify(expectedRequestObject),
      }),
    )
    expect(spyOnHandle).toHaveBeenCalledWith(flags)
  })

  test('should clear persisted flags', () => {
    featureFlags.clearPersistFlags()

    expect(appMock.localStorage.removeItem).toHaveBeenCalledWith(featureFlags.storageKey)
  })

  test('should calculate the diff of persisted flags', () => {
    const flags: PersistFlagsData[] = [
      { key: 'flag1', value: true },
      { key: 'flag2', value: false },
      { key: 'flag3', value: false },
    ]
    // @ts-ignore
    appMock.localStorage.getItem = jest
      .fn()
      .mockReturnValue('{"key":"flag1","value":true};{"key":"flag2","value":true}')

    const result = featureFlags.diffPersist(flags)

    expect(result).toEqual([{ key: 'flag3', value: false }])
  })
})
