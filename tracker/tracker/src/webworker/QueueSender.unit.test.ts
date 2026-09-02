import { describe, expect, test, jest, afterEach } from '@jest/globals'
import QueueSender from './QueueSender.js'

global.fetch = () => Promise.resolve(new Response()) // jsdom does not have it

function mockFetch(status: number, headers?: Record<string, string>) {
  return jest.spyOn(global, 'fetch').mockImplementation((request) =>
    Promise.resolve({ status, headers, request } as unknown as Response & {
      request: RequestInfo
    }),
  )
}

/** Resolves each fetch only when the test says so, so ordering is observable. */
function gatedFetch() {
  const gates: Array<() => void> = []
  const mock = jest.spyOn(global, 'fetch').mockImplementation(
    () =>
      new Promise((resolve) => {
        gates.push(() => resolve({ status: 200 } as unknown as Response))
      }),
  )
  return {
    mock,
    releaseNext: async () => {
      const gate = gates.shift()
      if (gate) gate()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    },
  }
}

const baseURL = 'MYBASEURL'
const sampleArray = new Uint8Array(1)
const randomToken = 'abc'

const requestMock = {
  body: sampleArray,
  headers: { Authorization: 'Bearer abc' },
  keepalive: true,
  method: 'POST',
}

function defaultQueueSender({
  onUnauthorised = () => {},
  onFailed = () => {},
  pageNo = undefined as number | undefined,
  compressionThreshold = undefined as number | undefined,
}: Record<string, any> = {}) {
  return new QueueSender(baseURL, onUnauthorised, onFailed, 10, 1000, pageNo, compressionThreshold)
}

/** Reads the `batch=<pageNo>_<seq>_...` query param back off a fetch call. */
function seqOf(call: any): number {
  const qs = String(call[0]).split('?')[1] ?? ''
  const batch = new URLSearchParams(qs).get('batch') ?? ''
  return Number(batch.split('_')[1])
}
function dataTypeOf(call: any): string {
  return (call[1].headers as Record<string, string>).DataType
}

describe('QueueSender', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  test('Does not call fetch if not authorised', () => {
    const queueSender = defaultQueueSender()
    const fetchMock = mockFetch(200)

    queueSender.push(sampleArray)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('Calls fetch on push() if authorised', () => {
    const queueSender = defaultQueueSender()
    const fetchMock = mockFetch(200)

    queueSender.authorise(randomToken)
    expect(fetchMock).toHaveBeenCalledTimes(0)
    queueSender.push(sampleArray)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1]).toMatchObject(requestMock)
  })

  test('Appends &split=<N> to the URL for a visual megabatch', () => {
    const queueSender = defaultQueueSender()
    const fetchMock = mockFetch(200)

    queueSender.authorise(randomToken)
    queueSender.push(sampleArray, 'visual', 123)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('&split=123')
  })

  test('Omits &split when no split is provided', () => {
    const queueSender = defaultQueueSender()
    const fetchMock = mockFetch(200)

    queueSender.authorise(randomToken)
    queueSender.push(sampleArray, 'player')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).not.toContain('&split=')
  })

  test('Calls fetch on authorisation if there was a push() call before', () => {
    const queueSender = defaultQueueSender()
    const fetchMock = mockFetch(200)

    queueSender.push(sampleArray)
    queueSender.authorise(randomToken)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  // ── FIFO ordering (#4836) ────────────────────────────────────────────────
  test('Sends one batch at a time, in push order', async () => {
    const queueSender = defaultQueueSender()
    const { mock, releaseNext } = gatedFetch()
    queueSender.authorise(randomToken)

    queueSender.push(sampleArray, 'visual', 1)
    queueSender.push(sampleArray, 'player')
    queueSender.push(sampleArray, 'assets')
    queueSender.push(sampleArray, 'devtools')

    // Only the head is in flight; the rest wait their turn.
    expect(mock).toHaveBeenCalledTimes(1)
    expect(dataTypeOf(mock.mock.calls[0])).toBe('visual')

    await releaseNext()
    expect(mock).toHaveBeenCalledTimes(2)
    await releaseNext()
    await releaseNext()
    expect(mock).toHaveBeenCalledTimes(4)

    expect(mock.mock.calls.map(dataTypeOf)).toEqual(['visual', 'player', 'assets', 'devtools'])
    expect(mock.mock.calls.map(seqOf)).toEqual([1, 2, 3, 4])
  })

  test('A raw (closing) batch cannot overtake an earlier queued one', async () => {
    const queueSender = defaultQueueSender()
    const { mock, releaseNext } = gatedFetch()
    queueSender.authorise(randomToken)

    queueSender.push(sampleArray, 'visual', 1) // in flight
    queueSender.push(sampleArray, 'player') // queued
    // Closing-path batch: skips gzip, but must not jump the line.
    queueSender.push(sampleArray, 'devtools', undefined, true)

    expect(mock).toHaveBeenCalledTimes(1)
    await releaseNext()
    await releaseNext()
    expect(mock.mock.calls.map(dataTypeOf)).toEqual(['visual', 'player', 'devtools'])
  })

  test('flushAll drains the queue oldest-first', async () => {
    const queueSender = defaultQueueSender()
    const { mock } = gatedFetch()
    queueSender.authorise(randomToken)

    queueSender.push(sampleArray, 'visual', 1) // in flight, fetch started
    queueSender.push(sampleArray, 'player')
    queueSender.push(sampleArray, 'assets')
    expect(mock).toHaveBeenCalledTimes(1)

    queueSender.flushAll()
    expect(mock.mock.calls.map(dataTypeOf)).toEqual(['visual', 'player', 'assets'])
    expect(mock.mock.calls.map(seqOf)).toEqual([1, 2, 3])
  })

  test('seq numbers are unique and gapless across many batches', async () => {
    const queueSender = defaultQueueSender()
    const { mock, releaseNext } = gatedFetch()
    queueSender.authorise(randomToken)

    for (let i = 0; i < 25; i++) queueSender.push(sampleArray, 'player')
    for (let i = 0; i < 25; i++) await releaseNext()

    const seqs = mock.mock.calls.map(seqOf)
    expect(seqs).toEqual(Array.from({ length: 25 }, (_, i) => i + 1))
  })

  test('A failing batch blocks the queue rather than letting later ones pass', async () => {
    jest.useFakeTimers()
    const onFailed = jest.fn()
    const queueSender = defaultQueueSender({ onFailed })
    const fetchMock = mockFetch(500)
    queueSender.authorise(randomToken)

    queueSender.push(sampleArray, 'visual', 1)
    queueSender.push(sampleArray, 'player')
    await Promise.resolve()
    await Promise.resolve()

    // Every attempt is the same first batch; 'player' never goes out ahead of it.
    for (let i = 0; i < 12; i++) {
      jest.advanceTimersByTime(20_000)
      await Promise.resolve()
      await Promise.resolve()
    }
    expect(fetchMock.mock.calls.every((c) => dataTypeOf(c) === 'visual')).toBe(true)
    expect(onFailed).toHaveBeenCalled()
  })

  // .clean()
  test("Doesn't call fetch on push() after clean()", () => {
    const queueSender = defaultQueueSender()
    const fetchMock = mockFetch(200)
    jest.useFakeTimers()
    queueSender.authorise(randomToken)
    queueSender.clean()
    jest.runAllTimers()
    queueSender.push(sampleArray)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test("Doesn't call fetch on authorisation if there was push() & clean() calls before", () => {
    const queueSender = defaultQueueSender()
    const fetchMock = mockFetch(200)

    queueSender.push(sampleArray)
    queueSender.clean()
    queueSender.authorise(randomToken)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  // onUnauthorised
  test('Calls onUnauthorized callback on 401', (done) => {
    const onUnauthorised = jest.fn()
    const queueSender = defaultQueueSender({
      onUnauthorised,
    })
    mockFetch(401)
    queueSender.authorise(randomToken)
    queueSender.push(sampleArray)
    setTimeout(() => {
      expect(onUnauthorised).toHaveBeenCalled()
      done()
    }, 100)
  })
})
