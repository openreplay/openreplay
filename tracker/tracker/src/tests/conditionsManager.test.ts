// @ts-nocheck
import ConditionsManager from '../main/modules/conditionsManager'
import { describe, expect, jest, afterEach, beforeEach, test } from '@jest/globals'

const Type = {
  JSException: 78,
  CustomEvent: 27,
  MouseClick: 69,
  SetPageLocation: 4,
  NetworkRequest: 83,
}

describe('ConditionsManager', () => {
  // Mock dependencies
  let appMock
  let startOptionsMock

  beforeEach(() => {
    appMock = {
      start: jest.fn(),
      debug: { error: jest.fn() },
      options: { ingestPoint: 'https://example.com' },
    }
    startOptionsMock = {}
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve([{ type: 'visited_url', operator: 'is', value: ['example.com'] }]),
      }),
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('constructor initializes properties', () => {
    const manager = new ConditionsManager(appMock, startOptionsMock)
    expect(manager.conditions).toEqual([])
    expect(manager.hasStarted).toBeFalsy()
  })

  test('setConditions sets the conditions', () => {
    const manager = new ConditionsManager(appMock, startOptionsMock)
    const conditions = [{ type: 'visited_url', operator: 'is', value: ['example.com'] }]
    manager.setConditions(conditions)
    expect(manager.conditions).toEqual(conditions)
  })

  test('fetchConditions fetches and sets conditions', async () => {
    const manager = new ConditionsManager(appMock, startOptionsMock)
    await manager.fetchConditions('token')
    expect(manager.conditions).toEqual([
      { type: 'visited_url', operator: 'is', value: ['example.com'] },
    ])
  })

  test('trigger method starts app when not started', () => {
    const manager = new ConditionsManager(appMock, startOptionsMock)
    manager.trigger()
    expect(manager.hasStarted).toBeTruthy()
    expect(appMock.start).toHaveBeenCalledWith(startOptionsMock)
  })

  test('trigger method does nothing if already started', () => {
    const manager = new ConditionsManager(appMock, startOptionsMock)
    manager.hasStarted = true
    manager.trigger()
    expect(appMock.start).not.toHaveBeenCalled()
  })

  test('processMessage correctly processes a JSException message', () => {
    const manager = new ConditionsManager(appMock, startOptionsMock)
    manager.setConditions([{ type: 'exception', operator: 'contains', value: ['Error'] }])
    const jsExceptionMessage = [
      Type.JSException,
      'TypeError',
      'An Error occurred',
      'Payload',
      'Metadata',
    ]
    manager.processMessage(jsExceptionMessage)
    expect(manager.hasStarted).toBeTruthy() // assuming this should trigger the start
  })

  test('processMessage correctly processes a CustomEvent message', () => {
    const manager = new ConditionsManager(appMock, startOptionsMock)
    manager.setConditions([{ type: 'custom_event', operator: 'is', value: ['eventName'] }])
    const customEventMessage = [Type.CustomEvent, 'eventName', 'Payload']
    manager.processMessage(customEventMessage)
    expect(manager.hasStarted).toBeTruthy() // assuming this should trigger the start
  })

  test('processMessage correctly processes a MouseClick message', () => {
    const manager = new ConditionsManager(appMock, startOptionsMock)
    manager.setConditions([{ type: 'click_label', operator: 'is', value: ['clickLabel'] }])
    const mouseClickMessage = [Type.MouseClick, 123, 200, 'clickLabel', 'selector']
    manager.processMessage(mouseClickMessage)
    expect(manager.hasStarted).toBeTruthy() // assuming this should trigger the start
  })

  test('processMessage correctly processes a SetPageLocation message', () => {
    const manager = new ConditionsManager(appMock, startOptionsMock)
    manager.setConditions([{ type: 'request_url', operator: 'is', value: ['https://example.com'] }])
    const setPageLocationMessage = [
      Type.SetPageLocation,
      'https://example.com',
      'referrer',
      Date.now(),
    ]
    manager.processMessage(setPageLocationMessage)
    expect(manager.hasStarted).toBeTruthy() // assuming this should trigger the start
  })

  test('processMessage correctly processes a NetworkRequest message', () => {
    const manager = new ConditionsManager(appMock, startOptionsMock)
    manager.setConditions([
      { type: 'request_url', operator: 'is', value: ['https://api.example.com'] },
    ])
    const networkRequestMessage = [
      Type.NetworkRequest,
      'XHR',
      'GET',
      'https://api.example.com',
      'Request',
      'Response',
      200,
      Date.now(),
      500,
      1024,
    ]
    manager.processMessage(networkRequestMessage)
    expect(manager.hasStarted).toBeTruthy() // assuming this should trigger the start
  })

  test('processDuration triggers after specified duration', () => {
    jest.useFakeTimers()
    const manager = new ConditionsManager(appMock, startOptionsMock)
    manager.processDuration(5) // 5 seconds
    jest.advanceTimersByTime(6000) // Advance timer by 5 seconds
    expect(manager.hasStarted).toBeTruthy()
  })
})
