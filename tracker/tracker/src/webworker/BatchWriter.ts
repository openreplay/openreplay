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
  private prepared = false
  private checkpoints: number[] = []
  private assetMessages: Message[] = []
  private firstAssetIndex = 0
  private protocolVersion = 1

  constructor(
    private readonly pageNo: number,
    private timestamp: number,
    private url: string,
    private readonly onBatch: (batch: Uint8Array, skipCompression?: boolean, dataType?: DataType) => void,
    private tabId: string,
    private readonly onOfflineEnd: () => void,
    private readonly localDebug = false,
    private readonly onLocalSave?: (name: string, batch: Uint8Array) => void,
  ) {}

  private writeType(m: Message): boolean {
    return this.encoder.uint(m[0])
  }
  private writeFields(m: Message): boolean {
    return this.encoder.encode(m)
  }
  private writeSizeAt(size: number, offset: number): void {
    for (let i = 0; i < SIZE_BYTES; i++) {
      this.sizeBuffer[i] = size >> (i * 8)
    }
    this.encoder.set(this.sizeBuffer, offset)
  }

  /** Write BatchMetadata header into encoder.
   *  Called lazily — only when the first real message needs to be written.
   *  Timestamp + TabData come from _nCommit with each commit, not from here. */
  private prepare(): void {
    if (this.prepared) {
      return
    }
    this.prepared = true

    this.checkpoints.length = 0

    const batchMetadata: Messages.BatchMetadata = [
      Messages.Type.BatchMetadata,
      this.protocolVersion === 2 ? 2 : 1,
      this.pageNo,
      this.nextIndex,
      this.timestamp,
      this.url,
    ]

    this.writeType(batchMetadata)
    this.writeFields(batchMetadata)
    this.isEmpty = true
  }

  private writeWithSize(message: Message): boolean {
    const e = this.encoder
    if (!this.writeType(message) || !e.skip(SIZE_BYTES)) {
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
    return wasWritten
  }

  private beaconSizeLimit = 1e6
  setBeaconSizeLimit(limit: number) {
    this.beaconSizeLimit = limit
  }

  setProtocolVersion(version: number) {
    this.protocolVersion = version
  }

  writeMessage(message: Message) {
    // @ts-ignore
    if (message[0] === -1) {
      this.finaliseBatch()
      return this.onOfflineEnd()
    }
    if (message[0] === Messages.Type.Timestamp) {
      this.timestamp = message[1]
    }
    if (message[0] === Messages.Type.SetPageLocation) {
      this.url = message[1]
    }
    if (this.protocolVersion === 2 && ASSET_MESSAGES.has(message[0])) {
      if (this.assetMessages.length === 0) {
        this.firstAssetIndex = this.nextIndex
      }
      this.assetMessages.push(message)
      this.nextIndex++
      return
    }
    // Lazily write batch header on first real message
    this.prepare()
    if (this.writeWithSize(message)) {
      return
    }
    // buffer overflow, send already written data first then try again
    this.finaliseBatch()
    this.prepare()
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
  }

  finaliseBatch(skipCompression = false) {
    const hasRegular = this.prepared && !this.isEmpty
    const hasAssets = this.assetMessages.length > 0

    if (!hasRegular && !hasAssets) {
      return
    }

    // Capture header info for asset batch before flushing
    const assetHeaderTimestamp = this.timestamp
    const assetHeaderUrl = this.url
    const assetFirstIndex = this.firstAssetIndex

    if (hasRegular) {
      const batch = this.encoder.flush()
      if (this.localDebug && this.onLocalSave) {
        this.onLocalSave(`${Date.now()}-mob`, batch.slice())
      }
      this.onBatch(batch, skipCompression, 'player')
    } else {
      this.encoder.reset()
    }

    if (hasAssets) {
      const assetBatch = this.buildAssetBatch(assetFirstIndex, assetHeaderTimestamp, assetHeaderUrl)
      if (this.localDebug && this.onLocalSave) {
        this.onLocalSave(`assets-${Date.now()}`, assetBatch.slice())
      }
      this.onBatch(assetBatch, skipCompression, 'assets')
      this.assetMessages.length = 0
    }

    this.prepared = false
  }


  private buildAssetBatch(firstIndex: number, headerTimestamp: number, headerUrl: string): Uint8Array {
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

    // BatchMetadata with version=3 for asset batches (no size prefix)
    const batchMetadata: Messages.BatchMetadata = [
      Messages.Type.BatchMetadata,
      3,
      this.pageNo,
      firstIndex,
      headerTimestamp,
      headerUrl,
    ]
    encoder.uint(batchMetadata[0])
    encoder.encode(batchMetadata as Message)

    // Timestamp + TabData header (with size prefix)
    writeWithSize([Messages.Type.Timestamp, headerTimestamp] as Message)
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
    this.prepared = false
  }
}
