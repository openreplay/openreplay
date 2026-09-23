// @ts-nocheck
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import Batcher from '../batcher.js'
import { categories } from '../types.js'

describe('Batcher', () => {
  let backendUrl: string
  let getToken: jest.Mock
  let init: jest.Mock
  let batcher: Batcher

  let fetchMock: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()

    backendUrl = 'https://backend.example.com'
    getToken = jest.fn(() => 'test-token')
    init = jest.fn().mockResolvedValue(undefined)

    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as any)
    globalThis.fetch = fetchMock as any

    batcher = new Batcher(backendUrl, getToken, init, true)
  })

  afterEach(() => {
    batcher.stop()
    jest.clearAllTimers()
    jest.useRealTimers()
    jest.resetAllMocks()
    delete (globalThis as any).fetch
  })

  const makePeopleEvent = (type: string, timestamp: number, payload: any, user_id?: string) => ({
    category: categories.people,
    data: {
      type,
      user_id,
      timestamp,
      payload,
    },
  })

  const makeEventsEvent = (name: string, timestamp: number, payload: any) => ({
    category: categories.events,
    data: {
      name,
      payload,
      timestamp,
    },
  })

  test('addEvent puts events into correct category and getBatches returns them', () => {
    const pe = makePeopleEvent('set_property', 1, { a: 1 })
    const ev = makeEventsEvent('test_event', 2, { x: 'y' })

    batcher.addEvent(pe)
    batcher.addEvent(ev)

    const batches = batcher.getBatches()
    expect(batches).toEqual({
      data: {
        [categories.people]: [
          {
            type: 'set_property',
            timestamp: 1,
            payload: { a: 1 },
          },
        ],
        [categories.events]: [
          {
            name: 'test_event',
            payload: { x: 'y' },
            timestamp: 2,
          },
        ],
      },
    })
  })

  test('dedupePeopleEvents squashes by type and sums increment_property payloads', () => {
    const e1 = makePeopleEvent('set_property', 1, { a: 1 })
    const e2 = makePeopleEvent('set_property', 2, { b: 2 })
    const id = makePeopleEvent('identity', 3, { user_id: 'u1' })
    const inc1 = makePeopleEvent('increment_property', 4, { score: 1, counter: 5 })
    const inc2 = makePeopleEvent('increment_property', 5, { score: 2, other: 10 })

    batcher.addEvent(e1)
    batcher.addEvent(e2)
    batcher.addEvent(id)
    batcher.addEvent(inc1)
    batcher.addEvent(inc2)

    const batches = batcher.getBatches()
    const peopleBatch = batches.data[categories.people]

    expect(peopleBatch).toHaveLength(3)

    const [setSquashed, identityEvent, incSquashed] = peopleBatch

    expect(setSquashed).toEqual({
      type: 'set_property',
      timestamp: 2,
      payload: { a: 1, b: 2 },
    })

    expect(identityEvent).toEqual({
      type: 'identity',
      timestamp: 3,
      payload: { user_id: 'u1' },
    })

    expect(incSquashed).toEqual({
      type: 'increment_property',
      timestamp: 5,
      payload: {
        score: 3,
        counter: 5,
        other: 10,
      },
    })
  })

  test('squashing keeps user_id so the backend does not drop the merged action', () => {
    // https://github.com/openreplay/openreplay/issues/4879
    batcher.addEvent(makePeopleEvent('set_property', 1, { a: 1 }, 'visitor-a'))
    batcher.addEvent(makePeopleEvent('set_property', 2, { b: 2 }, 'visitor-a'))
    batcher.addEvent(makePeopleEvent('set_property_once', 3, { c: 3 }, 'visitor-a'))
    batcher.addEvent(makePeopleEvent('set_property_once', 4, { d: 4 }, 'visitor-a'))
    batcher.addEvent(makePeopleEvent('increment_property', 5, { score: 1 }, 'visitor-a'))
    batcher.addEvent(makePeopleEvent('increment_property', 6, { score: 2 }, 'visitor-a'))

    const peopleBatch = batcher.getBatches().data[categories.people]

    expect(peopleBatch).toEqual([
      { type: 'set_property', user_id: 'visitor-a', timestamp: 2, payload: { a: 1, b: 2 } },
      { type: 'set_property_once', user_id: 'visitor-a', timestamp: 4, payload: { c: 3, d: 4 } },
      { type: 'increment_property', user_id: 'visitor-a', timestamp: 6, payload: { score: 3 } },
    ])
  })

  test('user_id survives the serialized flush body', () => {
    batcher.addEvent(makePeopleEvent('set_property', 1, { a: 1 }, 'visitor-a'))
    batcher.addEvent(makePeopleEvent('set_property', 2, { b: 2 }, 'visitor-a'))

    batcher.flush()

    const [, options] = fetchMock.mock.calls[0]
    const body = JSON.parse(options.body)

    expect(body.data[categories.people]).toEqual([
      { type: 'set_property', user_id: 'visitor-a', timestamp: 2, payload: { a: 1, b: 2 } },
    ])
  })

  test('mutations for different users are not squashed together', () => {
    batcher.addEvent(makePeopleEvent('set_property', 1, { a: 1 }, 'visitor-a'))
    batcher.addEvent(makePeopleEvent('set_property', 2, { b: 2 }, 'visitor-b'))
    batcher.addEvent(makePeopleEvent('set_property', 3, { a: 9 }, 'visitor-a'))

    const peopleBatch = batcher.getBatches().data[categories.people]

    expect(peopleBatch).toEqual([
      { type: 'set_property', user_id: 'visitor-a', timestamp: 3, payload: { a: 9 } },
      { type: 'set_property', user_id: 'visitor-b', timestamp: 2, payload: { b: 2 } },
    ])
  })

  test('identity events keep their user_id and still split the batch', () => {
    batcher.addEvent(makePeopleEvent('set_property', 1, { a: 1 }, 'visitor-a'))
    batcher.addEvent(makePeopleEvent('identity', 2, undefined, 'visitor-b'))
    batcher.addEvent(makePeopleEvent('set_property', 3, { b: 2 }, 'visitor-b'))
    batcher.addEvent(makePeopleEvent('set_property', 4, { c: 3 }, 'visitor-b'))

    const peopleBatch = batcher.getBatches().data[categories.people]

    expect(peopleBatch).toEqual([
      { type: 'set_property', user_id: 'visitor-a', timestamp: 1, payload: { a: 1 } },
      { type: 'identity', user_id: 'visitor-b', timestamp: 2, payload: undefined },
      { type: 'set_property', user_id: 'visitor-b', timestamp: 4, payload: { b: 2, c: 3 } },
    ])
  })

  test('sendImmediately posts single event batch and does not touch stored batch', () => {
    const pe = makePeopleEvent('set_property', 1, { a: 1 })
    batcher.addEvent(pe)

    const immediateEv = makeEventsEvent('instant', 10, { v: 42 })
    batcher.sendImmediately(immediateEv)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe(`${backendUrl}/v1/sdk/i`)
    expect(options.method).toBe('POST')
    expect(options.headers.Authorization).toBe('Bearer test-token')

    const body = JSON.parse(options.body)
    expect(body).toEqual({
      [categories.events]: [
        {
          name: 'instant',
          payload: { v: 42 },
          timestamp: 10,
        },
      ],
    })

    const batches = batcher.getBatches()
    expect(batches.data[categories.people]).toHaveLength(1)
    expect(batches.data[categories.events]).toHaveLength(0)
  })

  test('sendImmediately without a token keeps the event for the next flush', () => {
    getToken.mockReturnValueOnce(null)

    batcher.sendImmediately(makeEventsEvent('instant', 1, { v: 1 }))
    expect(fetchMock).not.toHaveBeenCalled()

    batcher.flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.data[categories.events]).toEqual([{ name: 'instant', payload: { v: 1 }, timestamp: 1 }])
  })

  test('appends to the same key are not squashed into one value', () => {
    batcher.addEvent(makePeopleEvent('append_property', 1, { tags: 'a' }, 'u1'))
    batcher.addEvent(makePeopleEvent('append_property', 2, { tags: 'b' }, 'u1'))
    batcher.addEvent(makePeopleEvent('append_unique_property', 3, { tags: 'c' }, 'u1'))
    batcher.addEvent(makePeopleEvent('append_unique_property', 4, { tags: 'd' }, 'u1'))

    expect(batcher.getBatches().data[categories.people]).toEqual([
      { type: 'append_property', user_id: 'u1', timestamp: 1, payload: { tags: 'a' } },
      { type: 'append_property', user_id: 'u1', timestamp: 2, payload: { tags: 'b' } },
      { type: 'append_unique_property', user_id: 'u1', timestamp: 3, payload: { tags: 'c' } },
      { type: 'append_unique_property', user_id: 'u1', timestamp: 4, payload: { tags: 'd' } },
    ])
  })

  test('sendBatch called via flush posts all events and then clears batches', () => {
    const pe = makePeopleEvent('set_property', 1, { a: 1 })
    const ev = makeEventsEvent('evt', 2, { x: 'y' })
    batcher.addEvent(pe)
    batcher.addEvent(ev)

    batcher.flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, options] = fetchMock.mock.calls[0]
    const body = JSON.parse(options.body)

    expect(body).toEqual({
      data: {
        [categories.people]: [
          {
            type: 'set_property',
            timestamp: 1,
            payload: { a: 1 },
          },
        ],
        [categories.events]: [
          {
            name: 'evt',
            payload: { x: 'y' },
            timestamp: 2,
          },
        ],
      },
    })

    const batchesAfter = batcher.getBatches()
    expect(batchesAfter.data[categories.people]).toEqual([])
    expect(batchesAfter.data[categories.events]).toEqual([])
  })

  test('flush is not called when there are no events', () => {
    batcher.flush()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('startAutosend periodically calls flush', () => {
    const flushSpy = jest.spyOn(batcher, 'flush').mockImplementation(() => {})

    batcher.startAutosend()
    jest.advanceTimersByTime(5000)
    expect(flushSpy).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(5000)
    expect(flushSpy).toHaveBeenCalledTimes(2)
  })

  test('stop flushes then clears interval', () => {
    const flushSpy = jest.spyOn(batcher, 'flush').mockImplementation(() => {})

    batcher.startAutosend()
    batcher.stop()

    expect(flushSpy).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(5000)
    expect(flushSpy).toHaveBeenCalledTimes(1)
  })

  test('403 response re-inits and resends the same body', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 } as any)

    batcher.sendImmediately(makeEventsEvent('evt', 1, {}))
    await jest.runAllTimersAsync()

    expect(init).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[0][1].body)
  })

  test('network errors are retried 3 times, then events go back ahead of newer ones', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    batcher.addEvent(makeEventsEvent('first', 1, {}))
    batcher.flush()
    batcher.addEvent(makeEventsEvent('second', 2, {}))

    await Promise.resolve()
    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await jest.advanceTimersByTimeAsync(2999)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await jest.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await jest.advanceTimersByTimeAsync(3000)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    await jest.advanceTimersByTimeAsync(10000)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    expect(batcher.getBatches().data[categories.events].map((e) => e.name)).toEqual([
      'first',
      'second',
    ])
  })

  test('401 token expired stops a non-standalone batcher', async () => {
    batcher = new Batcher(backendUrl, getToken, init, false)
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'token expired' }),
    } as any)

    batcher.addEvent(makeEventsEvent('evt', 1, {}))
    batcher.flush()
    await jest.runAllTimersAsync()

    expect(init).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    batcher.addEvent(makeEventsEvent('later', 2, {}))
    batcher.flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('401 token expired re-inits in standalone mode', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'token expired' }),
    } as any)

    batcher.sendImmediately(makeEventsEvent('evt', 1, {}))
    await jest.runAllTimersAsync()

    expect(init).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('hiding the tab flushes with keepalive and pauses autosend', () => {
    const hidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden')
    let isHidden = false
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => isHidden })
    try {
      batcher.startAutosend()
      batcher.addEvent(makeEventsEvent('evt', 1, {}))

      isHidden = true
      document.dispatchEvent(new Event('visibilitychange'))

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0][1].keepalive).toBe(true)

      batcher.addEvent(makeEventsEvent('while-hidden', 2, {}))
      jest.advanceTimersByTime(5000)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally {
      delete (document as any).hidden
      if (hidden) Object.defineProperty(Document.prototype, 'hidden', hidden)
    }
  })
})
