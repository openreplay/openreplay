import { describe, expect, jest, test } from '@jest/globals'
import network from '../main/modules/network.js'
import type { AxiosInstance } from '../main/modules/axiosSpy.js'

// fetch/XHR go through the proxy package; only the axios capture path is under test here
jest.mock('@openreplay/network-proxy', () => ({ __esModule: true, default: jest.fn() }))

// Minimal stand-in for axios v1 `AxiosHeaders` (what axiosSpy reads through toJSON()).
class FakeAxiosHeaders {
  constructor(private readonly values: Record<string, string>) {}
  set(name: string, value: string) {
    this.values[name] = value
  }
  toJSON() {
    return { ...this.values }
  }
}

function recordAxiosRequest(privateMode: boolean, sanitizer?: (data: any) => any) {
  let onRequest: ((config: any) => any) | undefined
  let onResponse: ((response: any) => any) | undefined
  const instance: AxiosInstance = {
    getUri: (config?: any) => `${config?.baseURL ?? ''}${config?.url ?? ''}`,
    interceptors: {
      request: {
        use: (onFulfilled: any) => {
          onRequest = onFulfilled
          return 0
        },
      },
      response: {
        use: (onFulfilled: any) => {
          onResponse = onFulfilled
          return 0
        },
      },
    },
  }
  const send = jest.fn()
  const app = {
    sanitizer: { privateMode },
    debug: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    notify: { warn: jest.fn() },
    send,
    safe: (fn: any) => fn,
    isServiceURL: () => false,
    getSessionToken: () => undefined,
    attachStopCallback: jest.fn(),
  }
  // @ts-ignore partial app mock
  network(app, { axiosInstances: [instance], captureInIframes: false, sanitizer })

  const config = onRequest!({
    url: '/users/jane.doe@example.com/orders?card=4111111111111111',
    method: 'get',
    baseURL: 'https://shop.example',
    headers: new FakeAxiosHeaders({ Accept: 'application/json', 'X-Customer-Id': '42' }),
  })
  onResponse!({
    data: { ok: true },
    status: 200,
    statusText: 'OK',
    headers: new FakeAxiosHeaders({ 'x-request-id': 'abc' }),
    config,
  })
  const axiosMessages = send.mock.calls.map((c) => c[0] as any[])
  expect(axiosMessages).toHaveLength(1)
  const [message] = axiosMessages
  return {
    url: message[3] as string,
    requestHeaders: JSON.parse(message[4]).headers,
    responseHeaders: JSON.parse(message[5]).headers,
  }
}

describe('network privateMode with axios instances', () => {
  test('masks the url and drops all headers, like fetch/XHR capture does', () => {
    const recorded = recordAxiosRequest(true)
    expect(recorded.url).toBe('************')
    expect(recorded.requestHeaders).toEqual({})
    expect(recorded.responseHeaders).toEqual({})
  })

  test('keeps url and headers when privateMode is off', () => {
    const recorded = recordAxiosRequest(false)
    expect(recorded.url).toBe('/users/jane.doe@example.com/orders?card=4111111111111111')
    expect(recorded.requestHeaders).toEqual({ Accept: 'application/json', 'X-Customer-Id': '42' })
    expect(recorded.responseHeaders).toEqual({ 'x-request-id': 'abc' })
  })

  test('user sanitizer sees the real url but no headers, and the url is masked after it', () => {
    const seen: any[] = []
    const recorded = recordAxiosRequest(true, (data) => {
      seen.push(JSON.parse(JSON.stringify(data)))
      return data
    })
    expect(seen).toHaveLength(1)
    expect(seen[0].url).toBe('/users/jane.doe@example.com/orders?card=4111111111111111')
    expect(seen[0].request.headers).toEqual({})
    expect(seen[0].response.headers).toEqual({})
    expect(recorded.url).toBe('************')
  })
})
