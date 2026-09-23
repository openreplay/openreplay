// @ts-nocheck
import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals'

// CAN_COMPRESS is read once at module load, so the stub has to exist before the import.
globalThis.CompressionStream = class {}
globalThis.fetch = () => Promise.resolve({ status: 200 })
const QueueSender = require('../webworker/QueueSender.js').default

const THRESHOLD = 100
const big = (n = 1000) => new Uint8Array(n).fill(7)
const small = () => new Uint8Array(10)
const GZIPPED = new Uint8Array([0x1f, 0x8b, 1, 2, 3])

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

let gzip: jest.SpiedFunction<any>
let pending: Array<{ resolve: (b: Uint8Array) => void; reject: (e: Error) => void }>
let fetchMock: jest.SpiedFunction<typeof fetch>
let fetchGates: Array<() => void>

beforeEach(() => {
  pending = []
  gzip = jest
    .spyOn(QueueSender.prototype, 'gzip')
    .mockImplementation(() => new Promise((resolve, reject) => pending.push({ resolve, reject })))
  fetchGates = []
  fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(
    () => new Promise((resolve) => fetchGates.push(() => resolve({ status: 200 }))),
  )
})
afterEach(() => {
  jest.restoreAllMocks()
})

function sender() {
  const s = new QueueSender('BASE', () => {}, () => {}, 10, 250, 3, THRESHOLD)
  s.authorise('tok')
  return s
}
const call = (n: number) => ({
  url: String(fetchMock.mock.calls[n][0]),
  headers: fetchMock.mock.calls[n][1].headers,
  body: fetchMock.mock.calls[n][1].body as Uint8Array,
})
const seqOf = (n: number) => Number(call(n).url.split('batch=')[1].split('_')[1])
async function landFetch() {
  fetchGates.shift()?.()
  await flush()
}

describe('QueueSender gzip path', () => {
  test('only batches above the threshold are compressed, sent with Content-Encoding: gzip', async () => {
    const s = sender()
    s.push(new Uint8Array(THRESHOLD))
    expect(gzip).not.toHaveBeenCalled()
    expect(call(0).headers['Content-Encoding']).toBeUndefined()
    await landFetch()

    s.push(big())
    expect(gzip).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1) // waits for the compressed bytes
    pending[0].resolve(GZIPPED)
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(call(1).headers['Content-Encoding']).toBe('gzip')
    expect(call(1).body).toBe(GZIPPED)
    expect(call(1).url).toContain(`_${GZIPPED.length}_`)
  })

  test('setCompressionThreshold moves the cut-off', () => {
    const s = sender()
    s.setCompressionThreshold(5000)
    s.push(big())
    expect(gzip).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('a gzip failure falls back to the raw bytes', async () => {
    const s = sender()
    const batch = big()
    s.push(batch)
    pending[0].reject(new Error('nope'))
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(call(0).headers['Content-Encoding']).toBeUndefined()
    expect(call(0).body).toBe(batch)
  })

  test('a raw (closing) batch cannot overtake a queued one that is being compressed', async () => {
    const s = sender()
    s.push(small(), 'visual', 1) // #1 in flight
    s.push(big(), 'player') // #2 will need gzip
    s.push(small(), 'devtools', undefined, true) // #3 raw
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await landFetch() // #1 lands → #2 starts compressing
    expect(gzip).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1) // #3 still waits behind #2's gzip
    pending[0].resolve(GZIPPED)
    await flush()
    await landFetch()
    expect([0, 1, 2].map(seqOf)).toEqual([1, 2, 3])
    expect(call(1).headers['Content-Encoding']).toBe('gzip')
  })

  test('flushAll with the head mid-gzip sends it raw first, and the late gzip result is dropped', async () => {
    const s = sender()
    const head = big()
    s.push(head, 'visual', 1) // compressing
    s.push(small(), 'player')
    s.push(small(), 'assets')
    expect(fetchMock).not.toHaveBeenCalled()

    s.flushAll()
    expect([0, 1, 2].map(seqOf)).toEqual([1, 2, 3])
    expect(call(0).body).toBe(head)
    expect(call(0).headers['Content-Encoding']).toBeUndefined()
    expect(call(0).url).toContain('&split=1')

    pending[0].resolve(GZIPPED) // superseded attempt finishing late
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  test('a late gzip failure after flushAll does not resend either', async () => {
    const s = sender()
    s.push(big())
    s.flushAll()
    pending[0].reject(new Error('late'))
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
