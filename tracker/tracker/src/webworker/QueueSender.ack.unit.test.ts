/** @jest-environment node */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import QueueSender from './QueueSender.js'

declare const process: { on(event: 'unhandledRejection', listener: (error: unknown) => void): void; removeListener(event: 'unhandledRejection', listener: (error: unknown) => void): void }

const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve() }
const response = (body: any, status = 200) => ({ body, status }) as Response
const createSender = () => {
  const onUnauthorised = jest.fn(), onFailure = jest.fn()
  const sender = new QueueSender('https://synthetic.invalid', onUnauthorised, onFailure, 2, 250)
  sender.authorise('synthetic-token')
  return { sender, onUnauthorised, onFailure }
}

describe('QueueSender bounded acknowledgement disposal', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers() })

  test('reads a real successful stream to EOF without cancellation or decoding', async () => {
    const cancel = jest.fn<() => void>()
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(4096)); controller.close() }, cancel })
    const read = jest.spyOn(body, 'getReader')
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(response(body))
    const { sender } = createSender()
    sender.push(new Uint8Array([1])); await flush()
    expect(read).toHaveBeenCalledTimes(1)
    expect(cancel).not.toHaveBeenCalled()
    expect(sender.getQueueStatus()).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(0)
  })

  test('4096 bytes may close on the next pull without being cancelled', async () => {
    const cancel = jest.fn<() => void>()
    let pulls = 0
    const body = new ReadableStream<Uint8Array>({ pull(controller) {
      if (++pulls === 1) controller.enqueue(new Uint8Array(4096))
      else controller.close()
    }, cancel }, { highWaterMark: 0 })
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(response(body))
    const { sender } = createSender(); sender.push(new Uint8Array([1])); await flush()
    expect(pulls).toBe(2); expect(cancel).not.toHaveBeenCalled()
    expect(sender.getQueueStatus()).toBe(true); expect(jest.getTimerCount()).toBe(0)
  })

  test('stalled response never delays settle or next pump; timeout cancels without retry', async () => {
    const cancel = jest.fn<() => void>()
    const body = new ReadableStream<Uint8Array>({ cancel })
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response(body)).mockResolvedValue(response(null))
    const { sender, onFailure } = createSender()
    sender.push(new Uint8Array([1])); sender.push(new Uint8Array([2])); await flush()
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(sender.getQueueStatus()).toBe(true)
    expect(cancel).not.toHaveBeenCalled()
    await jest.advanceTimersByTimeAsync(4999)
    expect(cancel).not.toHaveBeenCalled()
    await jest.advanceTimersByTimeAsync(1)
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(onFailure).not.toHaveBeenCalled()
    expect(jest.getTimerCount()).toBe(0)
  })

  test('oversize stream is cancelled after the byte cap without draining further chunks', async () => {
    const cancel = jest.fn<() => void>()
    let pulls = 0
    const body = new ReadableStream<Uint8Array>({ pull(controller) { pulls++; controller.enqueue(new Uint8Array(4097)) }, cancel }, { highWaterMark: 0 })
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(response(body))
    const { sender } = createSender()
    sender.push(new Uint8Array([1])); await flush()
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(pulls).toBe(1)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(sender.getQueueStatus()).toBe(true)
    expect(jest.getTimerCount()).toBe(0)
  })

  test.each(['null', 'locked', 'getReader throws', 'read rejects', 'cancel rejects', 'cancel throws', 'releaseLock throws'])('%s does not affect acknowledgement or leak rejection/log data', async kind => {
    const unhandled: unknown[] = []
    const listener = (error: unknown) => { unhandled.push(error) }
    process.on('unhandledRejection', listener)
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const raw = Error('SYNTHETIC_PRIVATE_RESPONSE_ERROR')
    let body: any = null
    if (kind === 'locked') { body = new ReadableStream(); body.getReader() }
    if (kind === 'getReader throws') body = { getReader() { throw raw } }
    if (kind === 'read rejects') body = { getReader: () => ({ read: () => Promise.reject(raw), cancel: () => Promise.resolve(), releaseLock() {} }) }
    if (kind === 'cancel rejects' || kind === 'cancel throws') body = { getReader: () => ({ read: () => Promise.resolve({ done: false, value: new Uint8Array(4097) }), cancel: () => { if (kind === 'cancel throws') throw raw; return Promise.reject(raw) }, releaseLock() {} }) }
    if (kind === 'releaseLock throws') body = { getReader: () => ({ read: () => Promise.resolve({ done: true }), releaseLock() { throw raw } }) }
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(response(body))
    try {
      const { sender } = createSender()
      sender.push(new Uint8Array([1])); await flush(); await jest.advanceTimersByTimeAsync(5000)
      expect(sender.getQueueStatus()).toBe(true)
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(warn).not.toHaveBeenCalled()
      expect(unhandled).toEqual([])
      expect(jest.getTimerCount()).toBe(0)
    } finally { process.removeListener('unhandledRejection', listener) }
  })

  test('timeout handles rejected cancellation while read remains pending', async () => {
    const cancel = jest.fn<() => Promise<void>>().mockRejectedValue(Error('SYNTHETIC_PRIVATE_CANCEL'))
    const body = { getReader: () => ({ read: () => new Promise(() => {}), cancel, releaseLock() { throw Error('pending read') } }) }
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(response(body))
    const { sender } = createSender()
    sender.push(new Uint8Array([1])); await flush(); await jest.advanceTimersByTimeAsync(5000)
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(sender.getQueueStatus()).toBe(true)
    expect(warn).not.toHaveBeenCalled()
    expect(jest.getTimerCount()).toBe(0)
  })

  test.each([204, 302])('successful status %i disposes without waiting or retrying', async status => {
    const read = jest.fn<() => Promise<{ done: boolean }>>().mockResolvedValue({ done: true })
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(response({ getReader: () => ({ read, releaseLock() {} }) }, status))
    const { sender } = createSender(); sender.push(new Uint8Array([1])); await flush()
    expect(read).toHaveBeenCalledTimes(1); expect(fetch).toHaveBeenCalledTimes(1)
    expect(sender.getQueueStatus()).toBe(true); expect(jest.getTimerCount()).toBe(0)
  })

  test.each([401, 500])('error status %i retains cancellation and original status handling', async status => {
    const cancel = jest.fn<() => Promise<void>>().mockRejectedValue(Error('SYNTHETIC_CANCEL_ERROR'))
    const getReader = jest.fn()
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response({ cancel, getReader }, status)).mockResolvedValue(response(null))
    const { sender, onUnauthorised } = createSender(); sender.push(new Uint8Array([1])); await flush()
    expect(cancel).toHaveBeenCalledTimes(1); expect(getReader).not.toHaveBeenCalled()
    if(status===401){expect(onUnauthorised).toHaveBeenCalledTimes(1); expect(fetch).toHaveBeenCalledTimes(1)}
    else { expect(fetch).toHaveBeenCalledTimes(1); await jest.advanceTimersByTimeAsync(250); expect(fetch).toHaveBeenCalledTimes(2) }
  })
})
