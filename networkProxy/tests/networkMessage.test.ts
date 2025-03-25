import NetworkMessage from '../src/networkMessage.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('NetworkMessage', () => {
  const ignoredHeaders = ['cookie'];
  const setSessionTokenHeader = vi.fn();
  const sanitize = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMessage', () => {
    it('should properly construct and return a NetworkRequest', () => {
      // @ts-ignore
      const networkMessage = new NetworkMessage(ignoredHeaders, setSessionTokenHeader, (data) => data);

      networkMessage.method = 'GET';
      networkMessage.url = 'https://example.com';
      networkMessage.status = 200;
      networkMessage.requestType = 'xhr';
      networkMessage.startTime = 0;
      networkMessage.duration = 500;
      networkMessage.getData = {
        test: 'value',
        test2: 123
      };
      networkMessage.response = JSON.stringify({
        token: '123123',
        password: 'qwerty123'
      })

      const result = networkMessage.getMessage();

      const expected = {
        requestType: 'xhr',
        method: 'GET',
        url: 'https://example.com/',
        request: JSON.stringify({
          headers: {},
          body: JSON.stringify({
            test: 'value',
            test2: 123
          }),
        }),
        response: JSON.stringify({
          headers: {},
          body: JSON.stringify({
            token: '******',
            password: '*********',
          }),
        }),
        status: 200,
        startTime: result!.startTime,
        duration: 500,
        responseSize: 0
      };

      expect(result).toBeDefined();
      expect(result).toEqual(expected);
    });
  });

  describe('writeHeaders', () => {
    it('should properly write request and response headers', () => {
      // @ts-ignore
      const networkMessage = new NetworkMessage(ignoredHeaders, setSessionTokenHeader, sanitize);

      networkMessage.requestHeader = { 'Content-Type': 'application/json', cookie: 'test' };
      networkMessage.header = { 'Content-Type': 'application/json', cookie: 'test' };

      const result = networkMessage.writeHeaders();

      expect(result).toBeDefined();
      expect(result.reqHs).toEqual({ 'Content-Type': 'application/json' });
      expect(result.resHs).toEqual({ 'Content-Type': 'application/json' });
      expect(setSessionTokenHeader).toHaveBeenCalledTimes(1);
    });
  });

  describe('isHeaderIgnored', () => {
    it('should properly identify ignored headers', () => {
      // @ts-ignore
      const networkMessage = new NetworkMessage(ignoredHeaders, setSessionTokenHeader, sanitize);

      expect(networkMessage.isHeaderIgnored('cookie')).toBe(true);
      expect(networkMessage.isHeaderIgnored('Content-Type')).toBe(false);
    });

    it('if ignoreHeaders is true should ignore all headers', () => {
      // @ts-ignore
      const networkMessage = new NetworkMessage(true, setSessionTokenHeader, sanitize);

      expect(networkMessage.isHeaderIgnored('cookie')).toBe(true);
      expect(networkMessage.isHeaderIgnored('Content-Type')).toBe(true);
      expect(networkMessage.isHeaderIgnored('Random-Header')).toBe(true);
    });
  });
});
