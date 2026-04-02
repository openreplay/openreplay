// @ts-nocheck
import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals'

// Mock the generated messages module since its .js is ESM-only
jest.mock('../common/messages.gen', () => {
  const Type = {
    Timestamp: 0,
    SetViewportSize: 5,
    MouseMove: 20,
    SetPageVisibility: 55,
    SetNodeAttributeURLBased: 60,
    SetCSSDataURLBased: 61,
    AdoptedSSReplaceURLBased: 71,
    AdoptedSSInsertRuleURLBased: 73,
    BatchMetadata: 81,
    TabData: 118,
    SetPageLocation: 122,
  }
  return {
    __esModule: true,
    default: null,
    Type,
    ASSET_MESSAGES: new Set([60, 61, 71, 73]),
  }
})

import BatchWriter from '../webworker/BatchWriter.js'
import * as Messages from '../common/messages.gen.js'
import Message from '../common/messages.gen.js'

const MType = {
  Timestamp: 0,
  BatchMetadata: 81,
  TabData: 118,
  MouseMove: 20,
  SetPageLocation: 122,
  SetNodeAttributeURLBased: 60,
  SetCSSDataURLBased: 61,
} as const

describe('BatchWriter', () => {
  let onBatch: jest.Mock
  let onOfflineEnd: jest.Mock
  let onLocalSave: jest.Mock

  beforeEach(() => {
    onBatch = jest.fn()
    onOfflineEnd = jest.fn()
    onLocalSave = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  function createWriter(opts: { protocolVersion?: number; localDebug?: boolean } = {}) {
    const writer = new BatchWriter(
      1,
      1000,
      'http://test.com',
      onBatch,
      'tab-1',
      onOfflineEnd,
      opts.localDebug ?? false,
      onLocalSave,
    )
    if (opts.protocolVersion) {
      writer.setProtocolVersion(opts.protocolVersion)
    }
    return writer
  }

  describe('constructor and internals', () => {
    test('constructor initializes BatchWriter instance', () => {
      const writer = createWriter()
      expect(writer['pageNo']).toBe(1)
      expect(writer['timestamp']).toBe(1000)
      expect(writer['url']).toBe('http://test.com')
      expect(writer['onBatch']).toBe(onBatch)
      expect(writer['nextIndex']).toBe(0)
      expect(writer['prepared']).toBe(false)
      expect(writer['beaconSize']).toBe(200000)
      expect(writer['encoder']).toBeDefined()
      expect(writer['sizeBuffer']).toHaveLength(3)
      expect(writer['isEmpty']).toBe(true)
    })

    test('writeType writes the type of the message', () => {
      const writer = createWriter()
      const message = [Messages.Type.BatchMetadata, 1, 2, 3, 4, 'example.com']
      const result = writer['writeType'](message as Message)
      expect(result).toBe(true)
    })

    test('writeFields encodes the message fields', () => {
      const writer = createWriter()
      const message = [Messages.Type.BatchMetadata, 1, 2, 3, 4, 'example.com']
      const result = writer['writeFields'](message as Message)
      expect(result).toBe(true)
    })

    test('writeSizeAt writes the size at the given offset', () => {
      const writer = createWriter()
      writer['writeSizeAt'](100, 0)
      expect(writer['sizeBuffer']).toEqual(new Uint8Array([100, 0, 0]))
      expect(writer['encoder']['data'].slice(0, 3)).toEqual(new Uint8Array([100, 0, 0]))
    })

    test('writeWithSize writes the message with its size', () => {
      const writer = createWriter()
      const message = [Messages.Type.BatchMetadata, 1, 2, 3, 4, 'example.com']
      const result = writer['writeWithSize'](message as Message)
      expect(result).toBe(true)
    })

    test('setBeaconSizeLimit sets the beacon size limit', () => {
      const writer = createWriter()
      writer.setBeaconSizeLimit(500000)
      expect(writer['beaconSizeLimit']).toBe(500000)
    })
  })

  describe('lazy prepare - no batch on empty', () => {
    test('finaliseBatch with no messages does nothing', () => {
      const writer = createWriter()
      writer.finaliseBatch()
      expect(onBatch).not.toHaveBeenCalled()
    })

    test('finaliseBatch after multiple calls with no messages still does nothing', () => {
      const writer = createWriter()
      writer.finaliseBatch()
      writer.finaliseBatch()
      writer.finaliseBatch()
      expect(onBatch).not.toHaveBeenCalled()
    })

    test('prepare is lazy - not called until first writeMessage', () => {
      const writer = createWriter()
      expect(writer['prepared']).toBe(false)
      writer.writeMessage([MType.MouseMove, 100, 200] as Message)
      expect(writer['prepared']).toBe(true)
    })

    test('writeMessage triggers lazy prepare and increments nextIndex', () => {
      const writer = createWriter()
      writer.writeMessage([MType.MouseMove, 100, 200] as Message)
      expect(writer['prepared']).toBe(true)
      // nextIndex should be 1: prepare only writes BatchMetadata (no index), + 1 for the message
      expect(writer['nextIndex']).toBe(1)
    })

    test('timestamp-only messages do not trigger a batch send', () => {
      const writer = createWriter()
      writer.writeMessage([MType.Timestamp, 2000])
      writer.finaliseBatch()
      expect(onBatch).not.toHaveBeenCalled()
    })
  })

  describe('single BatchMetadata per batch', () => {
    test('writing a real message and finalising produces exactly one batch', () => {
      const writer = createWriter()
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(1)
      const [batch, , dataType] = onBatch.mock.calls[0]
      expect(batch).toBeInstanceOf(Uint8Array)
      expect(dataType).toBe('player')
    })

    test('consecutive finaliseBatch after flush does not produce extra batches', () => {
      const writer = createWriter()
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.finaliseBatch()
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(1)
    })

    test('batch binary starts with BatchMetadata type marker', () => {
      const writer = createWriter()
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.finaliseBatch()
      const batch: Uint8Array = onBatch.mock.calls[0][0]
      expect(batch[0]).toBe(MType.BatchMetadata)
    })

    test('batch contains exactly one BatchMetadata (single onBatch call)', () => {
      const writer = createWriter()
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.writeMessage([MType.MouseMove, 110, 210])
      writer.writeMessage([MType.MouseMove, 120, 220])
      writer.finaliseBatch()

      const batch: Uint8Array = onBatch.mock.calls[0][0]
      expect(batch[0]).toBe(MType.BatchMetadata)
      expect(onBatch).toHaveBeenCalledTimes(1)
    })

    test('finaliseBatch flushes the encoder and calls onBatch', () => {
      const writer = createWriter()
      writer.writeMessage([MType.MouseMove, 100, 200] as Message)
      const flushSpy = jest.spyOn(writer['encoder'], 'flush')
      writer.finaliseBatch()
      expect(flushSpy).toHaveBeenCalled()
      expect(onBatch).toHaveBeenCalled()
    })

    test('finaliseBatch does nothing when no messages written', () => {
      const writer = createWriter()
      writer.finaliseBatch()
      expect(onBatch).not.toHaveBeenCalled()
    })
  })

  describe('protocol v2: asset message separation', () => {
    test('asset messages produce a separate batch with dataType=assets', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'class', 'value', 'http://base.com'])
      writer.finaliseBatch()

      expect(onBatch).toHaveBeenCalledTimes(2)
      expect(onBatch.mock.calls[0][2]).toBe('player')
      expect(onBatch.mock.calls[1][2]).toBe('assets')
    })

    test('asset-only batch (no regular messages) sends only assets', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'src', 'img.png', 'http://base.com'])
      writer.writeMessage([MType.SetCSSDataURLBased, 2, 'background', 'http://base.com'])
      writer.finaliseBatch()

      expect(onBatch).toHaveBeenCalledTimes(1)
      expect(onBatch.mock.calls[0][2]).toBe('assets')
    })

    test('asset batch starts with BatchMetadata version=3', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'src', 'img.png', 'http://base.com'])
      writer.finaliseBatch()

      const assetBatch: Uint8Array = onBatch.mock.calls[0][0]
      expect(assetBatch[0]).toBe(MType.BatchMetadata)
      expect(assetBatch[1]).toBe(3)
    })

    test('regular batch has version=2 when protocolVersion=2', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.finaliseBatch()

      const batch: Uint8Array = onBatch.mock.calls[0][0]
      expect(batch[0]).toBe(MType.BatchMetadata)
      expect(batch[1]).toBe(2)
    })

    test('no regular messages + no asset messages = no batch', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.finaliseBatch()
      expect(onBatch).not.toHaveBeenCalled()
    })

    test('asset messages are cleared after finaliseBatch', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'src', 'img.png', 'http://base.com'])
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(1)

      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(1)
    })
  })

  describe('protocol v1: asset messages are regular', () => {
    test('asset-type messages go into regular batch in v1', () => {
      const writer = createWriter({ protocolVersion: 1 })
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'src', 'img.png', 'http://base.com'])
      writer.finaliseBatch()

      expect(onBatch).toHaveBeenCalledTimes(1)
      expect(onBatch.mock.calls[0][2]).toBe('player')
    })
  })

  describe('multiple batches maintain correct state', () => {
    test('second batch after first finalize works correctly', () => {
      const writer = createWriter()
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.finaliseBatch()

      writer.writeMessage([MType.MouseMove, 110, 210])
      writer.finaliseBatch()

      expect(onBatch).toHaveBeenCalledTimes(2)
      for (let i = 0; i < 2; i++) {
        const batch: Uint8Array = onBatch.mock.calls[i][0]
        expect(batch[0]).toBe(MType.BatchMetadata)
        expect(onBatch.mock.calls[i][2]).toBe('player')
      }
    })

    test('interleaved regular and asset batches across multiple finalizes', () => {
      const writer = createWriter({ protocolVersion: 2 })

      // First batch: regular + assets
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'src', 'a.png', 'http://b.com'])
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(2)

      // Second batch: only regular
      writer.writeMessage([MType.MouseMove, 120, 220])
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(3)
      expect(onBatch.mock.calls[2][2]).toBe('player')

      // Third batch: only assets
      writer.writeMessage([MType.SetCSSDataURLBased, 2, 'bg', 'http://c.com'])
      writer.finaliseBatch()
      expect(onBatch).toHaveBeenCalledTimes(4)
      expect(onBatch.mock.calls[3][2]).toBe('assets')
    })
  })

  describe('clean()', () => {
    test('clean resets all state, next finalize produces nothing', () => {
      const writer = createWriter({ protocolVersion: 2 })
      writer.writeMessage([MType.MouseMove, 100, 200])
      writer.writeMessage([MType.SetNodeAttributeURLBased, 1, 'src', 'a.png', 'http://b.com'])
      writer.clean()
      writer.finaliseBatch()
      expect(onBatch).not.toHaveBeenCalled()
    })

    test('clean resets the encoder', () => {
      const writer = createWriter()
      const cleanSpy = jest.spyOn(writer['encoder'], 'reset')
      writer.clean()
      expect(cleanSpy).toHaveBeenCalled()
      expect(writer['prepared']).toBe(false)
    })
  })
})
