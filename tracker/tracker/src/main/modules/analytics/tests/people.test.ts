// @ts-nocheck
import { jest, describe, test, expect, beforeEach } from '@jest/globals'
import People from '../people.js'
import { categories, mutationTypes } from '../types.js'

describe('People', () => {
  let constantProps: any
  let onId: jest.Mock
  let batcher: { addEvent: jest.Mock }
  let people: People

  const sent = () => batcher.addEvent.mock.calls.map((c) => c[0])
  const sentData = () => sent().map((e) => e.data)

  beforeEach(() => {
    constantProps = {
      user_id: null,
      defaultPropertyKeys: ['os', 'browser', 'reserved'],
      setUserId: jest.fn((id: string | null) => {
        constantProps.user_id = id
      }),
      resetUserId: jest.fn(() => {
        constantProps.user_id = null
      }),
    }
    onId = jest.fn()
    batcher = { addEvent: jest.fn() }
    people = new People(constantProps, () => 1635186000000, onId, batcher)
  })

  test('identify throws if user_id is missing', () => {
    expect(() => people.identify('')).toThrow(
      'OR SDK: user_id (string) is required for .identify()',
    )
    expect(() => people.identify(null as any)).toThrow(
      'OR SDK: user_id (string) is required for .identify()',
    )
  })

  test('identify sends a user_actions identity event built by the real createEvent', () => {
    people.identify('user-123')

    expect(people.user_id).toBe('user-123')
    expect(onId).toHaveBeenCalledWith('user-123')
    expect(sent()).toEqual([
      {
        category: 'user_actions',
        data: {
          type: 'identity',
          user_id: 'user-123',
          payload: undefined,
          timestamp: 1635186000000,
        },
      },
    ])
    expect(categories.people).toBe('user_actions')
  })

  test('identify does not call onId when fromTracker=true', () => {
    people.identify('user-123', { fromTracker: true })

    expect(people.user_id).toBe('user-123')
    expect(onId).not.toHaveBeenCalled()
  })

  test('identify with a different user drops the previous user properties', () => {
    people.identify('old-user')
    people.setProperties({ plan: 'pro' })

    people.identify('new-user')

    expect(constantProps.resetUserId).toHaveBeenCalledTimes(1)
    expect(people.ownProperties).toEqual({})
    expect(people.user_id).toBe('new-user')
  })

  test('identify with the same user keeps properties', () => {
    people.identify('user-1')
    people.setProperties({ plan: 'pro' })

    people.identify('user-1')

    expect(constantProps.resetUserId).not.toHaveBeenCalled()
    expect(people.ownProperties).toEqual({ plan: 'pro' })
  })

  test('reset passes hard flag and clears ownProperties', () => {
    people.ownProperties = { a: 1 }
    people.reset(true)

    expect(constantProps.resetUserId).toHaveBeenCalledWith(true)
    expect(people.ownProperties).toEqual({})
  })

  test('deleteUser does nothing when no user_id', () => {
    people.deleteUser()

    expect(constantProps.setUserId).not.toHaveBeenCalled()
    expect(batcher.addEvent).not.toHaveBeenCalled()
  })

  test('deleteUser sends delete event for the removed user and clears local state', () => {
    constantProps.user_id = 'user-123'
    people.ownProperties = { name: 'Test' }

    people.deleteUser()

    expect(people.user_id).toBeNull()
    expect(people.ownProperties).toEqual({})
    expect(sentData()).toEqual([
      { type: mutationTypes.deleteUser, user_id: 'user-123', payload: undefined, timestamp: undefined },
    ])
  })

  test('setProperties keeps non-default properties locally and sends all of them', () => {
    people.setProperties({ name: 'Test User', age: 30, os: 'Windows' })

    expect(people.ownProperties).toEqual({ name: 'Test User', age: 30 })
    expect(sentData()).toEqual([
      {
        type: mutationTypes.setProperty,
        user_id: null,
        payload: { name: 'Test User', age: 30, os: 'Windows' },
        timestamp: undefined,
      },
    ])
  })

  test('setProperties accepts key/value form including falsy values', () => {
    people.setProperties('plan', 'pro')
    people.setProperties('count', 0)
    people.setProperties('nickname', '')

    expect(people.ownProperties).toEqual({ plan: 'pro', count: 0, nickname: '' })
    expect(sentData().map((d) => d.payload)).toEqual([{ plan: 'pro' }, { count: 0 }, { nickname: '' }])
  })

  test('setProperties throws for invalid input', () => {
    expect(() => people.setProperties('no-value' as any)).toThrow(
      'OR SDK: invalid user properties provided to set',
    )
    expect(() => people.setProperties(null as any)).toThrow(
      'OR SDK: no user properties provided to set',
    )
  })

  test('setPropertiesOnce only sets missing properties and ignores default keys', () => {
    people.ownProperties = { name: 'Initial', zero: 0, empty: '' }

    people.setPropertiesOnce({
      name: 'New',
      zero: 5,
      empty: 'filled',
      email: 'test@example.com',
      reserved: 'should-be-ignored',
    })

    expect(people.ownProperties).toEqual({
      name: 'Initial',
      zero: 0,
      empty: '',
      email: 'test@example.com',
    })
    const [data] = sentData()
    expect(data.type).toBe(mutationTypes.setPropertyOnce)
    expect(data.payload).toEqual({
      name: 'New',
      zero: 5,
      empty: 'filled',
      email: 'test@example.com',
      reserved: 'should-be-ignored',
    })
  })

  test('setPropertiesOnce throws for non-object input', () => {
    expect(() => people.setPropertiesOnce('not-an-object' as any)).toThrow(
      'Properties must be an object',
    )
  })

  test('appendValues turns a scalar into an array and sends the appended value', () => {
    people.identify('u1')
    batcher.addEvent.mockClear()
    people.ownProperties = { tags: 'tag1' }

    people.appendValues('tags', 'tag2')
    people.appendValues('tags', 'tag3')

    expect(people.ownProperties.tags).toEqual(['tag1', 'tag2', 'tag3'])
    expect(sentData()).toEqual([
      { type: mutationTypes.appendProperty, user_id: 'u1', payload: { tags: 'tag2' }, timestamp: undefined },
      { type: mutationTypes.appendProperty, user_id: 'u1', payload: { tags: 'tag3' }, timestamp: undefined },
    ])
  })

  test('appendValues leaves unknown and default-key properties alone but still sends', () => {
    people.appendValues('missing', 'value')
    people.ownProperties = { reserved: 'keep' }
    people.appendValues('reserved', 'new')

    expect(people.ownProperties).toEqual({ reserved: 'keep' })
    expect(sentData().map((d) => d.payload)).toEqual([{ missing: 'value' }, { reserved: 'new' }])
  })

  test('appendUniqueValues sends only an append_unique event and updates the local array', () => {
    people.ownProperties = { tags: ['tag1', 'tag2'] }

    people.appendUniqueValues('tags', 'tag3')

    expect(people.ownProperties.tags).toEqual(['tag1', 'tag2', 'tag3'])
    expect(sentData()).toEqual([
      {
        type: mutationTypes.appendUniqueProperty,
        user_id: null,
        payload: { tags: 'tag3' },
        timestamp: undefined,
      },
    ])
  })

  test('appendUniqueValues does not duplicate a known value locally', () => {
    people.ownProperties = { tags: ['tag1', 'tag2'], tag: 'tag1' }

    people.appendUniqueValues('tags', 'tag2')
    people.appendUniqueValues('tag', 'tag1')
    people.appendUniqueValues('tag', 'tag2')

    expect(people.ownProperties).toEqual({ tags: ['tag1', 'tag2'], tag: ['tag1', 'tag2'] })
    expect(sentData().map((d) => d.type)).toEqual([
      mutationTypes.appendUniqueProperty,
      mutationTypes.appendUniqueProperty,
      mutationTypes.appendUniqueProperty,
    ])
  })

  test('appendUniqueValues still sends when the property is not known locally', () => {
    people.appendUniqueValues('missing', 'value')

    expect(people.ownProperties.missing).toBeUndefined()
    expect(sentData()).toEqual([
      {
        type: mutationTypes.appendUniqueProperty,
        user_id: null,
        payload: { missing: 'value' },
        timestamp: undefined,
      },
    ])
  })

  test('increment initializes missing numeric property and adds value', () => {
    people.increment('count', 5)

    expect(people.ownProperties.count).toBe(5)
    expect(sentData()).toEqual([
      { type: mutationTypes.incrementProperty, user_id: null, payload: { count: 5 }, timestamp: undefined },
    ])
  })

  test('increment adds to existing numeric property and supports negative values', () => {
    people.ownProperties = { count: 10 }

    people.increment('count', 5)
    people.increment('count', -3)

    expect(people.ownProperties.count).toBe(12)
    expect(batcher.addEvent).toHaveBeenCalledTimes(2)
  })

  test('increment throws for non-numeric property', () => {
    people.ownProperties = { name: 'Test', arr: [1, 2, 3] }

    expect(() => people.increment('name', 5)).toThrow('OR SDK: Property must be a number to increment')
    expect(() => people.increment('arr', 5)).toThrow('OR SDK: Property must be a number to increment')
  })
})
