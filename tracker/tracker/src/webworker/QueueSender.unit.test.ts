import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals'
import QueueSender from './QueueSender.js'

global.fetch = () => Promise.resolve(new Response()) // jsdom does not have it

function mockFetch(status: number) {
  return jest
    .spyOn(global, 'fetch')
    .mockImplementation(() => Promise.resolve({ status } as Response))
}
const baseURL = 'MYBASEURL'
const sampleArray = new Uint8Array(1)
const randomToken = 'abc'
function defaultQueueSender({
  url = baseURL,
  onUnauthorised = () => {},
  onFailed = () => {},
} = {}) {
  return new QueueSender(baseURL, onUnauthorised, onFailed, 10, 1000)
}

describe('QueueSender', () => {
  afterEach(() => {
    jest.restoreAllMocks()
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

    queueSender.authorise(randomToken)
    queueSender.clean()
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
