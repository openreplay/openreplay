// @ts-nocheck
import SignalManager from '../main/modules/userTesting/SignalManager'
import { TEST_START, SESSION_ID } from '../main/modules/userTesting/utils'
import { jest, describe, beforeEach, expect, test } from '@jest/globals'

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
  }),
)

const localStorageMock = (() => {
  let store = {}
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString()
    }),
    removeItem: jest.fn((key) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const ingestPoint = 'https://example.com'
const getTimestamp = jest.fn()
const token = 'test-token'
const testId = 'testId'
const storageKey = 'test-storage-key'
const setStorageKey = jest.fn()
const removeStorageKey = jest.fn()
const getStorageKey = jest.fn()
const getSessionId = jest.fn()

let signalManager

beforeEach(() => {
  signalManager = new SignalManager(
    ingestPoint,
    getTimestamp,
    token,
    testId,
    storageKey,
    setStorageKey,
    removeStorageKey,
    getStorageKey,
    getSessionId,
  )

  // Reset mocks
  fetch.mockClear()
  localStorageMock.clear()
  getTimestamp.mockClear()
  setStorageKey.mockClear()
  removeStorageKey.mockClear()
  getStorageKey.mockClear()
  getSessionId.mockClear()
})

describe('UXT SignalManager tests', () => {
  test('Constructor initializes durations from local storage', () => {
    getStorageKey.mockReturnValueOnce('1000')
    const localSignalManager = new SignalManager(
      ingestPoint,
      getTimestamp,
      token,
      testId,
      storageKey,
      setStorageKey,
      removeStorageKey,
      getStorageKey,
      getSessionId,
    )
    expect(localSignalManager.getDurations().testStart).toBe(1000)
  })

  test('signalTask sends correct data for valid task ID', async () => {
    getTimestamp.mockReturnValueOnce(2000)
    signalManager.setDurations({ testStart: 1000, tasks: [{ taskId: 1, started: 1500 }] })
    await signalManager.signalTask(1, 'done')
    expect(fetch).toHaveBeenCalledWith(`${ingestPoint}/v1/web/uxt/signals/task`, expect.anything())
    expect(fetch.mock.calls[0][1].body).toEqual(expect.stringContaining('"taskId":1'))
  })

  test('signalTask handles missing taskId', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    signalManager.signalTask(0, 'done')
    expect(consoleSpy).toHaveBeenCalledWith('User Testing: No Task ID Given')
    consoleSpy.mockRestore()
  })

  test('signalTest sets storage keys on test begin', () => {
    getTimestamp.mockReturnValueOnce(3000)
    getSessionId.mockReturnValueOnce('session-id')
    signalManager.signalTest('begin')
    expect(setStorageKey).toHaveBeenCalledWith(SESSION_ID, 'session-id')
    expect(setStorageKey).toHaveBeenCalledWith(TEST_START, '3000')
  })
})
