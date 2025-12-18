// @ts-nocheck
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import People from '../people.js'
import * as utils from '../utils.js'
import { createEvent, categories, mutationTypes } from '../types.js'

jest.mock('../types.js', () => ({
  mutationTypes: {
    identity: 'identity',
    deleteUser: 'deleteUser',
    setProperty: 'setProperty',
    setPropertyOnce: 'setPropertyOnce',
    appendProperty: 'appendProperty',
    appendUniqueProperty: 'appendUniqueProperty',
    incrementProperty: 'incrementProperty',
  },
  categories: {
    people: 'people',
  },
  createEvent: jest.fn((category, type, timestamp, payload) => ({
    category,
    type,
    timestamp,
    payload,
  })),
}))

describe('People', () => {
  let constantProps: any
  let getTimestamp: jest.Mock
  let onId: jest.Mock
  let batcher: { addEvent: jest.Mock }
  let people: People

  beforeEach(() => {
    constantProps = {
      user_id: null,
      defaultPropertyKeys: ['os', 'browser', 'reserved'], // added: simulate reserved/default keys
      setUserId: jest.fn((id: string | null) => {
        constantProps.user_id = id
      }),
      resetUserId: jest.fn(),
    }

    getTimestamp = jest.fn(() => 1635186000000)
    onId = jest.fn()
    batcher = {
      addEvent: jest.fn(),
    }

    people = new People(constantProps, getTimestamp, onId, batcher)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('constructor initializes with empty ownProperties and reads user_id from constantProperties', () => {
    expect(people.ownProperties).toEqual({})
    expect(people.user_id).toBeNull()

    constantProps.user_id = 'existing-user'
    const other = new People(constantProps, getTimestamp, onId, batcher)
    expect(other.user_id).toBe('existing-user')
  })

  test('identify throws if user_id is missing', () => {
    expect(() => people.identify('')).toThrow(
      'OR SDK: user_id (string) is required for .identify()',
    )
    expect(() => people.identify(null as any)).toThrow(
      'OR SDK: user_id (string) is required for .identify()',
    )
  })

  test('identify sets user_id, calls onId, and sends identity event', () => {
    people.identify('user-123')

    expect(constantProps.setUserId).toHaveBeenCalledWith('user-123')
    expect(people.user_id).toBe('user-123')
    expect(onId).toHaveBeenCalledWith('user-123')
    expect(getTimestamp).toHaveBeenCalled()

    const event = batcher.addEvent.mock.calls[0][0]
    expect(event).toEqual({
      category: categories.people,
      type: mutationTypes.identity,
      timestamp: 1635186000000,
      payload: { user_id: 'user-123' },
    })
    expect((createEvent as jest.Mock).mock.calls[0]).toEqual([
      categories.people,
      mutationTypes.identity,
      1635186000000,
      { user_id: 'user-123' },
    ])
  })

  test('identify does not call onId when fromTracker=true', () => {
    people.identify('user-123', { fromTracker: true })

    expect(constantProps.setUserId).toHaveBeenCalledWith('user-123')
    expect(onId).not.toHaveBeenCalled()
  })

  test('identify resets when switching from existing different user', () => {
    constantProps.user_id = 'old-user'
    const p = new People(constantProps, getTimestamp, onId, batcher)
    const resetSpy = jest.spyOn(p, 'reset')

    p.identify('new-user')

    expect(resetSpy).toHaveBeenCalled()
    expect(constantProps.setUserId).toHaveBeenCalledWith('new-user')
  })

  test('reset soft resets user and clears ownProperties', () => {
    people.ownProperties = { a: 1 }
    people.reset()

    expect(constantProps.resetUserId).toHaveBeenCalledWith(undefined)
    expect(people.ownProperties).toEqual({})
  })

  test('reset hard resets user and clears ownProperties', () => {
    people.ownProperties = { a: 1 }
    people.reset(true)

    expect(constantProps.resetUserId).toHaveBeenCalledWith(true)
    expect(people.ownProperties).toEqual({})
  })

  test('deleteUser does nothing when no user_id', () => {
    constantProps.user_id = null

    people.deleteUser()

    expect(constantProps.setUserId).not.toHaveBeenCalled()
    expect(batcher.addEvent).not.toHaveBeenCalled()
  })

  test('deleteUser clears user, ownProperties and adds delete event then calls reset', () => {
    constantProps.user_id = 'user-123'
    people.ownProperties = { name: 'Test' }
    const resetSpy = jest.spyOn(people, 'reset')

    people.deleteUser()

    expect(constantProps.setUserId).toHaveBeenCalledWith(null)
    expect(people.ownProperties).toEqual({})
    expect(resetSpy).toHaveBeenCalled()

    const event = batcher.addEvent.mock.calls[0][0]
    expect(event).toEqual({
      category: categories.people,
      type: mutationTypes.deleteUser,
      timestamp: undefined,
      payload: { user_id: 'user-123' },
    })
  })

  test('setProperties adds non-default properties and sends event', () => {
    const isObjectSpy = jest.spyOn(utils, 'isObject')

    people.setProperties({
      name: 'Test User',
      age: 30,
      os: 'Windows', // should be ignored by defaultPropertyKeys
    })

    expect(isObjectSpy).toHaveBeenCalled()
    expect(people.ownProperties).toEqual({
      name: 'Test User',
      age: 30,
    })

    const event = batcher.addEvent.mock.calls[0][0]
    expect(event.type).toBe(mutationTypes.setProperty)
    expect(event.payload).toEqual({
      user_id: null,
      properties: {
        name: 'Test User',
        age: 30,
        os: 'Windows',
      },
    })
  })

  test('setProperties throws for non-object input', () => {
    expect(() => people.setProperties('not-an-object' as any)).toThrow(
      'OR SDK: invalid user properties provided to set',
    )
  })

  test('setPropertiesOnce only sets properties that do not exist and ignores default keys', () => {
    people.ownProperties = {
      name: 'Initial',
    }

    people.setPropertiesOnce({
      name: 'New',
      email: 'test@example.com',
      reserved: 'should-be-ignored',
    })

    expect(people.ownProperties).toEqual({
      name: 'Initial',
      email: 'test@example.com',
    })

    const event = batcher.addEvent.mock.calls[0][0]
    expect(event.type).toBe(mutationTypes.setPropertyOnce)
    expect(event.payload.properties).toEqual({
      name: 'New',
      email: 'test@example.com',
      reserved: 'should-be-ignored',
    })
  })

  test('setPropertiesOnce throws for non-object input', () => {
    expect(() => people.setPropertiesOnce('not-an-object' as any)).toThrow(
      'Properties must be an object',
    )
  })

  test('appendValues turns string property into array', () => {
    people.ownProperties = {
      tags: 'tag1',
    }

    people.appendValues('tags', 'tag2')

    expect(people.ownProperties.tags).toEqual(['tag1', 'tag2'])

    const event = batcher.addEvent.mock.calls[0][0]
    expect(event.type).toBe(mutationTypes.appendProperty)
    expect(event.payload.properties).toEqual({ tags: 'tag2' })
  })

  test('appendValues appends to existing array property', () => {
    people.ownProperties = {
      tags: ['tag1', 'tag2'],
    }

    people.appendValues('tags', 'tag3')

    expect(people.ownProperties.tags).toEqual(['tag1', 'tag2', 'tag3'])
  })

  test('appendValues does not change undefined or default-key property but still sends event', () => {
    people.ownProperties = {}
    people.appendValues('missing', 'value')
    expect(people.ownProperties.missing).toBeUndefined()

    people.ownProperties = { reserved: 'keep' }
    people.appendValues('reserved', 'new')
    expect(people.ownProperties.reserved).toBe('keep')

    expect(batcher.addEvent).toHaveBeenCalledTimes(2)
  })

  test('appendUniqueValues adds unique value to array property and sends both append and union events', () => {
    people.ownProperties = {
      tags: ['tag1', 'tag2'],
    }

    people.appendUniqueValues('tags', 'tag3')

    expect(people.ownProperties.tags).toEqual(['tag1', 'tag2', 'tag3'])

    expect(batcher.addEvent).toHaveBeenCalledTimes(2)
    const [appendEvent, unionEvent] = batcher.addEvent.mock.calls.map((c) => c[0])

    expect(appendEvent.type).toBe(mutationTypes.appendProperty)
    expect(unionEvent.type).toBe(mutationTypes.appendUniqueProperty)
  })

  test('appendUniqueValues only sends union event when value already present in array', () => {
    people.ownProperties = {
      tags: ['tag1', 'tag2'],
    }

    people.appendUniqueValues('tags', 'tag2')

    expect(people.ownProperties.tags).toEqual(['tag1', 'tag2'])
    expect(batcher.addEvent).toHaveBeenCalledTimes(1)
    const event = batcher.addEvent.mock.calls[0][0]
    expect(event.type).toBe(mutationTypes.appendUniqueProperty)
  })

  test('appendUniqueValues turns scalar into array when different value', () => {
    people.ownProperties = {
      tag: 'tag1',
    }

    people.appendUniqueValues('tag', 'tag2')

    expect(people.ownProperties.tag).toEqual(['tag1', 'tag2'])
  })

  test('appendUniqueValues does nothing when property does not exist', () => {
    people.ownProperties = {}

    people.appendUniqueValues('missing', 'value')

    expect(people.ownProperties.missing).toBeUndefined()
    expect(batcher.addEvent).not.toHaveBeenCalled()
  })

  test('increment initializes missing numeric property and adds value', () => {
    people.ownProperties = {}

    people.increment('count', 5)

    expect(people.ownProperties.count).toBe(5)

    const event = batcher.addEvent.mock.calls[0][0]
    expect(event.type).toBe(mutationTypes.incrementProperty)
    expect(event.payload.properties).toEqual({ count: 5 })
  })

  test('increment adds to existing numeric property and supports negative values', () => {
    people.ownProperties = {
      count: 10,
    }

    people.increment('count', 5)
    people.increment('count', -3)

    expect(people.ownProperties.count).toBe(12)
    expect(batcher.addEvent).toHaveBeenCalledTimes(2)
  })

  test('increment throws for non-numeric property', () => {
    people.ownProperties = {
      name: 'Test',
      arr: [1, 2, 3],
    }

    expect(() => people.increment('name', 5)).toThrow(
      'OR SDK: Property must be a number to increment',
    )
    expect(() => people.increment('arr', 5)).toThrow(
      'OR SDK: Property must be a number to increment',
    )
  })
})
