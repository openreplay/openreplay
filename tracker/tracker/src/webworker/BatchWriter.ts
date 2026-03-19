import type Message from '../common/messages.gen.js'
import * as Messages from '../common/messages.gen.js'
import { ASSET_MESSAGES } from '../common/messages.gen.js'
import type { DataType } from '../common/interaction.js'
import MessageEncoder from './MessageEncoder.gen.js'

const SIZE_BYTES = 3
const MAX_M_SIZE = (1 << (SIZE_BYTES * 8)) - 1

export default class BatchWriter {
  private nextIndex = 0
  private beaconSize = 2 * 1e5 // Default 200kB
  private encoder = new MessageEncoder(this.beaconSize)
  private readonly sizeBuffer = new Uint8Array(SIZE_BYTES)
  private isEmpty = true
  private checkpoints: number[] = []
  private assetMessages: Message[] = []
  private batchFirstIndex = 0
  private batchHeaderTimestamp = 0
  private batchHeaderUrl = ''

  constructor(
    private readonly pageNo: number,
    private timestamp: number,
    private url: string,
    private readonly onBatch: (batch: Uint8Array, skipCompression?: boolean, dataType?: DataType) => void,
    private tabId: string,
    private readonly onOfflineEnd: () => void,
  ) {
    this.prepare()
  }

  private writeType(m: Message): boolean {
    return this.encoder.uint(m[0])
  }
  private writeFields(m: Message): boolean {
    return this.encoder.encode(m)
  }
  private writeSizeAt(size: number, offset: number): void {
    //boolean?
    for (let i = 0; i < SIZE_BYTES; i++) {
      this.sizeBuffer[i] = size >> (i * 8) // BigEndian
    }
    this.encoder.set(this.sizeBuffer, offset)
  }

  private prepare(): void {
    if (!this.encoder.isEmpty) {
      return
    }

    this.checkpoints.length = 0
    this.batchFirstIndex = this.nextIndex
    this.batchHeaderTimestamp = this.timestamp
    this.batchHeaderUrl = this.url

    // MBTODO: move service-messages creation methods to webworker
    const batchMetadata: Messages.BatchMetadata = [
      Messages.Type.BatchMetadata,
      2,
      this.pageNo,
      this.nextIndex,
      this.timestamp,
      this.url,
    ]

    const timestamp: Messages.Timestamp = [Messages.Type.Timestamp, this.timestamp]

    const tabData: Messages.TabData = [Messages.Type.TabData, this.tabId]

    this.writeType(batchMetadata)
    this.writeFields(batchMetadata)
    this.writeWithSize(timestamp as Message)
    this.writeWithSize(tabData as Message)
    this.isEmpty = true
  }

  private writeWithSize(message: Message): boolean {
    const e = this.encoder
    if (!this.writeType(message) || !e.skip(SIZE_BYTES)) {
      // app.debug.log
      return false
    }
    const startOffset = e.getCurrentOffset()
    const wasWritten = this.writeFields(message)
    if (wasWritten) {
      const endOffset = e.getCurrentOffset()
      const size = endOffset - startOffset
      if (size > MAX_M_SIZE) {
        console.warn('OpenReplay: max message size overflow.')
        return false
      }
      this.writeSizeAt(size, startOffset - SIZE_BYTES)

      e.checkpoint()
      this.checkpoints.push(e.getCurrentOffset())
      this.isEmpty = this.isEmpty && message[0] === Messages.Type.Timestamp
      this.nextIndex++
    }
    // app.debug.log
    return wasWritten
  }

  private beaconSizeLimit = 1e6
  setBeaconSizeLimit(limit: number) {
    this.beaconSizeLimit = limit
  }

  writeMessage(message: Message) {
    // @ts-ignore
    if (message[0] === -1) {
      this.finaliseBatch()
      return this.onOfflineEnd()
    }
    if (message[0] === Messages.Type.Timestamp) {
      this.timestamp = message[1] // .timestamp
    }
    if (message[0] === Messages.Type.SetPageLocation) {
      this.url = message[1] // .url
    }
    if (ASSET_MESSAGES.has(message[0])) {
      this.assetMessages.push(message)
      this.nextIndex++
      return
    }
    if (this.writeWithSize(message)) {
      return
    }
    // buffer overflow, send already written data first then try again
    this.finaliseBatch()
    if (this.writeWithSize(message)) {
      return
    }
    // buffer is too small. Creating one with maximal capacity for this message only
    this.encoder = new MessageEncoder(this.beaconSizeLimit)
    this.prepare()
    if (!this.writeWithSize(message)) {
      console.warn('OpenReplay: beacon size overflow. Skipping large message.', message, this)
    } else {
      this.finaliseBatch()
    }
    // reset encoder to normal size
    this.encoder = new MessageEncoder(this.beaconSize)
    this.prepare()
  }

  finaliseBatch(skipCompression = false) {
    const hasRegular = !this.isEmpty
    const hasAssets = this.assetMessages.length > 0

    if (!hasRegular && !hasAssets) {
      return
    }

    if (hasRegular) {
      const batch = this.encoder.flush()
      this.onBatch(batch, skipCompression, 'player')
    } else {
      this.encoder.reset()
    }

    if (hasAssets) {
      const assetBatch = this.buildAssetBatch()
      this.onBatch(assetBatch, skipCompression, 'assets')
      this.assetMessages.length = 0
    }

    this.prepare()
  }


  private buildAssetBatch(): Uint8Array {
    const encoder = new MessageEncoder(this.beaconSizeLimit)
    const sizeBuffer = new Uint8Array(SIZE_BYTES)

    const writeWithSize = (msg: Message): void => {
      encoder.uint(msg[0])
      encoder.skip(SIZE_BYTES)
      const startOffset = encoder.getCurrentOffset()
      encoder.encode(msg)
      const endOffset = encoder.getCurrentOffset()
      const size = endOffset - startOffset
      for (let i = 0; i < SIZE_BYTES; i++) {
        sizeBuffer[i] = size >> (i * 8)
      }
      encoder.set(sizeBuffer, startOffset - SIZE_BYTES)
      encoder.checkpoint()
    }

    // BatchMetadata with version=3 (no size prefix)
    const batchMetadata: Messages.BatchMetadata = [
      Messages.Type.BatchMetadata,
      3,
      this.pageNo,
      this.batchFirstIndex,
      this.batchHeaderTimestamp,
      this.batchHeaderUrl,
    ]
    encoder.uint(batchMetadata[0])
    encoder.encode(batchMetadata as Message)

    // Timestamp + TabData header (with size prefix)
    writeWithSize([Messages.Type.Timestamp, this.batchHeaderTimestamp] as Message)
    writeWithSize([Messages.Type.TabData, this.tabId] as Message)

    // Asset messages (preserving original order)
    for (const msg of this.assetMessages) {
      writeWithSize(msg)
    }

    return encoder.flush()
  }

  clean() {
    this.encoder.reset()
    this.checkpoints.length = 0
    this.assetMessages.length = 0
  }
}
