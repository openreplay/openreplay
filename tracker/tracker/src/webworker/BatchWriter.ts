import type Message from '../common/messages.gen.js'
import * as Messages from '../common/messages.gen.js'
import { ASSET_MESSAGES, DEVTOOLS_MESSAGES, ANALYTICS_MESSAGES } from '../common/messages.gen.js'
import type { DataType } from '../common/interaction.js'
import BatchBuilder, { BatchContext } from './BatchBuilder.js'

const ASSETS_VERSION = 3
const DEVTOOLS_VERSION = 4
const ANALYTICS_VERSION = 5

// Warmup cap keeps the concatenated pair under the 64 KiB browser keepalive
// limit so early-session batches survive a fast tab close.
const PAIR_WARMUP_SOFT_CAP = 60 * 1024
const PAIR_STEADY_SOFT_CAP = 100 * 1024
const PAIR_WARMUP_MS = 5000

// 2x steady cap leaves headroom for the message that crosses the threshold —
// the soft-cap check runs before push, so push itself can land up to ~100kB
// on top of an already near-cap builder.
const PAIR_BUILDER_SIZE = 2 * PAIR_STEADY_SOFT_CAP

const AUX_SOFT_CAP = 2 * 1e5

export default class BatchWriter {
  private nextIndex = 0
  private pairSoftCap = PAIR_WARMUP_SOFT_CAP
  private beaconSizeLimit = 1e6
  private playerBuilder: BatchBuilder
  private assetBuilder: BatchBuilder
  private devtoolsBuilder: BatchBuilder
  private analyticsBuilder: BatchBuilder
  private protocolVersion = 1
  private warmupTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly pageNo: number,
    private timestamp: number,
    private url: string,
    private readonly onBatch: (
      batch: Uint8Array,
      skipCompression?: boolean,
      dataType?: DataType,
      split?: number,
    ) => void,
    private tabId: string,
    private readonly onOfflineEnd: () => void,
    private readonly localDebug = false,
    private readonly onLocalSave?: (name: string, batch: Uint8Array) => void,
  ) {
    this.playerBuilder = new BatchBuilder(PAIR_BUILDER_SIZE, this.playerVersion(), 'player')
    this.assetBuilder = new BatchBuilder(PAIR_BUILDER_SIZE, ASSETS_VERSION, 'assets')
    this.devtoolsBuilder = new BatchBuilder(AUX_SOFT_CAP, DEVTOOLS_VERSION, 'devtools')
    this.analyticsBuilder = new BatchBuilder(AUX_SOFT_CAP, ANALYTICS_VERSION, 'analytics')

    this.warmupTimer = setTimeout(() => {
      this.pairSoftCap = PAIR_STEADY_SOFT_CAP
      this.warmupTimer = null
    }, PAIR_WARMUP_MS)
  }

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
    // Rebuild so subsequent batches carry the right BatchMetadata.version.
    // Safe to drop in-flight content — version is set during auth, before writes.
    this.playerBuilder.reset()
    this.playerBuilder = new BatchBuilder(PAIR_BUILDER_SIZE, this.playerVersion(), 'player')
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

  private isPair(builder: BatchBuilder): boolean {
    return builder === this.playerBuilder || builder === this.assetBuilder
  }

  private pairSize(): number {
    return this.playerBuilder.currentSize() + this.assetBuilder.currentSize()
  }

  private pushTo(builder: BatchBuilder, message: Message): void {
    // ctx stays valid across retries: nextIndex only advances on a successful
    // push, and timestamp/url mutate only in writeMessage before this call.
    const ctx = this.currentCtx()
    const isPair = this.isPair(builder)

    if (isPair && this.pairSize() >= this.pairSoftCap) {
      this.flushPair()
    }

    if (builder.push(message, ctx)) {
      this.nextIndex++
      return
    }
    if (isPair) this.flushPair()
    else this.flushBuilder(builder)

    if (builder.push(message, ctx)) {
      this.nextIndex++
      return
    }
    // Message exceeds the builder buffer even after a flush — one-shot it
    // through a hard-cap-sized builder.
    const big = new BatchBuilder(this.beaconSizeLimit, builder.version, builder.dataType)
    if (!big.push(message, ctx)) {
      console.warn('OpenReplay: beacon size overflow. Skipping large message.', message)
      return
    }
    this.nextIndex++
    const bytes = big.flush()
    if (bytes) {
      this.emitBatch(bytes, builder.dataType, false)
    }
  }

  private flushBuilder(builder: BatchBuilder, skipCompression = false): boolean {
    const batch = builder.flush()
    if (!batch) return false
    this.emitBatch(batch, builder.dataType, skipCompression)
    return true
  }

  private pairFlushEnabled(): boolean {
    return this.protocolVersion === 2
  }

  // 'visual' is reserved for the two-stream concat case so the backend knows
  // it needs to demux at `split`. Single-stream flushes keep their native
  // dataType, leaving the existing ingest path untouched.
  private flushPair(skipCompression = false): void {
    if (!this.pairFlushEnabled()) {
      this.flushBuilder(this.playerBuilder, skipCompression)
      return
    }
    const p = this.playerBuilder.flush()
    const a = this.assetBuilder.flush()
    if (!p && !a) return
    if (p && a) {
      const out = new Uint8Array(p.length + a.length)
      out.set(p, 0)
      // Player first: DOM tree must land before the CSS/font assets that reference it.
      out.set(a, p.length)
      this.emitBatch(out, 'visual', skipCompression, p.length)
      return
    }
    if (p) this.emitBatch(p, 'player', skipCompression)
    else   this.emitBatch(a!, 'assets', skipCompression)
  }

  private emitBatch(
    batch: Uint8Array,
    dataType: DataType,
    skipCompression: boolean,
    split?: number,
  ): void {
    if (this.localDebug && this.onLocalSave) {
      this.onLocalSave(`${dataType}-${Date.now()}`, batch.slice())
    }
    this.onBatch(batch, skipCompression, dataType, split)
  }

  finaliseBatch(skipCompression = false) {
    this.flushPair(skipCompression)
    this.flushBuilder(this.devtoolsBuilder, skipCompression)
    this.flushBuilder(this.analyticsBuilder, skipCompression)
  }

  clean() {
    if (this.warmupTimer !== null) {
      clearTimeout(this.warmupTimer)
      this.warmupTimer = null
    }
    this.playerBuilder.reset()
    this.assetBuilder.reset()
    this.devtoolsBuilder.reset()
    this.analyticsBuilder.reset()
  }
}
