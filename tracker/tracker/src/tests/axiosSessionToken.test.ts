import { describe, expect, jest, test } from '@jest/globals'
import axiosSpy from '../main/modules/axiosSpy.js'
import type { AxiosInstance } from '../main/modules/axiosSpy.js'
import type { Options } from '../main/modules/network.js'

function setup(opts: Partial<Options>) {
  let onRequest: ((config: any) => any) | undefined
  const instance: AxiosInstance = {
    getUri: (config?: any) => `${config?.baseURL ?? ''}${config?.url ?? ''}`,
    interceptors: {
      request: {
        use: (onFulfilled: any) => {
          onRequest = onFulfilled
          return 0
        },
      },
      response: { use: () => 0 },
    },
  }
  const app = {
    debug: { log: jest.fn() },
    send: jest.fn(),
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
  // @ts-ignore partial app mock
  axiosSpy(app, instance, options, (d) => d, JSON.stringify)

  return (baseURL: string, url: string) => {
    const headers: Record<string, string> = {}
    onRequest!({ baseURL, url, headers: { set: (n: string, v: string) => (headers[n] = v) } })
    return headers
  }
}

describe('axiosSpy sessionTokenHeader', () => {
  test('uses the same default header name as fetch and XHR tracking', () => {
    const request = setup({ sessionTokenHeader: true })
    expect(request('https://api.example.com', '/me')).toEqual({
      'X-OpenReplay-SessionToken': 'session-token',
    })
  })

  test('keeps a custom header name', () => {
    const request = setup({ sessionTokenHeader: 'X-Replay' })
    expect(request('https://api.example.com', '/me')).toEqual({ 'X-Replay': 'session-token' })
  })

  test('only adds the header to urls accepted by tokenUrlMatcher', () => {
    const tokenUrlMatcher = jest.fn((url: string) => url.startsWith('https://api.example.com/'))
    const request = setup({ sessionTokenHeader: 'X-Replay', tokenUrlMatcher })
    expect(request('https://api.example.com', '/me')).toEqual({ 'X-Replay': 'session-token' })
    expect(request('https://third-party.example', '/v1/track')).toEqual({})
    expect(tokenUrlMatcher).toHaveBeenLastCalledWith('https://third-party.example/v1/track')
  })
})
