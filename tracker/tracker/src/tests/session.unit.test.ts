import { jest, test, describe, beforeEach, afterEach, expect } from '@jest/globals'
import Session from '../main/app/session'
import App from '../main/app/index.js'
import { generateRandomId } from '../main/utils.js'

jest.mock('../main/app/index.js') // Mock the App class
jest.mock('../main/utils.js') // Mock the generateRandomId function

describe('Session', () => {
  let session: any
  let mockApp
  let store: Record<string, string>
  let mockSessionStorage: any
  let mockOptions: any

  const makeSession = () =>
    new Session({
      app: mockApp as App,
      options: mockOptions,
    })

  beforeEach(() => {
    store = {}
    mockSessionStorage = {
      getItem: jest.fn((k: string) => (k in store ? store[k] : null)),
      setItem: jest.fn((k: string, v: string) => {
        store[k] = v
      }),
      removeItem: jest.fn((k: string) => {
        delete store[k]
      }),
    }
    mockApp = {
      sessionStorage: mockSessionStorage,
      options: {
        ingestPoint: 'test',
      },
    }
    mockOptions = {
      session_token_key: 'token_key',
      session_pageno_key: 'pageno_key',
      session_tabid_key: 'tabid_key',
    }

    // @ts-ignore
    generateRandomId.mockReturnValue('random_id')

    session = makeSession()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('creates a new Session with default values', () => {
    expect(session.getInfo()).toEqual({
      sessionID: undefined,
      metadata: {},
      userID: null,
      timestamp: 0,
      projectID: undefined,
    })
  })

  test('assigns new info correctly', () => {
    const newInfo = {
      sessionID: 'new_id',
      metadata: { key: 'value' },
      userID: 'user_1',
      timestamp: 12345,
      projectID: 'project_1',
    }
    session.assign(newInfo)
    expect(session.getInfo()).toEqual(newInfo)
  })

  test('assign merges metadata and notifies update callbacks', () => {
    const callback = jest.fn()
    session.attachUpdateCallback(callback)
    session.setMetadata('a', '1')
    session.assign({ metadata: { b: '2' } })
    expect(session.getInfo().metadata).toEqual({ a: '1', b: '2' })
    expect(callback).toHaveBeenNthCalledWith(1, { metadata: { a: '1' } })
    expect(callback).toHaveBeenNthCalledWith(2, { metadata: { b: '2' } })
  })

  test('update callbacks do not receive null userID / sessionID', () => {
    const callback = jest.fn()
    session.attachUpdateCallback(callback)
    session.assign({ userID: null, sessionID: undefined, timestamp: 5 })
    expect(callback).toHaveBeenCalledWith({ timestamp: 5 })
    session.setUserID('u1')
    expect(callback).toHaveBeenLastCalledWith({ userID: 'u1' })
    expect(session.getInfo().userID).toBe('u1')
  })

  test('gets page number correctly', () => {
    store.pageno_key = '2'
    expect(session.getPageNumber()).toEqual(2)
  })

  test('increments page number and stores it', () => {
    store.pageno_key = '2'
    expect(session.incPageNo()).toEqual(3)
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith('pageno_key', '3')
  })

  test('incPageNo starts at 0 when there is no stored page number', () => {
    expect(session.getPageNumber()).toBeUndefined()
    expect(session.incPageNo()).toBe(0)
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith('pageno_key', '0')
  })

  test('gets session token correctly', () => {
    store.token_key = 'token_1'
    expect(session.getSessionToken()).toEqual('token_1')
  })

  test('getSessionToken strips the project suffix for the matching project', () => {
    store.token_key = 'token_1_$_project_1'
    expect(session.getSessionToken('project_1')).toBe('token_1')
    expect(store.token_key).toBe('token_1_$_project_1')
  })

  test('getSessionToken discards a token saved for a different project', () => {
    session.setSessionToken('token_1', 'project_1')
    expect(session.getSessionToken('project_2')).toBeUndefined()
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('token_key')
    expect(store.token_key).toBeUndefined()
    // in-memory token is dropped too
    expect(session.getSessionToken()).toBeUndefined()
  })

  test('getSessionToken discards a legacy token without a project for a projectKey', () => {
    store.token_key = 'legacy_token'
    expect(session.getSessionToken('project_1')).toBeUndefined()
    expect(store.token_key).toBeUndefined()
  })

  test('sets session token correctly', () => {
    session.setSessionToken('token_1', 'project_1')
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      mockOptions.session_token_key,
      'token_1_$_project_1',
    )
    expect(session.getSessionToken('project_1')).toBe('token_1')
  })

  test('applies session hash correctly', () => {
    session.applySessionHash('1&token_1')
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      mockOptions.session_token_key,
      'token_1',
    )
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(mockOptions.session_pageno_key, '1')
  })

  test('an applied hash replaces a token cached in memory', () => {
    session.setSessionToken('old', 'proj')
    session.applySessionHash(encodeURI('2&new_$_proj'))
    expect(session.getSessionToken('proj')).toBe('new')
  })

  test('applies a back-compat hash that is only a token', () => {
    session.applySessionHash('token_1')
    expect(store.token_key).toBe('token_1')
    expect(store.pageno_key).toBe('100500')
  })

  test('gets session hash correctly', () => {
    store.pageno_key = '1'
    store.token_key = 'token_1_$_project_1'
    expect(session.getSessionHash()).toEqual(encodeURI('1&token_1_$_project_1'))
  })

  test('getSessionHash is undefined without a token', () => {
    store.pageno_key = '1'
    expect(session.getSessionHash()).toBeUndefined()
  })

  test('session hash round-trips through applySessionHash', () => {
    store.pageno_key = '4'
    session.setSessionToken('tok', 'proj')
    const hash = session.getSessionHash()

    store = {}
    const other = makeSession()
    other.applySessionHash(hash)
    expect(other.getSessionToken('proj')).toBe('tok')
    expect(other.getPageNumber()).toBe(4)
  })

  test('creates and stores a tabId when none is stored', () => {
    expect(session.getTabId()).toEqual('random_id')
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      mockOptions.session_tabid_key,
      'random_id',
    )
  })

  test('reuses a stored tabId without writing it again', () => {
    store.tabid_key = 'stored_tab'
    mockSessionStorage.setItem.mockClear()
    const s = makeSession()
    expect(s.getTabId()).toBe('stored_tab')
    expect(mockSessionStorage.setItem).not.toHaveBeenCalled()
  })

  test('regenerateTabId stores a new id', () => {
    store.tabid_key = 'stored_tab'
    const s = makeSession()
    // @ts-ignore
    generateRandomId.mockReturnValue('new_tab')
    s.regenerateTabId()
    expect(s.getTabId()).toBe('new_tab')
    expect(store.tabid_key).toBe('new_tab')
  })

  test('resets session correctly', () => {
    session.assign({ sessionID: 's', userID: 'u', metadata: { a: 'b' }, timestamp: 1 })
    session.reset()
    expect(session.getInfo()).toEqual({
      sessionID: undefined,
      metadata: {},
      userID: null,
      timestamp: 0,
      projectID: undefined,
    })
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(mockOptions.session_token_key)
  })

  test('reset drops the in-memory token', () => {
    session.setSessionToken('token_1', 'project_1')
    session.reset()
    expect(session.getSessionToken()).toBeUndefined()
    expect(session.getSessionToken('project_1')).toBeUndefined()
    expect(session.getSessionHash()).toBeUndefined()
  })
})
