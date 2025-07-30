import { describe, expect, test, jest } from '@jest/globals'
import { Type } from '../common/messages.gen.js'
import { getExceptionMessage, getExceptionMessageFromEvent } from '../main/modules/exception.js'
import { parse } from 'error-stack-parser-es'

jest.mock('error-stack-parser-es', () => ({ parse: jest.fn(() => [{ lineNumber: 1 }]) }))

describe('getExceptionMessage', () => {
  test('returns message with parsed stack and metadata', () => {
    const error = new Error('boom')
    const metadata = { foo: 'bar' }
    const msg = getExceptionMessage(error, [], metadata)
    expect(msg).toEqual([
      Type.JSException,
      'Error',
      'boom',
      JSON.stringify([{ lineNumber: 1 }]),
      JSON.stringify(metadata),
    ])
    expect(parse).toHaveBeenCalledWith(error)
  })
})

describe('getExceptionMessageFromEvent', () => {
  test('handles ErrorEvent with error object', () => {
    const error = new Error('oops')
    const evt = new ErrorEvent('error', {
      error,
      message: error.message,
      filename: 'f.js',
      lineno: 1,
      colno: 1,
    })
    const msg = getExceptionMessageFromEvent(evt) as any
    expect(msg).toEqual([
      Type.JSException,
      'Error',
      'oops',
      JSON.stringify([{ lineNumber: 1 }]),
      '{}',
    ])
  })

  test('handles ErrorEvent without Error object', () => {
    const evt = new ErrorEvent('error', {
      message: 'Something bad',
      filename: 'f.js',
      lineno: 2,
      colno: 3,
    })
    const msg = getExceptionMessageFromEvent(evt) as any
    expect(msg).toEqual([
      Type.JSException,
      'Error',
      'Something bad',
      JSON.stringify([{ columnNumber: 3, lineNumber: 2, fileName: 'f.js', functionName: '', source: '' }]),
      '{}',
    ])
  })

  test('handles PromiseRejectionEvent with string reason', () => {
    class DummyPREvent extends Event {
      reason: any
      promise: Promise<any>
      constructor(reason: any) {
        super('unhandledrejection')
        this.reason = reason
        this.promise = Promise.resolve()
      }
    }
    const context = { PromiseRejectionEvent: DummyPREvent } as any
    const evt = new DummyPREvent('fail')
    const msg = getExceptionMessageFromEvent(evt, context) as any
    expect(msg).toEqual([
      Type.JSException,
      'Unhandled Promise Rejection',
      '"fail"',
      '[]',
      '{}',
    ])
  })
})
