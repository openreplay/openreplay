// @ts-nocheck
import mainFunction, { Options } from '../main/modules/console.js' // replace with actual module path
import { describe, beforeEach, afterEach, it, expect } from '@jest/globals'

jest.useFakeTimers()

describe('Console logging module', () => {
  let originalConsole
  let mockApp

  beforeEach(() => {
    originalConsole = global.console
    global.console = {
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      assert: jest.fn(),
    }

    mockApp = {
      safe: jest.fn((callback) => callback),
      send: jest.fn(),
      attachStartCallback: jest.fn(),
      ticker: {
        attach: jest.fn(),
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
    global.console = originalConsole
  })

  it('should patch console methods', () => {
    mainFunction(mockApp, {})
    jest.useFakeTimers()
    global.console.log('test log')
    jest.advanceTimersByTime(9999)
    // 22 - Console message
    expect(mockApp.send).toHaveBeenCalledWith([22, 'mockConstructor', 'test log'])
  })

  it('should respect consoleThrottling', async () => {
    const options: Options = {
      consoleMethods: ['log'],
      consoleThrottling: 1,
    }
    mainFunction(mockApp, options)
    jest.runAllTimers()
    global.console.log('test log 1')
    global.console.log('test log 2')
    global.console.log('test log 3')
    global.console.log('test log 4')

    expect(mockApp.send).toHaveBeenCalledTimes(1)
  })

  it('should not patch console methods when consoleMethods is null', () => {
    const options: Options = {
      consoleMethods: null,
      consoleThrottling: 30,
    }
    mainFunction(mockApp, options)
    global.console.log('test log')
    expect(mockApp.send).not.toHaveBeenCalled()
  })

  it('should not patch console methods when consoleMethods is an empty array', () => {
    const options: Options = {
      consoleMethods: [],
      consoleThrottling: 30,
    }
    mainFunction(mockApp, options)
    global.console.log('test log')
    expect(mockApp.send).not.toHaveBeenCalled()
  })

  it('should log an error when an unsupported console method is provided', () => {
    const options: Options = {
      consoleMethods: ['unsupportedMethod'],
      consoleThrottling: 30,
    }
    mainFunction(mockApp, options)
    expect(mockApp.debug.error).toHaveBeenCalledWith(
      'OpenReplay: unsupported console method "unsupportedMethod"',
    )
  })

  // More tests for the printf function
  it('should correctly print different argument types', () => {
    const options: Options = {
      consoleMethods: ['log'],
      consoleThrottling: 30,
    }
    mainFunction(mockApp, options)
    global.console.log('%s %f %d %o', 'test', 3.14, 42, { key: 'value' })
    jest.advanceTimersByTimeAsync(110)
    expect(mockApp.send).toHaveBeenCalledWith([22, 'mockConstructor', 'test 3.14 42 {key: value}'])
  })

  // More tests for the printObject function
  it('should correctly print different object types', () => {
    const options: Options = {
      consoleMethods: ['log'],
      consoleThrottling: 30,
    }
    mainFunction(mockApp, options)
    global.console.log([1, 2, 3], { key1: 'value1', key2: 'value2' })
    jest.advanceTimersByTimeAsync(110)
    expect(mockApp.send).toHaveBeenCalledWith([
      22,
      'mockConstructor',
      'Array(3)[1, 2, 3] {key1: value1, key2: value2}',
    ])
  })
})
