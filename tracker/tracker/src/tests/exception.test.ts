import { describe, expect, test, jest } from '@jest/globals'
import { Type } from '../common/messages.gen.js'
import { getExceptionMessage, getExceptionMessageFromEvent } from '../main/modules/exception.js'
import { defaultUrlSanitizer } from '../main/modules/viewport.js'
import { stringWiper } from '../main/app/sanitizer.js'
import { parse } from 'error-stack-parser-es'

jest.mock('error-stack-parser-es', () => ({ parse: jest.fn(() => [{ lineNumber: 1 }]) }))

const app = { sanitizeURL: defaultUrlSanitizer } as any

describe('getExceptionMessage', () => {
  test('returns message with parsed stack and metadata', () => {
    const error = new Error('boom')
    const metadata = { foo: 'bar' }
    const msg = getExceptionMessage(app, error, [], metadata)
    expect(msg).toEqual([
      Type.JSException,
      'Error',
      'boom',
      JSON.stringify([{ lineNumber: 1 }]),
      JSON.stringify(metadata),
    ])
    expect(parse).toHaveBeenCalledWith(error)
  })

  test('falls back to the provided stack when parsing throws', () => {
    ;(parse as jest.Mock).mockImplementationOnce(() => {
      throw new Error('unparsable')
    })
    const fallback = [{ lineNumber: 7, fileName: 'x.js' }]
    const msg = getExceptionMessage(app, new TypeError('bad'), fallback)
    expect(msg).toEqual([Type.JSException, 'TypeError', 'bad', JSON.stringify(fallback), '{}'])
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
    const msg = getExceptionMessageFromEvent(app, evt) as any
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
    const msg = getExceptionMessageFromEvent(app, evt) as any
    expect(msg).toEqual([
      Type.JSException,
      'Error',
      'Something bad',
      JSON.stringify([{ columnNumber: 3, lineNumber: 2, fileName: 'f.js', functionName: '', source: '' }]),
      '{}',
    ])
  })

  test('splits "Name: message" only on the first colon', () => {
    const evt = new ErrorEvent('error', {
      message: 'Uncaught TypeError: cannot read "x": undefined at a:b',
      filename: 'f.js',
      lineno: 2,
      colno: 3,
    })
    const msg = getExceptionMessageFromEvent(app, evt) as any
    expect(msg[1]).toBe('Uncaught TypeError')
    expect(msg[2]).toBe('cannot read "x": undefined at a:b')
  })

  test('keeps the whole message when nothing follows the colon', () => {
    const evt = new ErrorEvent('error', { message: 'Script error:' })
    const msg = getExceptionMessageFromEvent(app, evt) as any
    expect(msg[1]).toBe('Error')
    expect(msg[2]).toBe('Script error:')
  })

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

  test('handles PromiseRejectionEvent with an Error reason', () => {
    const reason = new RangeError('too far')
    const evt = new DummyPREvent(reason)
    const msg = getExceptionMessageFromEvent(app, evt, context, { m: 1 }) as any
    expect(msg).toEqual([
      Type.JSException,
      'RangeError',
      'too far',
      JSON.stringify([{ lineNumber: 1 }]),
      JSON.stringify({ m: 1 }),
    ])
  })

  test('handles PromiseRejectionEvent with a circular reason', () => {
    const reason: any = { a: 1 }
    reason.self = reason
    const msg = getExceptionMessageFromEvent(app, new DummyPREvent(reason), context) as any
    expect(msg).toEqual([
      Type.JSException,
      'Unhandled Promise Rejection',
      '[object Object]',
      '[]',
      '{}',
    ])
  })

  test('ignores unrelated events', () => {
    expect(getExceptionMessageFromEvent(app, new Event('error') as any, context)).toBeNull()
  })

  test('handles PromiseRejectionEvent with string reason', () => {
    const evt = new DummyPREvent('fail')
    const msg = getExceptionMessageFromEvent(app, evt, context) as any
    expect(msg).toEqual([
      Type.JSException,
      'Unhandled Promise Rejection',
      '"fail"',
      '[]',
      '{}',
    ])
  })
})

describe('page URLs in the stack', () => {
  const pageUrl = 'https://shop.example/reset?token=abc&lang=en'
  const starred = 'https://shop.example/reset?token=***&lang=en'
  const inlineFrame = {
    functionName: 'save',
    fileName: pageUrl,
    lineNumber: 7,
    columnNumber: 9,
    source: `    at save (${pageUrl}:7:9)`,
  }
  const bundleFrame = { fileName: 'https://cdn.example/app.js?token=v1', lineNumber: 1 }
  const stackOf = (msg: any) => JSON.parse(msg[3])

  test('inline script frames go through the url sanitizer, script files do not', () => {
    ;(parse as jest.Mock).mockImplementationOnce(() => [inlineFrame, bundleFrame])
    const msg = getExceptionMessage(app, new Error('boom'), []) as any
    expect(msg[3]).not.toContain('token=abc')
    expect(stackOf(msg)).toEqual([{ ...inlineFrame, fileName: starred, source: '' }, bundleFrame])
  })

  test('the filename of an ErrorEvent goes through the url sanitizer', () => {
    const evt = new ErrorEvent('error', { message: 'nope', filename: pageUrl, lineno: 7, colno: 9 })
    const msg = getExceptionMessageFromEvent(app, evt) as any
    expect(stackOf(msg)[0].fileName).toBe(starred)
  })

  test('privateMode wipes page URLs in the stack', () => {
    ;(parse as jest.Mock).mockImplementationOnce(() => [inlineFrame, bundleFrame])
    const privateApp = { sanitizeURL: stringWiper } as any
    const msg = getExceptionMessage(privateApp, new Error('boom'), []) as any
    expect(stackOf(msg)).toEqual([
      { ...inlineFrame, fileName: stringWiper(pageUrl), source: '' },
      bundleFrame,
    ])
  })
})

describe('getExceptionMessageFromEvent with iframe events', () => {
  test('handles an ErrorEvent and Error created in an iframe realm', () => {
    const frame = document.createElement('iframe')
    document.body.appendChild(frame)
    const w = frame.contentWindow as any
    const event = new w.ErrorEvent('error', { error: new w.Error('frame boom'), message: 'frame boom' })
    const msg = getExceptionMessageFromEvent(app, event, w) as any
    expect(msg?.[0]).toBe(Type.JSException)
    expect(msg?.[1]).toBe('Error')
    expect(msg?.[2]).toBe('frame boom')
    frame.remove()
  })
})
