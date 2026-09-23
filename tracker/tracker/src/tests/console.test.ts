// @ts-nocheck
import mainFunction, { Options } from '../main/modules/console.js'
import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals'

const CONSOLE_LOG = 22

describe('Console logging module', () => {
  let originalConsole
  let mockApp
  let tickerCallbacks
  let startCallbacks
  let stopCallbacks
  let originals

  beforeEach(() => {
    originalConsole = globalThis.console
    // named functions, like the real console methods
    originals = {
      log: jest.fn(function log() {}),
      info: jest.fn(function info() {}),
      warn: jest.fn(function warn() {}),
      error: jest.fn(function error() {}),
      debug: jest.fn(function debug() {}),
      assert: jest.fn(function assert() {}),
    }
    globalThis.console = { ...originals }

    tickerCallbacks = []
    startCallbacks = []
    stopCallbacks = []
    mockApp = {
      safe: jest.fn((callback) => callback),
      send: jest.fn(),
      attachStartCallback: jest.fn((cb) => startCallbacks.push(cb)),
      attachStopCallback: jest.fn((cb) => stopCallbacks.push(cb)),
      sanitizer: {
        privateMode: false,
      },
      ticker: {
        attach: jest.fn((cb) => tickerCallbacks.push(cb)),
      },
      debug: {
        error: jest.fn(),
      },
      observer: {
        attachContextCallback: jest.fn(),
      },
    }
  })

  afterEach(() => {
    globalThis.console = originalConsole
  })

  it('patches console methods and still calls the original', () => {
    mainFunction(mockApp, {})
    globalThis.console.log('test log')
    expect(originals.log).toHaveBeenCalledWith('test log')
    expect(mockApp.send).toHaveBeenCalledWith([CONSOLE_LOG, 'log', 'test log'])
  })

  it('maps each patched method to its level', () => {
    mainFunction(mockApp, {})
    for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
      globalThis.console[level](`${level} msg`)
      expect(mockApp.send).toHaveBeenLastCalledWith([CONSOLE_LOG, level, `${level} msg`])
    }
  })

  it('uses the method name as level even if the host wrapped the method', () => {
    globalThis.console.warn = function sentryWrapped() {}
    mainFunction(mockApp, { consoleMethods: ['warn'] })
    globalThis.console.warn('w')
    expect(mockApp.send).toHaveBeenCalledWith([CONSOLE_LOG, 'warn', 'w'])
  })

  it('throttles and resets the budget on the ticker', () => {
    const options: Options = {
      consoleMethods: ['log'],
      consoleThrottling: 1,
    }
    mainFunction(mockApp, options)
    globalThis.console.log('test log 1')
    globalThis.console.log('test log 2')
    globalThis.console.log('test log 3')
    expect(mockApp.send).toHaveBeenCalledTimes(1)
    expect(originals.log).toHaveBeenCalledTimes(3)

    expect(tickerCallbacks).toHaveLength(1)
    tickerCallbacks[0]()
    globalThis.console.log('test log 4')
    globalThis.console.log('test log 5')
    expect(mockApp.send).toHaveBeenCalledTimes(2)
    expect(mockApp.send).toHaveBeenLastCalledWith([CONSOLE_LOG, 'log', 'test log 4'])
  })

  it('does not patch console methods when consoleMethods is null', () => {
    mainFunction(mockApp, { consoleMethods: null, consoleThrottling: 30 })
    globalThis.console.log('test log')
    expect(mockApp.send).not.toHaveBeenCalled()
    expect(globalThis.console.log).toBe(originals.log)
  })

  it('does not patch console methods when consoleMethods is an empty array', () => {
    mainFunction(mockApp, { consoleMethods: [], consoleThrottling: 30 })
    globalThis.console.log('test log')
    expect(mockApp.send).not.toHaveBeenCalled()
  })

  it('logs an error when an unsupported console method is provided', () => {
    mainFunction(mockApp, { consoleMethods: ['unsupportedMethod'], consoleThrottling: 30 })
    expect(mockApp.debug.error).toHaveBeenCalledWith(
      'OpenReplay: unsupported console method "unsupportedMethod"',
    )
  })

  it('formats printf placeholders', () => {
    mainFunction(mockApp, { consoleMethods: ['log'], consoleThrottling: 30 })
    globalThis.console.log('%s %f %d %o', 'test', 3.14, 42.9, { key: 'value' })
    expect(mockApp.send).toHaveBeenCalledWith([CONSOLE_LOG, 'log', 'test 3.14 42 {key: value}'])
  })

  it('prints arrays and objects', () => {
    mainFunction(mockApp, { consoleMethods: ['log'], consoleThrottling: 30 })
    globalThis.console.log([1, 2, 3], { key1: 'value1', key2: 'value2' }, null, undefined)
    expect(mockApp.send).toHaveBeenCalledWith([
      CONSOLE_LOG,
      'log',
      'Array(3)[1, 2, 3] {key1: value1, key2: value2} null undefined',
    ])
  })

  it('truncates arrays and objects to 10 entries', () => {
    mainFunction(mockApp, { consoleMethods: ['log'], consoleThrottling: 30 })
    const arr = Array.from({ length: 12 }, (_, i) => i)
    const obj = Object.fromEntries(arr.map((i) => [`k${i}`, i]))
    globalThis.console.log(arr, obj)
    const [, , msg] = mockApp.send.mock.calls[0][0]
    expect(msg).toBe(
      'Array(12)[0, 1, 2, 3, 4, 5, 6, 7, 8, 9] {' +
        arr
          .slice(0, 10)
          .map((i) => `k${i}: ${i}`)
          .join(', ') +
        '}',
    )
  })

  it('masks messages in private mode', () => {
    mockApp.sanitizer.privateMode = true
    mainFunction(mockApp, { consoleMethods: ['log'], consoleThrottling: 30 })
    globalThis.console.log('secret 42')
    expect(mockApp.send).toHaveBeenCalledWith([CONSOLE_LOG, 'log', '*********'])
  })

  it('restores the host console on stop and re-patches on start', () => {
    mainFunction(mockApp, { consoleMethods: ['log', 'warn'], consoleThrottling: 30 })
    expect(globalThis.console.log).not.toBe(originals.log)

    stopCallbacks.forEach((cb) => cb())
    expect(globalThis.console.log).toBe(originals.log)
    expect(globalThis.console.warn).toBe(originals.warn)
    globalThis.console.log('while stopped')
    expect(mockApp.send).not.toHaveBeenCalled()

    startCallbacks.forEach((cb) => cb())
    expect(globalThis.console.log).not.toBe(originals.log)
    globalThis.console.log('after restart')
    expect(mockApp.send).toHaveBeenCalledTimes(1)
    expect(mockApp.send).toHaveBeenCalledWith([CONSOLE_LOG, 'log', 'after restart'])

    // a second start must not double-wrap
    startCallbacks.forEach((cb) => cb())
    globalThis.console.log('once')
    expect(mockApp.send).toHaveBeenCalledTimes(2)
  })
})
