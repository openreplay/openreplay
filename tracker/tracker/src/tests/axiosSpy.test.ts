import { describe, expect, jest, test } from '@jest/globals'
import axiosSpy from '../main/modules/axiosSpy.js'
import type { AxiosInstance } from '../main/modules/axiosSpy.js'
import type { Options, RequestResponseData } from '../main/modules/network.js'

// Minimal stand-in for axios v1 `AxiosHeaders`: keeps the header names as they were set
// and exposes them through `toJSON()`, which is what axiosSpy reads.
class FakeAxiosHeaders {
  private readonly values: Record<string, string>
  constructor(values: Record<string, string>) {
    this.values = { ...values }
  }
  set(name: string, value: string) {
    this.values[name] = value
  }
  toJSON() {
    return { ...this.values }
  }
}

function createInstance() {
  const handlers: { request?: (c: any) => any; response?: (r: any) => any } = {}
  const instance: AxiosInstance = {
    getUri: (config?: any) => `${config?.baseURL ?? ''}${config?.url ?? ''}`,
    interceptors: {
      request: {
        use: (onFulfilled: any) => {
          handlers.request = onFulfilled
          return 0
        },
      },
      response: {
        use: (onFulfilled: any) => {
          handlers.response = onFulfilled
          return 0
        },
      },
    },
  }
  return { instance, handlers }
}

function setup(opts: Partial<Options> = {}) {
  const send = jest.fn()
  const app = {
    debug: { log: jest.fn() },
    send,
    getSessionToken: () => 'session-token',
    attachStopCallback: jest.fn(),
  }
  const options: Options = {
    failuresOnly: false,
    ignoreHeaders: ['cookie', 'set-cookie', 'authorization'],
    capturePayload: false,
    sessionTokenHeader: false,
    captureInIframes: true,
    ...opts,
  }
  const { instance, handlers } = createInstance()
  const sanitize = (data: RequestResponseData) => data
  const stringify = (data: { headers: Record<string, string>; body: any }) => JSON.stringify(data)
  // @ts-ignore partial app mock
  axiosSpy(app, instance, options, sanitize, stringify)
  return { send, handlers }
}

function roundTrip(
  handlers: ReturnType<typeof setup>['handlers'],
  requestHeaders: Record<string, string>,
  responseHeaders: Record<string, string>,
) {
  const config = handlers.request!({
    url: '/api/me',
    method: 'get',
    baseURL: 'https://example.com',
    headers: new FakeAxiosHeaders(requestHeaders),
  })
  handlers.response!({
    data: { ok: true },
    status: 200,
    statusText: 'OK',
    headers: new FakeAxiosHeaders(responseHeaders),
    config,
  })
}

function sentHeaders(send: jest.Mock) {
  expect(send).toHaveBeenCalledTimes(1)
  const message = send.mock.calls[0][0] as any[]
  return {
    request: JSON.parse(message[4]).headers as Record<string, string>,
    response: JSON.parse(message[5]).headers as Record<string, string>,
  }
}

describe('axiosSpy ignoreHeaders', () => {
  test('drops default ignored headers from AxiosHeaders request and response', () => {
    const { send, handlers } = setup()
    roundTrip(
      handlers,
      { Accept: 'application/json', Authorization: 'Bearer secret', Cookie: 'sid=1' },
      { 'content-type': 'application/json', 'set-cookie': 'sid=2' },
    )
    const { request, response } = sentHeaders(send)
    expect(request).toEqual({ Accept: 'application/json' })
    expect(response).toEqual({ 'content-type': 'application/json' })
  })

  test('matches custom ignored header names case-insensitively', () => {
    const { send, handlers } = setup({ ignoreHeaders: ['X-Api-Key'] })
    roundTrip(handlers, { 'x-api-key': 'k', Accept: '*/*' }, { 'X-API-KEY': 'k' })
    const { request, response } = sentHeaders(send)
    expect(request).toEqual({ Accept: '*/*' })
    expect(response).toEqual({})
  })

  test('drops every header when ignoreHeaders is true', () => {
    const { send, handlers } = setup({ ignoreHeaders: true })
    roundTrip(handlers, { Accept: '*/*', Authorization: 'Bearer secret' }, { 'x-trace': '1' })
    const { request, response } = sentHeaders(send)
    expect(request).toEqual({})
    expect(response).toEqual({})
  })
})
