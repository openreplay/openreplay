import { expect, jest, test } from '@jest/globals'
import createNetworkProxy, { hookAxios, type NetworkProxyOptions } from '@openreplay/network-proxy'
import type App from '../main/app/index.js'
import network, { type AxiosInstance, type RequestResponseData } from '../main/modules/network.js'

jest.mock('@openreplay/network-proxy', () => ({
  __esModule: true,
  default: jest.fn(),
  hookAxios: jest.fn(),
}))

test('discard restores native network proxies and ejects axios interceptors', () => {
  const restoreNative = jest.fn()
  const unhookAxios = jest.fn()
  jest.mocked(createNetworkProxy).mockReturnValue(restoreNative)
  jest.mocked(hookAxios).mockReturnValue(unhookAxios)
  let disposed = false
  const stops: (() => void)[] = []
  const app = {
    isDisposed: () => disposed,
    attachStopCallback: (callback: () => void) => {
      stops.push(callback)
    },
    sanitizer: { privateMode: false },
  } as unknown as App
  const instance: AxiosInstance = {
    interceptors: {
      request: { use: () => 0 },
      response: { use: () => 0 },
    },
  }
  const sanitize = jest.fn((data: RequestResponseData) => data)
  network(app, { axiosInstances: [instance], captureInIframes: false, sanitizer: sanitize })

  expect(createNetworkProxy).toHaveBeenCalledTimes(1)
  expect(jest.mocked(createNetworkProxy).mock.calls[0][0] === window).toBe(true)
  expect(hookAxios).toHaveBeenCalledWith(instance, expect.any(Object))
  stops.forEach((stop) => stop())
  expect(restoreNative).not.toHaveBeenCalled()
  expect(unhookAxios).not.toHaveBeenCalled()

  disposed = true
  stops.forEach((stop) => stop())
  expect(restoreNative).toHaveBeenCalledTimes(1)
  expect(unhookAxios).toHaveBeenCalledTimes(1)
  const options = jest.mocked(hookAxios).mock.calls[0][1] as unknown as NetworkProxyOptions
  const message = {
    method: 'GET',
    url: 'https://example.invalid/',
    status: 200,
    request: { body: null, headers: {} },
    response: { body: null, headers: {} },
  }
  expect(options.sanitize?.(message)).toBeNull()
  expect(sanitize).not.toHaveBeenCalled()
})
