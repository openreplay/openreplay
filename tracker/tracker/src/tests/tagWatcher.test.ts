import TagWatcher, { WATCHED_TAGS_KEY } from '../main/modules/TagWatcher'
import { describe, expect, jest, afterEach, beforeEach, test } from '@jest/globals'

describe('TagWatcher', () => {
  let sessionStorageMock: Storage
  let errLogMock: (args: any[]) => void
  const onTag = jest.fn()
  let mockObserve: Function
  let mockUnobserve: Function
  let mockDisconnect: Function

  beforeEach(() => {
    sessionStorageMock = {
      // @ts-ignore
      getItem: jest.fn(),
      setItem: jest.fn(),
    }
    errLogMock = jest.fn()
    mockObserve = jest.fn()
    mockUnobserve = jest.fn()
    mockDisconnect = jest.fn()

    // @ts-ignore
    global.IntersectionObserver = jest.fn((callback) => ({
      observe: mockObserve,
      unobserve: mockUnobserve,
      disconnect: mockDisconnect,
      callback,
    }))
    jest.useFakeTimers()
    // @ts-ignore
    global.document.querySelectorAll = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })
  function triggerIntersection(elements: any, isIntersecting: boolean, observer: any) {
    const entries = elements.map((el: any) => ({
      isIntersecting,
      target: el,
    }))
    // @ts-ignore
    observer.callback(entries)
  }

  test('constructor initializes with tags from sessionStorage', () => {
    // @ts-ignore
    sessionStorageMock.getItem.mockReturnValue(
      '[{"id":1,"selector":"div"},{"id":2,"selector":"span"}]',
    )
    const watcher = new TagWatcher(sessionStorageMock, errLogMock, onTag)
    expect(watcher.tags).toEqual([
      { id: 1, selector: 'div' },
      { id: 2, selector: 'span' },
    ])
    expect(watcher.intervals).toHaveProperty('1')
    expect(watcher.intervals).toHaveProperty('2')
  })

  test('fetchTags sets tags and updates sessionStorage', async () => {
    // @ts-ignore
    global.fetch = jest.fn(() =>
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
    const watcher = new TagWatcher(sessionStorageMock, errLogMock, onTag)
    await watcher.fetchTags('https://localhost.com', '123')
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

  test('setTags sets intervals for each tag', () => {
    const watcher = new TagWatcher(sessionStorageMock, errLogMock, onTag)
    watcher.setTags([
      { id: 1, selector: 'div' },
      { id: 2, selector: 'p' },
    ])
    expect(watcher.intervals).toHaveProperty('1')
    expect(watcher.intervals).toHaveProperty('2')
    expect(mockObserve).not.toHaveBeenCalled() // No elements to observe initially
  })

  test('onTagRendered sends messages', () => {
    const watcher = new TagWatcher(sessionStorageMock, errLogMock, onTag)
    watcher.setTags([{ id: 1, selector: 'div' }])
    // @ts-ignore
    document.querySelectorAll.mockReturnValue([{ __or_watcher_tagname: 'div' }]) // Mock a found element
    jest.advanceTimersByTime(1000)
    triggerIntersection([{ __or_watcher_tagname: 'div' }], true, watcher.observer)
    expect(onTag).toHaveBeenCalled()
    expect(watcher.observer.unobserve).toHaveBeenCalled()
  })

  test('clear method clears all intervals and resets tags', () => {
    const watcher = new TagWatcher(sessionStorageMock, errLogMock, onTag)
    watcher.setTags([
      { id: 1, selector: 'div' },
      { id: 2, selector: 'p' },
    ])
    watcher.clear()
    expect(watcher.tags).toEqual([])
    expect(watcher.intervals).toEqual({})
    expect(watcher.observer.disconnect).toHaveBeenCalled()
  })
})
