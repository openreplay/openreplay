import type Message from '../common/messages.gen.js'
import * as Messages from '../common/messages.gen.js'
import { ASSET_MESSAGES, DEVTOOLS_MESSAGES, ANALYTICS_MESSAGES } from '../common/messages.gen.js'
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
  private devtoolsMessages: Message[] = []
  private analyticsMessages: Message[] = []
  private firstAssetIndex = 0
  private firstAssetTimestamp = 0
  private firstDevtoolsIndex = 0
  private firstDevtoolsTimestamp = 0
  private firstAnalyticsIndex = 0
  private firstAnalyticsTimestamp = 0
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
    if (this.protocolVersion === 2) {
      if (ASSET_MESSAGES.has(message[0])) {
        if (this.assetMessages.length === 0) {
          this.firstAssetIndex = this.nextIndex
          this.firstAssetTimestamp = this.timestamp
        }
        this.assetMessages.push(message)
        this.nextIndex++
        return
      }
      if (DEVTOOLS_MESSAGES.has(message[0])) {
        if (this.devtoolsMessages.length === 0) {
          this.firstDevtoolsIndex = this.nextIndex
          this.firstDevtoolsTimestamp = this.timestamp
        }
        this.devtoolsMessages.push(message)
        this.nextIndex++
        return
      }
      if (ANALYTICS_MESSAGES.has(message[0])) {
        if (this.analyticsMessages.length === 0) {
          this.firstAnalyticsIndex = this.nextIndex
          this.firstAnalyticsTimestamp = this.timestamp
        }
        this.analyticsMessages.push(message)
        this.nextIndex++
        return
      }
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
    const hasDevtools = this.devtoolsMessages.length > 0
    const hasAnalytics = this.analyticsMessages.length > 0

    if (!hasRegular && !hasAssets && !hasDevtools && !hasAnalytics) {
      return
    }

    const headerUrl = this.url

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
      const assetBatch = this.buildSeparateBatch(3, this.firstAssetIndex, this.firstAssetTimestamp, headerUrl, this.assetMessages)
      if (this.localDebug && this.onLocalSave) {
        this.onLocalSave(`assets-${Date.now()}`, assetBatch.slice())
      }
      this.onBatch(assetBatch, skipCompression, 'assets')
      this.assetMessages.length = 0
    }

    if (hasDevtools) {
      const devtoolsBatch = this.buildSeparateBatch(4, this.firstDevtoolsIndex, this.firstDevtoolsTimestamp, headerUrl, this.devtoolsMessages)
      if (this.localDebug && this.onLocalSave) {
        this.onLocalSave(`devtools-${Date.now()}`, devtoolsBatch.slice())
      }
      this.onBatch(devtoolsBatch, skipCompression, 'devtools')
      this.devtoolsMessages.length = 0
    }

    if (hasAnalytics) {
      const analyticsBatch = this.buildSeparateBatch(5, this.firstAnalyticsIndex, this.firstAnalyticsTimestamp, headerUrl, this.analyticsMessages)
      if (this.localDebug && this.onLocalSave) {
        this.onLocalSave(`analytics-${Date.now()}`, analyticsBatch.slice())
      }
      this.onBatch(analyticsBatch, skipCompression, 'analytics')
      this.analyticsMessages.length = 0
    }

    this.prepared = false
  }


  private buildSeparateBatch(version: number, firstIndex: number, headerTimestamp: number, headerUrl: string, messages: Message[]): Uint8Array {
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

    const batchMetadata: Messages.BatchMetadata = [
      Messages.Type.BatchMetadata,
      version,
      this.pageNo,
      firstIndex,
      headerTimestamp,
      headerUrl,
    ]
    encoder.uint(batchMetadata[0])
    encoder.encode(batchMetadata as Message)

    writeWithSize([Messages.Type.Timestamp, headerTimestamp] as Message)
    writeWithSize([Messages.Type.TabData, this.tabId] as Message)

    for (const msg of messages) {
      writeWithSize(msg)
    }

    return encoder.flush()
  }

  clean() {
    this.encoder.reset()
    this.checkpoints.length = 0
    this.assetMessages.length = 0
    this.devtoolsMessages.length = 0
    this.analyticsMessages.length = 0
    this.prepared = false
  }
}
