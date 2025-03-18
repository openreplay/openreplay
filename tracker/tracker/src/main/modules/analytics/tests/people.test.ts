// @ts-nocheck
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import People from '../people.js'
import * as utils from '../utils.js'

jest.spyOn(utils, 'isObject')

describe('People', () => {
  let mockSharedProperties
  let mockGetToken
  let mockGetTimestamp
  let people

  beforeEach(() => {
    // Mock shared properties
    mockSharedProperties = {
      all: {
        $__os: 'Windows 10',
        $__browser: 'Chrome 91.0.4472.124 (91)',
        $__deviceId: 'test-device-id',
      },
    }

    // Mock token and timestamp functions
    mockGetToken = jest.fn(() => 'test-token-123')
    mockGetTimestamp = jest.fn(() => 1635186000000)

    // Create People instance
    people = new People(mockSharedProperties, mockGetToken, mockGetTimestamp)

    // Mock fetch globally if needed for future implementations
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('constructor initializes with empty properties and null user_id', () => {
    expect(people.ownProperties).toEqual({})
    expect(people.user_id).toBeNull()
  })

  test('identify sets user_id correctly', () => {
    people.identify('test-user-123')
    expect(people.user_id).toBe('test-user-123')
    // Note: We're not testing the fetch endpoint as it's marked as TODO in the code
  })

  test('deleteUser resets user_id and properties', () => {
    // Set up initial state
    people.user_id = 'test-user-123'
    people.ownProperties = {
      name: 'Test User',
      email: 'test@example.com',
    }

    // Call deleteUser
    people.deleteUser()

    // Check results
    expect(people.user_id).toBeNull()
    expect(people.ownProperties).toEqual({})
  })

  test('setProperties adds properties correctly', () => {
    people.setProperties({
      name: 'Test User',
      email: 'test@example.com',
      age: 30,
    })

    expect(people.ownProperties).toEqual({
      name: 'Test User',
      email: 'test@example.com',
      age: 30,
    })
  })

  test('setProperties validates properties are objects', () => {
    expect(() => {
      people.setProperties('not an object')
    }).toThrow('Properties must be an object')
  })

  test('setProperties ignores reserved properties', () => {
    people.setProperties({
      name: 'Test User',
      distinct_id: 'should-be-ignored',
      event_name: 'also-ignored',
      properties: 'ignored-too',
    })

    expect(people.ownProperties).toEqual({
      name: 'Test User',
    })

    // Reserved properties should not be present
    expect(people.ownProperties.distinct_id).toBeUndefined()
    expect(people.ownProperties.event_name).toBeUndefined()
    expect(people.ownProperties.properties).toBeUndefined()
  })

  test('setPropertiesOnce only sets properties that do not exist', () => {
    // Set initial property
    people.ownProperties = {
      name: 'Initial Name',
    }

    // Try to set name again and add new properties
    people.setPropertiesOnce({
      name: 'New Name',
      email: 'test@example.com',
      age: 30,
    })

    expect(people.ownProperties).toEqual({
      name: 'Initial Name', // Should not change
      email: 'test@example.com', // Should be added
      age: 30, // Should be added
    })
  })

  test('setPropertiesOnce validates properties are objects', () => {
    expect(() => {
      people.setPropertiesOnce('not an object')
    }).toThrow('Properties must be an object')
  })

  test('appendValues adds value to existing property turning it into an array', () => {
    // Set initial string property
    people.ownProperties = {
      tags: 'tag1',
    }

    // Append a value
    people.appendValues('tags', 'tag2')

    expect(people.ownProperties.tags).toEqual(['tag1', 'tag2'])
  })

  test('appendValues adds value to existing array property', () => {
    // Set initial array property
    people.ownProperties = {
      tags: ['tag1', 'tag2'],
    }

    // Append a value
    people.appendValues('tags', 'tag3')

    expect(people.ownProperties.tags).toEqual(['tag1', 'tag2', 'tag3'])
  })

  test('appendValues does nothing if property does not exist', () => {
    people.ownProperties = {}

    people.appendValues('nonexistent', 'value')

    expect(people.ownProperties.nonexistent).toBeUndefined()
  })

  test('appendValues ignores reserved properties', () => {
    people.ownProperties = {
      distinct_id: 'reserved',
    }

    people.appendValues('distinct_id', 'new-value')

    expect(people.ownProperties.distinct_id).toBe('reserved')
  })

  test('appendUniqueValues adds unique value to array property', () => {
    // Set initial array property
    people.ownProperties = {
      tags: ['tag1', 'tag2'],
    }

    // Append a unique value
    people.appendUniqueValues('tags', 'tag3')

    expect(people.ownProperties.tags).toEqual(['tag1', 'tag2', 'tag3'])

    // Try to append a duplicate value
    people.appendUniqueValues('tags', 'tag2')

    // Array should remain unchanged
    expect(people.ownProperties.tags).toEqual(['tag1', 'tag2', 'tag3'])
  })

  test('appendUniqueValues adds unique value to string property', () => {
    // Set initial string property
    people.ownProperties = {
      tag: 'tag1',
    }

    // Append a different value
    people.appendUniqueValues('tag', 'tag2')

    expect(people.ownProperties.tag).toEqual(['tag1', 'tag2'])

    // Try to append the same value
    people.appendUniqueValues('tag', 'tag1')

    // Array should remain unchanged
    expect(people.ownProperties.tag).toEqual(['tag1', 'tag2'])
  })

  test('appendUniqueValues does nothing if property does not exist', () => {
    people.ownProperties = {}

    people.appendUniqueValues('nonexistent', 'value')

    expect(people.ownProperties.nonexistent).toBeUndefined()
  })

  test('increment adds value to existing numerical property', () => {
    // Set initial numerical property
    people.ownProperties = {
      count: 10,
    }

    // Increment it
    people.increment('count', 5)

    expect(people.ownProperties.count).toBe(15)

    // Decrement it
    people.increment('count', -3)

    expect(people.ownProperties.count).toBe(12)
  })

  test('increment does nothing for non-numerical properties', () => {
    people.ownProperties = {
      name: 'Test',
      arrayProp: [1, 2, 3],
    }

    people.increment('name', 5)
    people.increment('arrayProp', 5)

    expect(people.ownProperties.name).toBe('Test')
    expect(people.ownProperties.arrayProp).toEqual([1, 2, 3])
  })

  test('increment ignores reserved properties', () => {
    people.ownProperties = {
      distinct_id: 10,
    }

    people.increment('distinct_id', 5)

    expect(people.ownProperties.distinct_id).toBe(10)
  })
})
