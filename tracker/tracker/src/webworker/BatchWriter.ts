import type Message from '../common/messages.gen.js'
import * as Messages from '../common/messages.gen.js'
import { ASSET_MESSAGES, DEVTOOLS_MESSAGES, ANALYTICS_MESSAGES } from '../common/messages.gen.js'
import type { DataType } from '../common/interaction.js'
import BatchBuilder, { BatchContext } from './BatchBuilder.js'

const ASSETS_VERSION = 3
const DEVTOOLS_VERSION = 4
const ANALYTICS_VERSION = 5

// Attribute carrying the "DOM fully parsed & sent" signal (see top_observer).
const VISUAL_SIGNAL_ATTR = 'orloaded'

export default class BatchWriter {
  private nextIndex = 0
  private beaconSize = 2 * 1e5 // 200kB soft trigger
  private beaconSizeLimit = 1e6 // hard cap (set per-session by tracker)
  private playerBuilder: BatchBuilder
  private assetBuilder: BatchBuilder
  private devtoolsBuilder: BatchBuilder
  private analyticsBuilder: BatchBuilder
  private protocolVersion = 1

  // Visual init phase (protocolVersion 2 only): before the "DOM parsed" signal we
  // emit nothing — player + asset bytes accumulate into one "visual" megabatch.
  private visualSent = false
  // Set once the orloaded signal is seen outside an active init phase. Guards a late
  // protocolVersion→2 flip after the signal already passed: skip the feature.
  // Keyed on the signal (not on "any message"), since auth/pv2 lands after the
  // /v1/web/start round-trip — stray pre-auth traffic must not disable the feature.
  private signalSeen = false
  // Devtools/analytics batches buffered during init, released right after the visual.
  private heldOther: Array<{ batch: Uint8Array; dataType: DataType }> = []

  constructor(
    private readonly pageNo: number,
    private timestamp: number,
    private url: string,
    private readonly onBatch: (batch: Uint8Array, skipCompression?: boolean, dataType?: DataType, split?: number) => void,
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

  private initActive(): boolean {
    return this.protocolVersion === 2 && !this.visualSent
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
    if (version === 2 && !this.signalSeen) {
      // Init phase: player+assets accumulate up to the hard cap (soft limit ignored).
      this.playerBuilder.reset()
      this.assetBuilder.reset()
      this.playerBuilder = new BatchBuilder(this.beaconSizeLimit, this.playerVersion(), 'player')
      this.assetBuilder = new BatchBuilder(this.beaconSizeLimit, ASSETS_VERSION, 'assets')
      return
    }
    if (version === 2) this.visualSent = true
    // Recreate the player builder so subsequent batches carry the right version.
    this.playerBuilder.reset()
    this.playerBuilder = new BatchBuilder(this.beaconSize, this.playerVersion(), 'player')
  }

  writeMessage(message: Message) {
    // @ts-ignore offline-end sentinel
    if (message[0] === -1) {
      this.finaliseBatch()
      return this.onOfflineEnd()
    }
    // "DOM parsed" signal (orloaded marker): a control signal, not wire data.
    if (
      message[0] === Messages.Type.SetNodeAttribute &&
      (message as Messages.SetNodeAttribute)[2] === VISUAL_SIGNAL_ATTR
    ) {
      if (this.initActive()) this.finalizeVisual()
      else this.signalSeen = true
      return
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
    if (this.initActive()) {
      this.pushDuringInit(builder, message, ctx)
      return
    }
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

  private pushDuringInit(builder: BatchBuilder, message: Message, ctx: BatchContext): void {
    const isVisual = builder === this.playerBuilder || builder === this.assetBuilder
    if (builder.push(message, ctx)) {
      this.nextIndex++
      if (
        isVisual &&
        this.playerBuilder.size() + this.assetBuilder.size() >= this.beaconSizeLimit
      ) {
        // Hard cap reached before the signal — force-finalize the visual.
        this.finalizeVisual()
      }
      return
    }
    if (isVisual) {
      // Builder full: finalize the visual, then re-route via the normal path.
      this.finalizeVisual()
      this.pushTo(this.routeMessage(message), message)
      return
    }
    // Devtools/analytics overflow: hold the flushed batch instead of sending it.
    this.flushBuilderToHeld(builder)
    if (builder.push(message, ctx)) {
      this.nextIndex++
      return
    }
    const big = new BatchBuilder(this.beaconSizeLimit, builder.version, builder.dataType)
    if (!big.push(message, ctx)) {
      console.warn('OpenReplay: beacon size overflow. Skipping large message.', message)
      return
    }
    this.nextIndex++
    const batch = big.flush()
    if (batch) this.heldOther.push({ batch, dataType: builder.dataType })
  }

  private flushBuilderToHeld(builder: BatchBuilder): void {
    const batch = builder.flush()
    if (batch) this.heldOther.push({ batch, dataType: builder.dataType })
  }

  /** Concatenate buffered player+asset bytes into the "visual" first batch (split =
   *  player length), ship it, release held devtools/analytics, then resume normal batching. */
  private finalizeVisual(skipCompression = false): void {
    const playerBatch = this.playerBuilder.flush()
    const assetBatch = this.assetBuilder.flush()

    this.visualSent = true
    this.playerBuilder = new BatchBuilder(this.beaconSize, this.playerVersion(), 'player')
    this.assetBuilder = new BatchBuilder(this.beaconSize, ASSETS_VERSION, 'assets')

    if (playerBatch && assetBatch) {
      const visual = new Uint8Array(playerBatch.length + assetBatch.length)
      visual.set(playerBatch, 0)
      visual.set(assetBatch, playerBatch.length)
      this.emitBatch(visual, 'visual', skipCompression, playerBatch.length)
    } else if (playerBatch) {
      this.emitBatch(playerBatch, 'visual', skipCompression)
    } else if (assetBatch) {
      // Defensive: assets without player shouldn't happen — ship as plain assets.
      this.emitBatch(assetBatch, 'assets', skipCompression)
    }

    for (const held of this.heldOther) {
      this.emitBatch(held.batch, held.dataType, skipCompression)
    }
    this.heldOther.length = 0
    this.flushBuilder(this.devtoolsBuilder, skipCompression)
    this.flushBuilder(this.analyticsBuilder, skipCompression)
  }

  private flushBuilder(builder: BatchBuilder, skipCompression = false): boolean {
    const batch = builder.flush()
    if (!batch) return false
    this.emitBatch(batch, builder.dataType, skipCompression)
    return true
  }

  private emitBatch(batch: Uint8Array, dataType: DataType, skipCompression: boolean, split?: number): void {
    if (this.localDebug && this.onLocalSave) {
      this.onLocalSave(`${dataType}-${Date.now()}`, batch.slice())
    }
    this.onBatch(batch, skipCompression, dataType, split)
  }

  finaliseBatch(skipCompression = false) {
    if (this.initActive()) {
      // Auto-send tick / closing / stop during init: ship the visual (also drains held).
      this.finalizeVisual(skipCompression)
      return
    }
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
    this.heldOther.length = 0
    this.visualSent = false
    this.signalSeen = false
  }
}
