// @ts-nocheck
import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import setProxy from '../main/modules/Network/index.js'
import FetchProxy from '../main/modules/Network/fetchProxy.js'
import XHRProxy from '../main/modules/Network/xhrProxy.js'
import BeaconProxy from '../main/modules/Network/beaconProxy.js'

globalThis.fetch = jest.fn()

jest.mock('../main/modules/Network/fetchProxy.js')
jest.mock('../main/modules/Network/xhrProxy.js')
jest.mock('../main/modules/Network/beaconProxy.js')

describe('Network Proxy', () => {
  let context
  const ignoredHeaders = []
  const setSessionTokenHeader = jest.fn()
  const sanitize = jest.fn()
  const sendMessage = jest.fn()
  const isServiceUrl = jest.fn()
  const tokenUrlMatcher = jest.fn()

  beforeEach(() => {
    context = {
      fetch: jest.fn(),
      XMLHttpRequest: jest.fn(),
      navigator: {
        sendBeacon: jest.fn(),
      },
    }
    FetchProxy.create.mockReturnValue(jest.fn())
    XHRProxy.create.mockReturnValue(jest.fn())
    BeaconProxy.create.mockReturnValue(jest.fn())
  })
  test('should not replace fetch if not present', () => {
    context = {
      XMLHttpRequest: jest.fn(),
      navigator: {
        sendBeacon: jest.fn(),
      },
    }
    setProxy(
      context,
      ignoredHeaders,
      setSessionTokenHeader,
      sanitize,
      sendMessage,
      isServiceUrl,
      tokenUrlMatcher,
    )
    expect(context.fetch).toBeUndefined()
    expect(FetchProxy.create).toHaveBeenCalledTimes(0)
    expect(XHRProxy.create).toHaveBeenCalled()
    expect(BeaconProxy.create).toHaveBeenCalled()
  })
  test('should replace XMLHttpRequest if present', () => {
    setProxy(
      context,
      ignoredHeaders,
      setSessionTokenHeader,
      sanitize,
      sendMessage,
      isServiceUrl,
      tokenUrlMatcher,
    )
    expect(context.XMLHttpRequest).toEqual(expect.any(Function))
    expect(XHRProxy.create).toHaveBeenCalled()
  })

  test('should replace fetch if present', () => {
    setProxy(
      context,
      ignoredHeaders,
      setSessionTokenHeader,
      sanitize,
      sendMessage,
      isServiceUrl,
      tokenUrlMatcher,
    )
    expect(context.fetch).toEqual(expect.any(Function))
    expect(FetchProxy.create).toHaveBeenCalled()
  })

  test('should replace navigator.sendBeacon if present', () => {
    setProxy(
      context,
      ignoredHeaders,
      setSessionTokenHeader,
      sanitize,
      sendMessage,
      isServiceUrl,
      tokenUrlMatcher,
    )
    expect(context.navigator.sendBeacon).toEqual(expect.any(Function))
    expect(BeaconProxy.create).toHaveBeenCalled()
  })
})
