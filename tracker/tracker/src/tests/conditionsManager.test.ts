// @ts-nocheck
import ConditionsManager from '../main/modules/conditionsManager'
import { describe, expect, jest, afterEach, beforeEach, test } from '@jest/globals'

const Type = {
  JSException: 78,
  CustomEvent: 27,
  MouseClick: 68,
  SetPageLocation: 122,
  NetworkRequest: 83,
}

const netMsg = (method: string, url: string, status: number, duration = 100) => [
  Type.NetworkRequest,
  'xhr',
  method,
  url,
  'Request',
  'Response',
  status,
  Date.now(),
  duration,
  1024,
]

const respond = (conditions: any[]) =>
  jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ conditions }) }))

describe('ConditionsManager', () => {
  let appMock
  let startOptionsMock
  let stopCallbacks
  const realFetch = globalThis.fetch

  beforeEach(() => {
    stopCallbacks = []
    appMock = {
      start: jest.fn(),
      debug: { error: jest.fn() },
      options: { ingestPoint: 'https://example.com' },
      attachStopCallback: jest.fn((cb) => stopCallbacks.push(cb)),
    }
    startOptionsMock = { forceNew: false }
    globalThis.fetch = respond([
      {
        name: 'Condition Set',
        filters: [
          {
            filters: [],
            is_event: true,
            operator: 'is',
            source: null,
            sourceOperator: null,
            type: 'custom',
            value: ['event'],
          },
          {
            filters: [],
            is_event: true,
            operator: 'is',
            source: ['js_exception'],
            sourceOperator: null,
            type: 'error',
            value: ['err msg'],
          },
        ],
        capture_rate: 100,
      },
    ])
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
    globalThis.fetch = realFetch
  })

  const make = (conditions?: any[]) => {
    const manager = new ConditionsManager(appMock, startOptionsMock)
    if (conditions) manager.setConditions(conditions)
    return manager
  }

  test('fetchConditions requests the project conditions with the token', async () => {
    const manager = make()
    await manager.fetchConditions('42', 'token')
    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/v1/web/conditions/42', {
      method: 'GET',
      headers: { Authorization: 'Bearer token' },
    })
    expect(manager.conditions).toEqual([
      {
        type: 'custom_event',
        operator: 'is',
        value: ['event'],
        key: '',
        name: 'Condition Set',
      },
      { type: 'exception', operator: 'is', value: ['err msg'], key: '', name: 'Condition Set' },
    ])
  })

  test('fetchConditions logs instead of throwing on a failed request', async () => {
    globalThis.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    const manager = make()
    await expect(manager.fetchConditions('42', 'token')).resolves.toBeUndefined()
    expect(appMock.debug.error).toHaveBeenCalled()
    expect(manager.conditions).toEqual([])
  })

  test('trigger starts the app once with the condition name', () => {
    const manager = make()
    manager.trigger('test')
    manager.trigger('other')
    expect(manager.hasStarted).toBeTruthy()
    expect(appMock.start).toHaveBeenCalledTimes(1)
    expect(appMock.start).toHaveBeenCalledWith(startOptionsMock, undefined, 'test')
  })

  test('processMessage is a no-op once started', () => {
    const manager = make([{ type: 'custom_event', operator: 'is', value: ['e'], name: 'c' }])
    manager.hasStarted = true
    manager.processMessage([Type.CustomEvent, 'e', ''])
    expect(appMock.start).not.toHaveBeenCalled()
  })

  describe('exception', () => {
    const msg = [Type.JSException, 'TypeError', 'An Error occurred', 'Payload', 'Metadata']

    test('matches name/message/payload', () => {
      make([
        { type: 'exception', operator: 'contains', value: ['Error'], name: 'exc' },
      ]).processMessage(msg)
      expect(appMock.start).toHaveBeenCalledWith(startOptionsMock, undefined, 'exc')
    })

    test('does not match unrelated exceptions', () => {
      make([
        { type: 'exception', operator: 'contains', value: ['Network'], name: 'exc' },
      ]).processMessage(msg)
      make([{ type: 'exception', operator: 'is', value: ['Error'], name: 'exc' }]).processMessage(
        msg,
      )
      expect(appMock.start).not.toHaveBeenCalled()
    })
  })

  describe('custom event', () => {
    test('matches by event name', () => {
      make([
        { type: 'custom_event', operator: 'is', value: ['eventName'], name: 'ev' },
      ]).processMessage([Type.CustomEvent, 'eventName', 'Payload'])
      expect(appMock.start).toHaveBeenCalledWith(startOptionsMock, undefined, 'ev')
    })

    test('is means equality, not substring', () => {
      make([{ type: 'custom_event', operator: 'is', value: ['event'], name: 'ev' }]).processMessage(
        [Type.CustomEvent, 'eventName', 'Payload'],
      )
      expect(appMock.start).not.toHaveBeenCalled()
    })
  })

  describe('click', () => {
    const click = [Type.MouseClick, 123, 200, 'clickLabel', '#selector']

    test('matches by label or selector', () => {
      make([{ type: 'click', operator: 'is', value: ['#selector'], name: 'cl' }]).processMessage(
        click,
      )
      expect(appMock.start).toHaveBeenCalledWith(startOptionsMock, undefined, 'cl')
    })

    test('does not match other clicks', () => {
      make([{ type: 'click', operator: 'is', value: ['otherLabel'], name: 'cl' }]).processMessage(
        click,
      )
      make([
        { type: 'click', operator: 'isNot', value: ['clickLabel', '#selector'], name: 'cl' },
      ]).processMessage(click)
      expect(appMock.start).not.toHaveBeenCalled()
    })
  })

  describe('visited url', () => {
    const loc = (url: string) => [Type.SetPageLocation, url, 'referrer', Date.now(), 'title']

    test('is matches the pathname, ignoring query and hash', () => {
      make([
        { type: 'visited_url', operator: 'is', value: ['/checkout'], name: 'url' },
      ]).processMessage(loc('https://example.com/checkout?step=2#pay'))
      expect(appMock.start).toHaveBeenCalledWith(startOptionsMock, undefined, 'url')
    })

    test('host and query are not part of the match', () => {
      const m = make([
        { type: 'visited_url', operator: 'contains', value: ['example.com'], name: 'host' },
        { type: 'visited_url', operator: 'contains', value: ['step=2'], name: 'query' },
        { type: 'visited_url', operator: 'is', value: ['https://example.com/checkout'], name: 'full' },
      ])
      m.processMessage(loc('https://example.com/checkout?step=2'))
      expect(appMock.start).not.toHaveBeenCalled()
    })

    test('startsWith matches a path prefix', () => {
      make([
        { type: 'visited_url', operator: 'startsWith', value: ['/docs/'], name: 'docs' },
      ]).processMessage(loc('https://example.com/docs/intro'))
      expect(appMock.start).toHaveBeenCalledWith(startOptionsMock, undefined, 'docs')
    })

    test('does not match other pages', () => {
      const m = make([
        { type: 'visited_url', operator: 'is', value: ['/checkout'], name: 'a' },
        { type: 'visited_url', operator: 'isNot', value: ['/cart'], name: 'b' },
        { type: 'visited_url', operator: 'contains', value: ['pay'], name: 'c' },
      ])
      m.processMessage(loc('https://example.com/cart'))
      expect(appMock.start).not.toHaveBeenCalled()
    })

    test('isNot triggers on a different page', () => {
      make([
        { type: 'visited_url', operator: 'isNot', value: ['/cart'], name: 'b' },
      ]).processMessage(loc('https://example.com/home'))
      expect(appMock.start).toHaveBeenCalledWith(startOptionsMock, undefined, 'b')
    })
  })

  describe('network request', () => {
    test('all sub conditions must pass', () => {
      const m = make([
        {
          type: 'network_request',
          name: 'net',
          subConditions: [
            { type: 'network_request', key: 'status', operator: 'greaterThan', value: ['200'] },
            {
              type: 'network_request',
              key: 'url',
              operator: 'contains',
              value: ['api.example.com'],
            },
          ],
        },
      ])
      m.processMessage(netMsg('GET', 'https://api.example.com/x', 200))
      m.processMessage(netMsg('GET', 'https://other.com/x', 500))
      expect(appMock.start).not.toHaveBeenCalled()
      m.processMessage(netMsg('GET', 'https://api.example.com/x', 201))
      expect(appMock.start).toHaveBeenCalledWith(startOptionsMock, undefined, 'net')
    })

    test('server "fetch" filter with "=" status code does not throw and matches exactly', async () => {
      globalThis.fetch = respond([
        {
          name: 'Errors',
          capture_rate: 100,
          filters: [
            {
              type: 'fetch',
              operator: 'is',
              value: [],
              filters: [
                { type: 'fetchStatusCode', operator: '=', value: ['404'] },
                { type: 'fetchMethod', operator: 'on', value: ['POST'] },
                { type: 'fetchUrl', operator: 'contains', value: ['/api/'] },
                { type: 'fetchDuration', operator: '>=', value: ['50'] },
              ],
            },
          ],
        },
      ])
      const m = make()
      await m.fetchConditions('1', 't')
      expect(m.conditions[0].subConditions).toHaveLength(4)

      expect(() => m.processMessage(netMsg('POST', 'https://x.io/api/a', 4040))).not.toThrow()
      m.processMessage(netMsg('GET', 'https://x.io/api/a', 404))
      m.processMessage(netMsg('POST', 'https://x.io/api/a', 404, 10))
      m.processMessage(netMsg('POST', 'https://x.io/static/a', 404))
      expect(appMock.start).not.toHaveBeenCalled()

      m.processMessage(netMsg('POST', 'https://x.io/api/a', 404, 60))
      expect(appMock.start).toHaveBeenCalledWith(startOptionsMock, undefined, 'Errors')
    })

    test('only isAny sub conditions trigger on any request', () => {
      make([
        {
          type: 'network_request',
          name: 'any',
          subConditions: [{ type: 'network_request', key: 'url', operator: 'isAny', value: [] }],
        },
      ]).processMessage(netMsg('GET', 'https://a.io', 200))
      expect(appMock.start).toHaveBeenCalledWith(startOptionsMock, undefined, 'any')
    })
  })

  describe('feature flags', () => {
    test('processFlags triggers when an enabled flag matches', () => {
      const m = make([{ type: 'feature_flag', operator: 'is', value: ['new-ui'], name: 'ff' }])
      m.processFlags([{ key: 'other', is_persist: false, value: true, payload: '' }])
      expect(appMock.start).not.toHaveBeenCalled()
      m.processFlags([{ key: 'new-ui', is_persist: false, value: true, payload: '' }])
      expect(appMock.start).toHaveBeenCalledWith(startOptionsMock, undefined, 'ff')
    })

    test('metadata filter with featureFlag source maps to a feature flag condition', async () => {
      globalThis.fetch = respond([
        {
          name: 'FF',
          capture_rate: 100,
          filters: [
            {
              type: 'metadata',
              source: 'featureFlag',
              operator: 'is',
              value: ['beta'],
              filters: [],
            },
          ],
        },
      ])
      const m = make()
      await m.fetchConditions('1', 't')
      m.processFlags([{ key: 'beta', is_persist: false, value: true, payload: '' }])
      expect(appMock.start).toHaveBeenCalledWith(startOptionsMock, undefined, 'FF')
    })
  })

  describe('duration', () => {
    test('starts only once performance.now() passes the threshold (ms)', () => {
      jest.useFakeTimers()
      let perfNow = 0
      jest.spyOn(performance, 'now').mockImplementation(() => perfNow)
      const m = make()
      m.processDuration(5000, 'long')

      perfNow = 4000
      jest.advanceTimersByTime(3000)
      expect(appMock.start).not.toHaveBeenCalled()

      perfNow = 5001
      jest.advanceTimersByTime(1000)
      expect(appMock.start).toHaveBeenCalledWith(startOptionsMock, undefined, 'long')
      expect(m.durationInts).toEqual([])
    })

    test('interval is cleared on stop', () => {
      jest.useFakeTimers()
      jest.spyOn(performance, 'now').mockImplementation(() => 0)
      const m = make()
      m.processDuration(5000, 'long')
      m.processDuration(9000, 'longer')
      expect(m.durationInts).toHaveLength(2)
      stopCallbacks.forEach((cb) => cb())
      expect(m.durationInts).toEqual([])
      expect(jest.getTimerCount()).toBe(0)
    })
  })
})
