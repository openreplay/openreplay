import TagWatcher, { WATCHED_TAGS_KEY } from '../main/modules/tagWatcher'
import { describe, expect, jest, afterEach, beforeEach, test } from '@jest/globals'

const getMockSaved = () => '[{"id":1,"selector":"div"},{"id":2,"selector":"span"}]'
describe('TagWatcher', () => {
  let sessionStorageMock: Storage
  let errLogMock: (args: any[]) => void
  let onTag: jest.Mock
  let mockObserve: jest.Mock
  let mockUnobserve: jest.Mock
  let mockDisconnect: jest.Mock
  let querySelectorAll: jest.Mock
  const realQuerySelectorAll = document.querySelectorAll
  const realIntersectionObserver = (globalThis as any).IntersectionObserver
  const realFetch = (globalThis as any).fetch

  const makeWatcher = () =>
    new TagWatcher({ sessionStorage: sessionStorageMock, errLog: errLogMock, onTag })

  beforeEach(() => {
    sessionStorageMock = {
      getItem: getMockSaved,
      setItem: jest.fn(),
    } as unknown as Storage
    errLogMock = jest.fn()
    onTag = jest.fn()
    mockObserve = jest.fn()
    mockUnobserve = jest.fn()
    mockDisconnect = jest.fn()

    // @ts-ignore
    globalThis.IntersectionObserver = jest.fn((callback) => ({
      observe: mockObserve,
      unobserve: mockUnobserve,
      disconnect: mockDisconnect,
      callback,
    }))
    jest.useFakeTimers()
    querySelectorAll = jest.fn(() => [])
    // @ts-ignore
    document.querySelectorAll = querySelectorAll
  })

  afterEach(() => {
    jest.useRealTimers()
    document.querySelectorAll = realQuerySelectorAll
    ;(globalThis as any).IntersectionObserver = realIntersectionObserver
    ;(globalThis as any).fetch = realFetch
  })

  function triggerIntersection(elements: any, isIntersecting: boolean, observer: any) {
    const entries = elements.map((el: any) => ({
      isIntersecting,
      target: el,
    }))
    observer.callback(entries)
  }

  test('constructor initializes with tags from sessionStorage', () => {
    const watcher = makeWatcher()
    expect(watcher.tags).toEqual([
      { id: 1, selector: 'div' },
      { id: 2, selector: 'span' },
    ])
    expect(watcher.interval).not.toBeNull()
  })

  test('fetchTags sets tags and updates sessionStorage', async () => {
    const fetchMock = jest.fn((_url: string, _init: any) =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            tags: [
              { id: 1, selector: 'div' },
              { id: 2, selector: 'span' },
              { id: 3, selector: 'p' },
            ],
          }),
      }),
    )
    ;(globalThis as any).fetch = fetchMock
    const watcher = makeWatcher()
    await watcher.fetchTags('https://localhost.com', '123')
    expect(fetchMock).toHaveBeenCalledWith('https://localhost.com/v1/web/tags', {
      method: 'GET',
      headers: { Authorization: 'Bearer 123' },
    })
    expect(watcher.tags).toEqual([
      { id: 1, selector: 'div' },
      { id: 2, selector: 'span' },
      { id: 3, selector: 'p' },
    ])
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      WATCHED_TAGS_KEY,
      '[{"id":1,"selector":"div"},{"id":2,"selector":"span"},{"id":3,"selector":"p"}]',
    )
  })

  test('fetchTags logs errors instead of throwing', async () => {
    ;(globalThis as any).fetch = jest.fn(() => Promise.reject(new Error('offline')))
    const watcher = makeWatcher()
    await watcher.fetchTags('https://localhost.com', '123')
    expect(errLogMock).toHaveBeenCalled()
    expect(watcher.tags).toHaveLength(2)
  })

  test('polls for tagged elements and observes the first match', () => {
    const watcher = makeWatcher()
    watcher.setTags([{ id: 7, selector: '.cta' }])
    const el: any = {}
    querySelectorAll.mockReturnValue([el])

    jest.advanceTimersByTime(500)

    expect(querySelectorAll).toHaveBeenCalledWith('.cta')
    expect(mockObserve).toHaveBeenCalledWith(el)
    expect(el.__or_watcher_tagname).toBe(7)
  })

  test('an intersecting tagged element reports its tag once and is unobserved', () => {
    const watcher = makeWatcher()
    watcher.setTags([{ id: 7, selector: '.cta' }])
    const el: any = {}
    querySelectorAll.mockReturnValue([el])
    jest.advanceTimersByTime(500)

    triggerIntersection([el], true, watcher.observer)

    expect(onTag).toHaveBeenCalledTimes(1)
    expect(onTag).toHaveBeenCalledWith(7)
    expect(mockUnobserve).toHaveBeenCalledWith(el)
    expect(watcher.tags).toEqual([])

    // tag is gone from the poll list
    querySelectorAll.mockClear()
    jest.advanceTimersByTime(500)
    expect(querySelectorAll).not.toHaveBeenCalled()
  })

  test('non-intersecting entries are ignored', () => {
    const watcher = makeWatcher()
    watcher.setTags([{ id: 7, selector: '.cta' }])
    const el: any = { __or_watcher_tagname: 7 }
    triggerIntersection([el], false, watcher.observer)
    expect(onTag).not.toHaveBeenCalled()
    expect(mockUnobserve).not.toHaveBeenCalled()
  })

  test('tags for another location are not polled', () => {
    const watcher = makeWatcher()
    watcher.setTags([{ id: 7, selector: '.cta', location: '/somewhere-else' }])
    jest.advanceTimersByTime(500)
    expect(querySelectorAll).not.toHaveBeenCalled()
  })

  test('clear method clears all intervals and resets tags', () => {
    const watcher = makeWatcher()
    watcher.setTags([
      { id: 1, selector: 'div' },
      { id: 2, selector: 'p' },
    ])
    watcher.clear()
    expect(watcher.tags).toEqual([])
    expect(watcher.interval).toBeNull()
    expect(mockDisconnect).toHaveBeenCalled()
    jest.advanceTimersByTime(1000)
    expect(querySelectorAll).not.toHaveBeenCalled()
  })
})
