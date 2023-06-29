import {
  genResponseByType,
  getStringResponseByType,
  genStringBody,
  genGetDataByUrl,
  genFormattedBody,
  isPureObject,
  isIterable,
  formatByteSize,
  getURL,
} from '../main/modules/Network/utils.js'
import { describe, it, expect, jest } from '@jest/globals'

describe('Network utility function tests', () => {
  it('genResponseByType should handle response types correctly', () => {
    expect(genResponseByType('json', '{"key":"value"}')).toEqual({ key: 'value' })
    expect(genResponseByType('blob', new Blob())).toBe('[object Blob]')
  })

  it('getStringResponseByType should handle response types correctly', () => {
    expect(getStringResponseByType('json', '{"key":"value"}')).toBe('{"key":"value"}')
    expect(getStringResponseByType('json', { key: 'value' })).toBe('{"key":"value"}')
    expect(getStringResponseByType('blob', new Blob())).toBe('[object Blob]')
  })

  it('genStringBody should handle body types correctly', () => {
    expect(genStringBody('{"key":"value"}')).toBe('{"key":"value"}')
    expect(genStringBody(new URLSearchParams('key=value'))).toBe('key=value')
    // Add more cases as needed
  })

  it('genGetDataByUrl should get data from URL', () => {
    expect(genGetDataByUrl('http://localhost/?key=value')).toEqual({ key: 'value' })
    // Add more cases as needed
  })
  it('genGetDataByUrl handles wrong format', () => {
    // @ts-ignore
    expect(genGetDataByUrl('http://localhost/?key=value', '')).toEqual({ key: 'value' })
  })

  it('genFormattedBody should format body correctly', () => {
    const param = new URLSearchParams('key=value&other=test')
    const blob = new Blob([param.toString()], { type: 'text/plain' })
    expect(genFormattedBody('{"key":"value"}')).toEqual({ key: 'value' })
    expect(genFormattedBody('key=value&other=test')).toEqual({ key: 'value', other: 'test' })
    expect(genFormattedBody(param)).toEqual({ key: 'value', other: 'test' })
    expect(genFormattedBody(blob)).toEqual('byte data')
  })

  it('isPureObject should return true for objects', () => {
    expect(isPureObject({})).toBe(true)
    expect(isPureObject([])).toBe(true)
    expect(isPureObject(null)).toBe(false)
    expect(isPureObject(undefined)).toBe(false)
  })

  it('isIterable should return true for iterables', () => {
    expect(isIterable([])).toBe(true)
    expect(isIterable(new Map())).toBe(true)
    expect(isIterable('string')).toBe(true)
    expect(isIterable(undefined)).toBe(false)
  })

  it('formatByteSize should format byte sizes correctly', () => {
    expect(formatByteSize(500)).toBe('500B')
    expect(formatByteSize(1500)).toBe('1.5 KB')
    expect(formatByteSize(1500000)).toBe('1.5 MB')
    expect(formatByteSize(-1)).toBe('')
  })

  it('getURL should get a URL', () => {
    // @ts-ignore
    delete window.location
    // @ts-ignore
    window.location = new URL('https://www.example.com')
    expect(getURL('https://example.com').toString()).toBe('https://example.com/')
    expect(getURL('//example.com').toString()).toBe('https://example.com/')
    expect(getURL('/path').toString()).toBe('https://www.example.com/path')
  })
})
