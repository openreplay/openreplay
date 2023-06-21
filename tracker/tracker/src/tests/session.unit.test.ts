import { jest, test, describe, beforeEach, afterEach, expect } from '@jest/globals'
import Session from '../main/app/Session'
import App from '../main/app/index.js'
import { generateRandomId } from '../main/utils.js'

jest.mock('../main/app/index.js') // Mock the App class
jest.mock('../main/utils.js') // Mock the generateRandomId function

describe('Session', () => {
  let session: any
  let mockApp
  let mockSessionStorage: any
  let mockOptions: any

  beforeEach(() => {
    mockSessionStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    }
    mockApp = {
      sessionStorage: mockSessionStorage,
      options: {
        ingestPoint: 'test',
      },
    }
    mockApp.sessionStorage = mockSessionStorage
    mockOptions = {
      session_token_key: 'token_key',
      session_pageno_key: 'pageno_key',
      session_tabid_key: 'tabid_key',
    }

    // @ts-ignore
    generateRandomId.mockReturnValue('random_id')

    session = new Session(mockApp as unknown as App, mockOptions)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('creates a new Session with default values', () => {
    expect(session).toBeDefined()
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

  // Test for attachUpdateCallback
  test('attaches an update callback correctly', () => {
    const callback = jest.fn()
    session.attachUpdateCallback(callback)
    expect(session['callbacks']).toContain(callback)
  })

  // Test for handleUpdate
  test('handles update correctly', () => {
    const newInfo = { userID: 'user_2' }
    const callback = jest.fn()
    session.attachUpdateCallback(callback)
    session['handleUpdate'](newInfo)
    expect(callback).toHaveBeenCalledWith(newInfo)
  })

  // Test for setMetadata
  test('sets metadata correctly', () => {
    session.setMetadata('key', 'value')
    expect(session['metadata']).toEqual({ key: 'value' })
  })

  // Test for setUserID
  test('sets userID correctly', () => {
    session.setUserID('user_1')
    expect(session['userID']).toEqual('user_1')
  })

  // Test for setUserInfo
  test('sets user info correctly', () => {
    const userInfo = {
      userBrowser: 'Chrome',
      userCity: 'San Francisco',
      userCountry: 'USA',
      userDevice: 'Desktop',
      userOS: 'Windows',
      userState: 'CA',
    }
    session.setUserInfo(userInfo)
    expect(session.userInfo).toEqual(userInfo)
  })

  // Test for getPageNumber
  test('gets page number correctly', () => {
    mockSessionStorage.getItem.mockReturnValue('2')
    const pageNo = session.getPageNumber()
    expect(pageNo).toEqual(2)
  })

  // Test for incPageNo
  test('increments page number correctly', () => {
    mockSessionStorage.getItem.mockReturnValue('2')
    const pageNo = session.incPageNo()
    expect(pageNo).toEqual(3)
  })

  // Test for getSessionToken
  test('gets session token correctly', () => {
    mockSessionStorage.getItem.mockReturnValue('token_1')
    const token = session.getSessionToken()
    expect(token).toEqual('token_1')
  })

  // Test for setSessionToken
  test('sets session token correctly', () => {
    session.setSessionToken('token_1')
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      mockOptions.session_token_key,
      'token_1',
    )
  })

  // Test for applySessionHash
  test('applies session hash correctly', () => {
    const hash = '1&token_1'
    session.applySessionHash(hash)
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      mockOptions.session_token_key,
      'token_1',
    )
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(mockOptions.session_pageno_key, '1')
  })

  // Test for getSessionHash
  test('gets session hash correctly', () => {
    mockSessionStorage.getItem.mockReturnValueOnce('1').mockReturnValueOnce('token_1')
    const hash = session.getSessionHash()
    expect(hash).toEqual('1&token_1')
  })

  // Test for getTabId
  test('gets tabId correctly', () => {
    expect(session.getTabId()).toEqual('random_id')
  })

  // Test for createTabId
  test('creates tabId correctly', () => {
    mockSessionStorage.getItem.mockReturnValueOnce(null).mockReturnValueOnce('random_id')
    session['createTabId']()
    expect(session.getTabId()).toEqual('random_id')
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      mockOptions.session_tabid_key,
      'random_id',
    )
  })

  // Test for reset
  test('resets session correctly', () => {
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
})
