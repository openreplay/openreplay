import BatchWriter from './BatchWriter'
import * as Messages from '../common/messages.gen.js'
import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals'
import Message from '../common/messages.gen.js'

describe('BatchWriter', () => {
  let onBatchMock: (b: Uint8Array) => void
  let batchWriter: BatchWriter

  beforeEach(() => {
    onBatchMock = jest.fn()
    batchWriter = new BatchWriter(1, 123456789, 'example.com', onBatchMock, '123', () => null)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('constructor initializes BatchWriter instance', () => {
    expect(batchWriter['pageNo']).toBe(1)
    expect(batchWriter['timestamp']).toBe(123456789)
    expect(batchWriter['url']).toBe('example.com')
    expect(batchWriter['onBatch']).toBe(onBatchMock)
    // we add tab id as first in the batch
    expect(batchWriter['nextIndex']).toBe(1)
    expect(batchWriter['beaconSize']).toBe(200000)
    expect(batchWriter['encoder']).toBeDefined()
    expect(batchWriter['sizeBuffer']).toHaveLength(3)
    expect(batchWriter['isEmpty']).toBe(true)
  })

  test('writeType writes the type of the message', () => {
    // @ts-ignore
    const message = [Messages.Type.BatchMetadata, 1, 2, 3, 4, 'example.com']
    const result = batchWriter['writeType'](message as Message)
    expect(result).toBe(true)
  })

  test('writeFields encodes the message fields', () => {
    // @ts-ignore
    const message = [Messages.Type.BatchMetadata, 1, 2, 3, 4, 'example.com']
    const result = batchWriter['writeFields'](message as Message)
    expect(result).toBe(true)
  })

  test('writeSizeAt writes the size at the given offset', () => {
    batchWriter['writeSizeAt'](100, 0)
    expect(batchWriter['sizeBuffer']).toEqual(new Uint8Array([100, 0, 0]))
    expect(batchWriter['encoder']['data'].slice(0, 3)).toEqual(new Uint8Array([100, 0, 0]))
  })

  test('prepare prepares the BatchWriter for writing', () => {
    // TODO
  })

  test('writeWithSize writes the message with its size', () => {
    // @ts-ignore
    const message = [Messages.Type.BatchMetadata, 1, 2, 3, 4, 'example.com']
    const result = batchWriter['writeWithSize'](message as Message)
    expect(result).toBe(true)
  })

  test('setBeaconSizeLimit sets the beacon size limit', () => {
    batchWriter['setBeaconSizeLimit'](500000)
    expect(batchWriter['beaconSizeLimit']).toBe(500000)
  })

  test('writeMessage writes the given message', () => {
    // @ts-ignore
    const message = [Messages.Type.Timestamp, 987654321]
    // @ts-ignore
    batchWriter['writeWithSize'] = jest.fn().mockReturnValue(true)
    batchWriter['writeMessage'](message as Message)
    expect(batchWriter['writeWithSize']).toHaveBeenCalledWith(message)
  })

  test('finaliseBatch flushes the encoder and calls onBatch', () => {
    const flushSpy = jest.spyOn(batchWriter['encoder'], 'flush')
    batchWriter['isEmpty'] = false
    batchWriter['finaliseBatch']()
    expect(flushSpy).toHaveBeenCalled()
    expect(onBatchMock).toHaveBeenCalled()
  })

  test('clean resets the encoder', () => {
    const cleanSpy = jest.spyOn(batchWriter['encoder'], 'reset')
    batchWriter['clean']()
    expect(cleanSpy).toHaveBeenCalled()
  })
})
