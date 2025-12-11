// @ts-nocheck
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import Events from '../events.js'
import * as utils from '../utils.js'
import { createEvent, categories } from '../types.js'

jest.mock('../types.js', () => ({
  categories: {
    events: 'events',
  },
  createEvent: jest.fn((category, type, timestamp, payload) => ({
    category,
    type,
    timestamp,
    payload,
  })),
}))

describe('Events', () => {
  let constantProps: any
  let getTimestamp: jest.Mock
  let batcher: { addEvent: jest.Mock; sendImmediately: jest.Mock }
  let events: Events

  beforeEach(() => {
    constantProps = {
      defaultPropertyKeys: ['os', 'browser', 'reservedKey'],
      getSuperProperties: jest.fn(() => ({
        superA: 'A',
        superB: 2,
      })),
      saveSuperProperties: jest.fn(),
      clearSuperProperties: jest.fn(),
    }

    getTimestamp = jest.fn(() => 1635186000000)
    batcher = {
      addEvent: jest.fn(),
      sendImmediately: jest.fn().mockResolvedValue(undefined),
    }

    events = new Events(constantProps, getTimestamp, batcher)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('constructor initializes ownProperties from constantProperties.getSuperProperties', () => {
    expect(constantProps.getSuperProperties).toHaveBeenCalled()
    expect(events.ownProperties).toEqual({
      superA: 'A',
      superB: 2,
    })
  })

  test('sendEvent merges ownProperties and non-default properties, sends via addEvent', () => {
    const spyIsObject = jest.spyOn(utils, 'isObject')

    events.sendEvent('test_event', {
      foo: 'bar',
      os: 'Windows', // should be filtered out by defaultPropertyKeys
    })

    expect(spyIsObject).toHaveBeenCalledWith({
      foo: 'bar',
      os: 'Windows',
    })
    expect(getTimestamp).toHaveBeenCalled()

    expect(batcher.addEvent).toHaveBeenCalledTimes(1)
    const event = batcher.addEvent.mock.calls[0][0]

    expect(event).toEqual({
      category: categories.events,
      type: undefined,
      timestamp: 1635186000000,
      payload: {
        name: 'test_event',
        properties: {
          superA: 'A',
          superB: 2,
          foo: 'bar',
        },
      },
    })
  })

  test('sendEvent throws when properties is not an object', () => {
    expect(() => events.sendEvent('bad', 'not-object' as any)).toThrow(
      'Properties must be an object',
    )
  })

  test('sendEvent works without properties, uses only ownProperties', () => {
    events.sendEvent('no_props')

    expect(batcher.addEvent).toHaveBeenCalledTimes(1)
    const event = batcher.addEvent.mock.calls[0][0]

    expect(event.payload).toEqual({
      name: 'no_props',
      properties: {
        superA: 'A',
        superB: 2,
      },
    })
  })

  test('sendEvent with send_immediately option calls batcher.sendImmediately instead of addEvent', () => {
    events.sendEvent('immediate_event', { foo: 'bar' }, { send_immediately: true })

    expect(batcher.sendImmediately).toHaveBeenCalledTimes(1)
    const event = batcher.sendImmediately.mock.calls[0][0]

    expect(event.payload.name).toBe('immediate_event')
    expect(batcher.addEvent).not.toHaveBeenCalled()
  })

  test('setProperty with object sets non-default keys and calls saveSuperProperties once', () => {
    events.setProperty({
      a: 1,
      browser: 'Chrome', // defaultPropertyKeys, should be ignored
      b: 2,
    })

    expect(events.ownProperties).toEqual({
      superA: 'A',
      superB: 2,
      a: 1,
      b: 2,
    })
    expect(constantProps.saveSuperProperties).toHaveBeenCalledWith(events.ownProperties)
  })

  test('setProperty with string/value sets non-default key and calls saveSuperProperties', () => {
    events.setProperty('a', 1)
    expect(events.ownProperties.a).toBe(1)
    expect(constantProps.saveSuperProperties).toHaveBeenCalledWith(events.ownProperties)
  })

  test('setProperty ignores defaultPropertyKeys and does not call saveSuperProperties when nothing changed', () => {
    events.setProperty('os', 'Windows')
    expect(events.ownProperties.os).toBeUndefined()
    expect(constantProps.saveSuperProperties).not.toHaveBeenCalled()
  })

  test('setProperty with object that yields no changes does not call saveSuperProperties', () => {
    events.setProperty({
      os: 'Windows',
      browser: 'Chrome',
    })

    expect(events.ownProperties).toEqual({
      superA: 'A',
      superB: 2,
    })
    expect(constantProps.saveSuperProperties).not.toHaveBeenCalled()
  })

  test('setPropertiesOnce with object only sets missing and non-reserved keys', () => {
    events.ownProperties = {
      superA: 'A',
      existing: 'keep',
      properties: 'reserved',
      token: 'reserved-token',
      timestamp: 1234,
    }

    events.setPropertiesOnce({
      existing: 'new', // should not change
      newKey: 'newValue',
      properties: 'should-not-set',
      token: 'should-not-set',
      timestamp: 'should-not-set',
    })

    expect(events.ownProperties).toEqual({
      superA: 'A',
      existing: 'keep',
      properties: 'reserved',
      token: 'reserved-token',
      timestamp: 1234,
      newKey: 'newValue',
    })
    expect(constantProps.saveSuperProperties).toHaveBeenCalledWith(events.ownProperties)
  })

  test('setPropertiesOnce with string/value sets only if missing and non-reserved', () => {
    events.ownProperties = {}

    events.setPropertiesOnce('newKey', 'v')
    expect(events.ownProperties).toEqual({ newKey: 'v' })

    events.setPropertiesOnce('newKey', 'other')
    expect(events.ownProperties).toEqual({ newKey: 'v' })

    events.setPropertiesOnce('properties', 'nope')
    expect(events.ownProperties.properties).toBeUndefined()
  })

  test('setPropertiesOnce does not call saveSuperProperties when nothing changed', () => {
    events.ownProperties = { existing: 1 }

    events.setPropertiesOnce({ existing: 2 })
    expect(constantProps.saveSuperProperties).not.toHaveBeenCalled()
  })

  test('unsetProperties removes a single non-reserved property and saves', () => {
    events.ownProperties = {
      a: 1,
      b: 2,
      token: 'keep',
    }

    events.unsetProperties('a')

    expect(events.ownProperties).toEqual({
      b: 2,
      token: 'keep',
    })
    expect(constantProps.saveSuperProperties).toHaveBeenCalledWith(events.ownProperties)
  })

  test('unsetProperties removes multiple non-reserved properties and saves', () => {
    events.ownProperties = {
      a: 1,
      b: 2,
      properties: 'keep',
      timestamp: 1234,
    }

    events.unsetProperties(['a', 'b', 'timestamp'])

    expect(events.ownProperties).toEqual({
      properties: 'keep',
      timestamp: 1234,
    })
    expect(constantProps.saveSuperProperties).toHaveBeenCalledWith(events.ownProperties)
  })

  test('unsetProperties does not remove reserved properties and does not save if nothing changed', () => {
    events.ownProperties = {
      properties: 'keep',
      token: 'keep-token',
    }

    events.unsetProperties('properties')
    events.unsetProperties(['token'])

    expect(events.ownProperties).toEqual({
      properties: 'keep',
      token: 'keep-token',
    })
    expect(constantProps.saveSuperProperties).not.toHaveBeenCalled()
  })

  test('reset clears all super properties and calls clearSuperProperties', () => {
    events.ownProperties = { something: 'here' }

    events.reset()

    expect(events.ownProperties).toEqual({})
    expect(constantProps.clearSuperProperties).toHaveBeenCalled()
  })

  test('event properties override ownProperties on sendEvent', () => {
    events.setProperty('foo', 'from_super')

    events.sendEvent('test', { foo: 'from_event' })

    const event = batcher.addEvent.mock.calls[0][0]
    expect(event.payload.properties.foo).toBe('from_event')
  })
})
