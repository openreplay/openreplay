// @ts-nocheck
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import Events from '../events.js'

describe('Events', () => {
  let mockSharedProperties
  let events
  let mockTimestamp
  let mockToken
  let mockGetTimestamp
  let originalSetInterval
  let originalClearInterval
  let setIntervalMock

  beforeEach(() => {
    originalSetInterval = global.setInterval
    originalClearInterval = global.clearInterval

    setIntervalMock = jest.fn(() => 123)
    global.setInterval = setIntervalMock
    global.clearInterval = jest.fn()

    mockTimestamp = 1635186000000 // Example timestamp
    mockGetTimestamp = jest.fn(() => mockTimestamp)

    mockSharedProperties = {
      all: {
        $__os: 'Windows 10',
        $__browser: 'Chrome 91.0.4472.124 (91)',
        $__device: 'Desktop',
        $__screenHeight: 1080,
        $__screenWidth: 1920,
        $__initialReferrer: 'https://example.com',
        $__utmSource: 'test_source',
        $__utmMedium: 'test_medium',
        $__utmCampaign: 'test_campaign',
        $__deviceId: 'test-device-id',
      },
    }

    mockToken = 'test-token-123'

    events = new Events(mockSharedProperties, mockToken, mockGetTimestamp, 1000)

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  afterEach(() => {
    global.setInterval = originalSetInterval
    global.clearInterval = originalClearInterval

    if (events.sendInterval) {
      clearInterval(events.sendInterval)
    }

    jest.restoreAllMocks()
  })

  test('constructor sets up event queue and batch interval', () => {
    expect(events.queue).toEqual([])
    expect(events.ownProperties).toEqual({})
    expect(setIntervalMock).toHaveBeenCalledWith(expect.any(Function), 1000)
    expect(events.sendInterval).toBe(123)
  })

  test('sendEvent adds event to queue with correct properties', () => {
    events.sendEvent('test_event', { testProp: 'value' })

    expect(events.queue).toHaveLength(1)
    expect(events.queue[0]).toEqual({
      event: 'test_event',
      properties: {
        ...mockSharedProperties.all,
        testProp: 'value',
      },
      timestamp: mockTimestamp,
    })
  })

  test('sendEvent validates properties are objects', () => {
    expect(() => {
      events.sendEvent('test_event', 'not an object')
    }).toThrow('Properties must be an object')
  })

  test('sendEvent with send_immediately option calls sendSingle', async () => {
    const sendSingleSpy = jest.spyOn(events, 'sendSingle').mockResolvedValue(undefined)

    await events.sendEvent('immediate_test', { testProp: 'value' }, { send_immediately: true })

    expect(sendSingleSpy).toHaveBeenCalledWith({
      event: 'immediate_test',
      properties: {
        ...mockSharedProperties.all,
        testProp: 'value',
      },
      timestamp: mockTimestamp,
    })
    expect(events.queue).toHaveLength(0) // Should not add to queue
  })

  test('sendBatch does nothing when queue is empty', async () => {
    await events.sendBatch()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('setProperty sets a single property correctly', () => {
    events.setProperty('testProp', 'value')
    expect(events.ownProperties).toEqual({ testProp: 'value' })

    events.setProperty('event_name', 'should not be set')
    expect(events.ownProperties.event_name).toBeUndefined()
  })

  test('setProperty sets multiple properties from object', () => {
    events.setProperty({
      prop1: 'value1',
      prop2: 'value2',
      event_name: 'should not be set', // Reserved
    })

    expect(events.ownProperties).toEqual({
      prop1: 'value1',
      prop2: 'value2',
    })
  })

  test('setPropertiesOnce only sets properties that do not exist', () => {
    events.setProperty('existingProp', 'initial value')

    events.setPropertiesOnce({
      existingProp: 'new value',
      newProp: 'value',
    })

    expect(events.ownProperties).toEqual({
      existingProp: 'initial value', // Should not change
      newProp: 'value', // Should be added
    })
  })

  test('setPropertiesOnce sets a single property if it does not exist', () => {
    events.setPropertiesOnce('newProp', 'value')
    expect(events.ownProperties).toEqual({ newProp: 'value' })

    events.setPropertiesOnce('newProp', 'new value')
    expect(events.ownProperties).toEqual({ newProp: 'value' }) // Should not change
  })

  test('unsetProperties removes a single property', () => {
    events.setProperty({
      prop1: 'value1',
      prop2: 'value2',
    })
    events.unsetProperties('prop1')

    expect(events.ownProperties).toEqual({
      prop2: 'value2',
    })
  })

  test('unsetProperties removes multiple properties', () => {
    events.setProperty({
      prop1: 'value1',
      prop2: 'value2',
      prop3: 'value3',
    })
    events.unsetProperties(['prop1', 'prop3'])

    expect(events.ownProperties).toEqual({
      prop2: 'value2',
    })
  })

  test('unsetProperties does not remove reserved properties', () => {
    events.ownProperties.event_name = 'test'
    events.unsetProperties('event_name')

    expect(events.ownProperties.event_name).toBe('test')
  })

  test('events include both shared and own properties', () => {
    events.setProperty('customProp', 'custom value')
    events.sendEvent('test_event')

    expect(events.queue[0].properties).toEqual({
      ...mockSharedProperties.all,
      customProp: 'custom value',
    })
  })

  test('event properties override own properties', () => {
    events.setProperty('customProp', 'own value')

    events.sendEvent('test_event', { customProp: 'event value' })
    expect(events.queue[0].properties.customProp).toBe('event value')
  })
})
