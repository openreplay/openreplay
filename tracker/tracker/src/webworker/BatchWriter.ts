import type Message from '../common/messages.gen.js'
import * as Messages from '../common/messages.gen.js'
import { ASSET_MESSAGES, DEVTOOLS_MESSAGES, ANALYTICS_MESSAGES } from '../common/messages.gen.js'
import type { DataType } from '../common/interaction.js'
import BatchBuilder, { BatchContext } from './BatchBuilder.js'

const ASSETS_VERSION = 3
const DEVTOOLS_VERSION = 4
const ANALYTICS_VERSION = 5

export default class BatchWriter {
  private nextIndex = 0
  private beaconSize = 2 * 1e5 // 200kB soft trigger
  private beaconSizeLimit = 1e6 // hard cap (set per-session by tracker)
  private playerBuilder: BatchBuilder
  private assetBuilder: BatchBuilder
  private devtoolsBuilder: BatchBuilder
  private analyticsBuilder: BatchBuilder
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
  ) {
    this.playerBuilder = new BatchBuilder(this.beaconSize, this.playerVersion(), 'player')
    this.assetBuilder = new BatchBuilder(this.beaconSize, ASSETS_VERSION, 'assets')
    this.devtoolsBuilder = new BatchBuilder(this.beaconSize, DEVTOOLS_VERSION, 'devtools')
    this.analyticsBuilder = new BatchBuilder(this.beaconSize, ANALYTICS_VERSION, 'analytics')
  }

  /** BatchMetadata.version field for the player stream: 2 for protocol v2, else 1. */
  private playerVersion(): number {
    return this.protocolVersion === 2 ? 2 : 1
  }

  private currentCtx(): BatchContext {
    return {
      pageNo: this.pageNo,
      index: this.nextIndex,
      timestamp: this.timestamp,
      url: this.url,
      tabId: this.tabId,
    }
  }

  setBeaconSizeLimit(limit: number) {
    this.beaconSizeLimit = limit
  }

  setProtocolVersion(version: number) {
    if (this.protocolVersion === version) return
    this.protocolVersion = version
    // No in-flight content expected at version-set time; recreate the player
    // builder so subsequent batches carry the right BatchMetadata.version.
    this.playerBuilder.reset()
    this.playerBuilder = new BatchBuilder(this.beaconSize, this.playerVersion(), 'player')
  }

  writeMessage(message: Message) {
    // @ts-ignore offline-end sentinel
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
    const target = this.routeMessage(message)
    this.pushTo(target, message)
  }

  private routeMessage(message: Message): BatchBuilder {
    if (this.protocolVersion === 2) {
      const t = message[0]
      if (ASSET_MESSAGES.has(t)) return this.assetBuilder
      if (DEVTOOLS_MESSAGES.has(t)) return this.devtoolsBuilder
      if (ANALYTICS_MESSAGES.has(t)) return this.analyticsBuilder
    }
    return this.playerBuilder
  }

  private pushTo(builder: BatchBuilder, message: Message): void {
    // ctx is identical across retries: nextIndex only advances on a successful
    // push, and timestamp/url are mutated only by writeMessage before pushTo.
    const ctx = this.currentCtx()
    if (builder.push(message, ctx)) {
      this.nextIndex++
      return
    }
    // Soft-budget hit: flush this stream's batch, retry once on the same builder.
    // Pair-emit player before assets so the DOM tree always lands first — if the
    // tab closes between batches, an asset-only batch on the server is useless.
    if (builder === this.assetBuilder) this.flushBuilder(this.playerBuilder)
    this.flushBuilder(builder)
    if (builder.push(message, ctx)) {
      this.nextIndex++
      return
    }
    // Single message exceeds soft budget: build a one-shot oversized batch.
    const big = new BatchBuilder(this.beaconSizeLimit, builder.version, builder.dataType)
    if (!big.push(message, ctx)) {
      console.warn('OpenReplay: beacon size overflow. Skipping large message.', message)
      return
    }
    this.nextIndex++
    const batch = big.flush()
    if (batch) {
      if (builder === this.assetBuilder) this.flushBuilder(this.playerBuilder)
      this.emitBatch(batch, builder.dataType, false)
    }
  }

  private flushBuilder(builder: BatchBuilder, skipCompression = false): boolean {
    const batch = builder.flush()
    if (!batch) return false
    this.emitBatch(batch, builder.dataType, skipCompression)
    return true
  }

  private emitBatch(batch: Uint8Array, dataType: DataType, skipCompression: boolean): void {
    if (this.localDebug && this.onLocalSave) {
      this.onLocalSave(`${dataType}-${Date.now()}`, batch.slice())
    }
    this.onBatch(batch, skipCompression, dataType)
  }

  finaliseBatch(skipCompression = false) {
    this.flushBuilder(this.playerBuilder, skipCompression)
    this.flushBuilder(this.assetBuilder, skipCompression)
    this.flushBuilder(this.devtoolsBuilder, skipCompression)
    this.flushBuilder(this.analyticsBuilder, skipCompression)
  }

  clean() {
    this.playerBuilder.reset()
    this.assetBuilder.reset()
    this.devtoolsBuilder.reset()
    this.analyticsBuilder.reset()
  }
}
