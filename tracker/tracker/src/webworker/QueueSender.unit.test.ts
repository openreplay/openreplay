import { describe, expect, test, jest, afterEach } from '@jest/globals'
import QueueSender from './QueueSender.js'

globalThis.fetch = () => Promise.resolve(new Response()) // jsdom does not have it

function mockFetch(status: number, headers?: Record<string, string>) {
  return jest.spyOn(globalThis, 'fetch').mockImplementation((request) =>
    Promise.resolve({ status, headers, request } as unknown as Response & {
      request: RequestInfo
    }),
  )
}

/** Resolves each fetch only when the test says so, so ordering is observable. */
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

function gatedFetch() {
  const gates: Array<() => void> = []
  const settled: Array<() => void> = []
  const mock = jest.spyOn(globalThis, 'fetch').mockImplementation(
    () =>
      new Promise((resolve) => {
        const done = () => resolve({ status: 200 } as unknown as Response)
        gates.push(done)
        settled.push(done)
      }),
  )
  return {
    mock,
    releaseNext: async () => {
      const gate = gates.shift()
      if (gate) gate()
      await flush()
    },
    /** Resolves the fetch started n-th (0-based, counting all calls). */
    release: async (n: number) => {
      settled[n]()
      await flush()
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

  test('a batch flushAll sent alongside the in-flight one does not free the line', async () => {
    const queueSender = defaultQueueSender()
    const { mock, release } = gatedFetch()
    queueSender.authorise(randomToken)

    queueSender.push(sampleArray, 'visual', 1) // fetch #0, in flight
    queueSender.push(sampleArray, 'player')
    queueSender.flushAll() // fetch #1, sent next to #0
    expect(mock).toHaveBeenCalledTimes(2)

    await release(1) // the flushed one lands first
    queueSender.push(sampleArray, 'assets') // page survived the close: pushes continue
    expect(mock).toHaveBeenCalledTimes(2) // #0 still holds the line

    await release(0)
    expect(mock).toHaveBeenCalledTimes(3)
    expect(mock.mock.calls.map(seqOf)).toEqual([1, 2, 3])
  })

  test('retries back off linearly (ATTEMPT_TIMEOUT * n), then give up without dropping the batch', async () => {
    jest.useFakeTimers()
    const onFailed = jest.fn()
    const queueSender = new QueueSender(baseURL, () => {}, onFailed, 3, 100)
    const fetchMock = mockFetch(500)
    queueSender.authorise(randomToken)
    queueSender.push(sampleArray)
    queueSender.push(sampleArray)
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    for (const delay of [100, 200, 300]) {
      jest.advanceTimersByTime(delay - 1)
      await flush()
      const before = fetchMock.mock.calls.length
      jest.advanceTimersByTime(1)
      await flush()
      expect(fetchMock.mock.calls.length).toBe(before + 1)
    }
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(onFailed).toHaveBeenCalledTimes(1)
    expect(onFailed).toHaveBeenCalledWith('Failed to send batch after 3 attempts.')
    expect(String(fetchMock.mock.calls[3][0])).toContain('_network:500')

    jest.advanceTimersByTime(60_000)
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls.every((c) => seqOf(c) === 1)).toBe(true)
    expect(queueSender.getQueueStatus()).toBe(false)
  })

  test('a success resets the attempt counter for the next batch', async () => {
    jest.useFakeTimers()
    const queueSender = new QueueSender(baseURL, () => {}, () => {}, 10, 100)
    const statuses = [500, 500, 200, 500, 200]
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve({ status: statuses.shift() } as unknown as Response))
    queueSender.authorise(randomToken)
    queueSender.push(sampleArray)
    queueSender.push(sampleArray)
    await flush()
    jest.advanceTimersByTime(100) // attempt 1
    await flush()
    jest.advanceTimersByTime(200) // attempt 2 → 200, batch 2 starts and fails
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(4)
    // Batch 2's first retry waits ATTEMPT_TIMEOUT * 1, not * 3.
    jest.advanceTimersByTime(100)
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(fetchMock.mock.calls.map(seqOf)).toEqual([1, 1, 1, 2, 2])
    expect(queueSender.getQueueStatus()).toBe(true)
  })

  test('uses keepalive only while the in-flight keepalive bytes stay within 64kB', async () => {
    const queueSender = defaultQueueSender()
    const { mock, release } = gatedFetch()
    const keepalive = (n: number) => (mock.mock.calls[n][1] as RequestInit).keepalive
    queueSender.authorise(randomToken)

    queueSender.push(new Uint8Array(64 << 10)) // #0: a body of exactly 64kB never qualifies
    expect(keepalive(0)).toBe(false)
    expect(String(mock.mock.calls[0][0])).toContain('_kno')
    await release(0)

    queueSender.push(new Uint8Array(40_000)) // #1
    queueSender.push(new Uint8Array(30_000))
    queueSender.push(new Uint8Array(20_000))
    queueSender.flushAll() // #2 and #3 go out while #1 is still in flight
    expect(mock).toHaveBeenCalledTimes(4)
    expect([keepalive(1), keepalive(2), keepalive(3)]).toEqual([true, false, true])
    expect(String(mock.mock.calls[1][0])).toContain('_kyes')

    await release(1)
    await release(3)
    queueSender.push(new Uint8Array(60_000)) // #4: budget released
    expect(keepalive(4)).toBe(true)
  })

  test('refuses a 0-byte batch and moves on to the next one', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    const queueSender = defaultQueueSender()
    const fetchMock = mockFetch(200)
    queueSender.authorise(randomToken)
    queueSender.push(new Uint8Array(0))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith('OpenReplay: refusing to send 0-byte batch.', expect.anything())
    queueSender.push(sampleArray)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(seqOf(fetchMock.mock.calls[0])).toBe(2)
  })

  test('a retry that finds no token waits for one, then goes out with it', async () => {
    jest.useFakeTimers()
    const queueSender = defaultQueueSender()
    const statuses = [500]
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve({ status: statuses.shift() ?? 200 } as unknown as Response))
    queueSender.authorise(randomToken)
    queueSender.push(sampleArray)
    await flush()
    ;(queueSender as any).token = null // e.g. dropped by a 401 on another request
    jest.advanceTimersByTime(1000)
    jest.advanceTimersByTime(1500)
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    queueSender.authorise('fresh')
    jest.advanceTimersByTime(500)
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[1][0])).toContain('_newToken')
    expect((fetchMock.mock.calls[1][1] as any).headers.Authorization).toBe('Bearer fresh')
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
  test('401: calls onUnauthorised once, no retry, nothing more on that token', async () => {
    jest.useFakeTimers()
    const onUnauthorised = jest.fn()
    const onFailed = jest.fn()
    const queueSender = defaultQueueSender({ onUnauthorised, onFailed })
    const fetchMock = mockFetch(401)
    queueSender.authorise(randomToken)
    queueSender.push(sampleArray)
    queueSender.push(sampleArray)
    await flush()
    expect(onUnauthorised).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(60_000)
    queueSender.push(sampleArray)
    queueSender.flushAll() // the restart's clean() path
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(onFailed).not.toHaveBeenCalled()
  })
})
