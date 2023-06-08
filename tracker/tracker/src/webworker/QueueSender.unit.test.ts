import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals'
import QueueSender from './QueueSender.js'

global.fetch = () => Promise.resolve(new Response()) // jsdom does not have it

function mockFetch(status: number, headers?: Record<string, string>) {
  return jest.spyOn(global, 'fetch').mockImplementation((request) =>
    Promise.resolve({ status, headers, request } as unknown as Response & {
      request: RequestInfo
    }),
  )
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

const gzipRequestMock = {
  ...requestMock,
  headers: { ...requestMock.headers, 'Content-Encoding': 'gzip' },
}

function defaultQueueSender({
  url = baseURL,
  onUnauthorised = () => {},
  onFailed = () => {},
  onCompress = undefined,
}: Record<string, any> = {}) {
  return new QueueSender(baseURL, onUnauthorised, onFailed, 10, 1000, onCompress)
}

describe('QueueSender', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  // Test fetch first parameter + authorization header to be present

  // authorise() / push()
  test('Does not call fetch if not authorised', () => {
    const queueSender = defaultQueueSender()
    const fetchMock = mockFetch(200)

    queueSender.push(sampleArray)
    expect(fetchMock).not.toBeCalled()
  })
  test('Calls fetch on push() if authorised', () => {
    const queueSender = defaultQueueSender()
    const fetchMock = mockFetch(200)

    queueSender.authorise(randomToken)
    expect(fetchMock).toBeCalledTimes(0)
    queueSender.push(sampleArray)
    expect(fetchMock).toBeCalledTimes(1)
    expect(fetchMock.mock.calls[0][1]).toMatchObject(requestMock)
  })
  test('Sends compressed request if onCompress is provided and compressed batch is included', () => {
    const queueSender = defaultQueueSender({ onCompress: () => true })
    const fetchMock = mockFetch(200)

    // @ts-ignore
    const spyOnCompress = jest.spyOn(queueSender, 'onCompress')
    // @ts-ignore
    const spyOnSendNext = jest.spyOn(queueSender, 'sendNext')

    queueSender.authorise(randomToken)
    queueSender.push(sampleArray)
    expect(spyOnCompress).toBeCalledTimes(1)
    queueSender.sendCompressed(sampleArray)
    expect(fetchMock).toBeCalledTimes(1)
    expect(spyOnSendNext).toBeCalledTimes(1)
    expect(spyOnCompress).toBeCalledTimes(1)
    expect(fetchMock.mock.calls[0][1]).toMatchObject(gzipRequestMock)
  })
  test('Calls fetch on authorisation if there was a push() call before', () => {
    const queueSender = defaultQueueSender()
    const fetchMock = mockFetch(200)

    queueSender.push(sampleArray)
    queueSender.authorise(randomToken)
    expect(fetchMock).toBeCalledTimes(1)
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
    expect(fetchMock).not.toBeCalled()
  })
  test("Doesn't call fetch on authorisation if there was push() & clean() calls before", () => {
    const queueSender = defaultQueueSender()
    const fetchMock = mockFetch(200)

    queueSender.push(sampleArray)
    queueSender.clean()
    queueSender.authorise(randomToken)
    expect(fetchMock).not.toBeCalled()
  })

  //Test N sequential ToBeCalledTimes(N)
  //Test N sequential pushes with different timeouts to be sequential

  // onUnauthorised
  test('Calls onUnauthorized callback on 401', (done) => {
    const onUnauthorised = jest.fn()
    const queueSender = defaultQueueSender({
      onUnauthorised,
    })
    const fetchMock = mockFetch(401)
    queueSender.authorise(randomToken)
    queueSender.push(sampleArray)
    setTimeout(() => {
      // how to make test simpler and more explicit?
      expect(onUnauthorised).toBeCalled()
      done()
    }, 100)
  })
  //Test onFailure
  //Test attempts timeout/ attempts count (toBeCalledTimes on one batch)
})
