import NetworkMessage, { RequestState, httpMethod } from '../main/modules/Network/networkMessage.js'
import { NetworkRequest } from '../main/app/messages.gen.js'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

describe('NetworkMessage', () => {
  const ignoredHeaders = ['cookie']
  const setSessionTokenHeader = jest.fn()
  const sanitize = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getMessage', () => {
    it('should properly construct and return a NetworkRequest', () => {
      // @ts-ignore
      const networkMessage = new NetworkMessage(ignoredHeaders, setSessionTokenHeader, sanitize)

      // Set some basic properties
      networkMessage.method = 'GET'
      networkMessage.url = 'https://example.com'
      networkMessage.status = 200
      networkMessage.requestType = 'xhr'
      networkMessage.startTime = 0
      networkMessage.duration = 500
      networkMessage.getData = { key: 'value' }

      // Expect sanitized message
      sanitize.mockReturnValueOnce({
        url: 'https://example.com',
        method: 'GET',
        status: 200,
        request: {},
        response: {},
      })

      const result = networkMessage.getMessage()

      const expected = NetworkRequest(
        'xhr',
        'GET',
        'https://example.com',
        JSON.stringify({}),
        JSON.stringify({}),
        200,
        // yeah
        result[7],
        500,
        0,
      )
      expect(result).toBeDefined()
      expect(result).toEqual(expected)
      expect(sanitize).toHaveBeenCalledTimes(1)
    })
  })

  describe('writeHeaders', () => {
    it('should properly write request and response headers', () => {
      // @ts-ignore
      const networkMessage = new NetworkMessage(ignoredHeaders, setSessionTokenHeader, sanitize)

      networkMessage.requestHeader = { 'Content-Type': 'application/json', cookie: 'test' }
      networkMessage.header = { 'Content-Type': 'application/json', cookie: 'test' }

      const result = networkMessage.writeHeaders()

      expect(result).toBeDefined()
      expect(result.reqHs).toEqual({ 'Content-Type': 'application/json' })
      expect(result.resHs).toEqual({ 'Content-Type': 'application/json' })
      expect(setSessionTokenHeader).toHaveBeenCalledTimes(1)
    })
  })

  describe('isHeaderIgnored', () => {
    it('should properly identify ignored headers', () => {
      // @ts-ignore
      const networkMessage = new NetworkMessage(ignoredHeaders, setSessionTokenHeader, sanitize)

      expect(networkMessage.isHeaderIgnored('cookie')).toBe(true)
      expect(networkMessage.isHeaderIgnored('Content-Type')).toBe(false)
    })
    it('if ignoreHeaders is true should ignore all headers', () => {
      // @ts-ignore
      const networkMessage = new NetworkMessage(true, setSessionTokenHeader, sanitize)

      expect(networkMessage.isHeaderIgnored('cookie')).toBe(true)
      expect(networkMessage.isHeaderIgnored('Content-Type')).toBe(true)
      expect(networkMessage.isHeaderIgnored('Random-Header')).toBe(true)
    })
  })
})
