// @ts-nocheck
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import Batcher from '../batcher.js'
import { categories } from '../types.js'

jest.mock('../types.js', () => ({
  categories: {
    people: 'people',
    events: 'events',
  },
}))

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
    global.fetch = fetchMock as any

    batcher = new Batcher(backendUrl, getToken, init)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.resetAllMocks()
    delete (global as any).fetch
  })

  const makePeopleEvent = (type: string, timestamp: number, payload: any) => ({
    category: categories.people,
    data: {
      type,
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

  test('sendImmediately does nothing when token is null', () => {
    getToken.mockReturnValueOnce(null)

    const ev = makePeopleEvent('set_property', 1, { a: 1 })
    batcher.sendImmediately(ev)

    expect(fetchMock).not.toHaveBeenCalled()
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

  test('403 response triggers init()', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
    } as any)

    const ev = makeEventsEvent('evt', 1, {})
    batcher.sendImmediately(ev)

    await Promise.resolve()

    expect(init).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
