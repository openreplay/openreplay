import TagWatcher, { WATCHED_TAGS_KEY } from './TagWatcher'
import { describe, expect, jest, afterEach, beforeEach, test } from '@jest/globals'

describe('TagWatcher', () => {
  let sessionStorageMock: Storage
  let errLogMock: (args: any[]) => void
  const onTag = jest.fn()

  beforeEach(() => {
    sessionStorageMock = {
      // @ts-ignore
      getItem: jest.fn(),
      setItem: jest.fn(),
    }
    errLogMock = jest.fn()
    jest.useFakeTimers()
    // @ts-ignore
    global.document.querySelectorAll = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  test('constructor initializes with tags from sessionStorage', () => {
    // @ts-ignore
    sessionStorageMock.getItem.mockReturnValue('div,span')
    const watcher = new TagWatcher(sessionStorageMock, errLogMock, onTag)
    expect(watcher.tags).toEqual(['div', 'span'])
    expect(watcher.intervals).toHaveProperty('div')
    expect(watcher.intervals).toHaveProperty('span')
  })

  test('fetchTags sets tags and updates sessionStorage', async () => {
    // @ts-ignore
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(['div', 'span', 'p']),
      }),
    )
    const watcher = new TagWatcher(sessionStorageMock, errLogMock, onTag)
    await watcher.fetchTags()
    expect(watcher.tags).toEqual(['div', 'span', 'p'])
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(WATCHED_TAGS_KEY, 'div,span,p')
  })

  test('setTags sets intervals for each tag', () => {
    const watcher = new TagWatcher(sessionStorageMock, errLogMock, onTag)
    watcher.setTags(['div', 'p'])
    expect(watcher.intervals).toHaveProperty('div')
    expect(watcher.intervals).toHaveProperty('p')
  })

  test('onTagRendered clears interval and logs message', () => {
    const watcher = new TagWatcher(sessionStorageMock, errLogMock, onTag)
    watcher.setTags(['div'])
    // @ts-ignore
    document.querySelectorAll.mockReturnValue([{}]) // Mock a found element
    jest.advanceTimersByTime(1000)
    expect(onTag).toHaveBeenCalled()
  })

  test('clear method clears all intervals and resets tags', () => {
    const watcher = new TagWatcher(sessionStorageMock, errLogMock, onTag)
    watcher.setTags(['div', 'p'])
    watcher.clear()
    expect(watcher.tags).toEqual([])
    expect(watcher.intervals).toEqual({})
  })
})
