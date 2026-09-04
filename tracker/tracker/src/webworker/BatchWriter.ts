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

// Room for one rebuilt header (BatchMetadata + Timestamp + TabData). Only ever
// allocated when a batch turns up without its metadata; the url dominates it.
const HEADER_REPAIR_BUDGET = 16 * 1024

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

  /** Stream index the next written message will take (its MessageID / MsgID). */
  get currentIndex(): number {
    return this.nextIndex
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

    // The megabatch is cut apart server-side at the player half's length, so both
    // halves have to lead with their own BatchMetadata or a stray meta lands in
    // the middle of the player record. Verify (and repair) before pairing (#4836).
    const player = playerBatch && this.withHeader(playerBatch, 'player', this.playerVersion())
    const assets = assetBatch && this.withHeader(assetBatch, 'assets', ASSETS_VERSION)

    if (player && assets) {
      const visual = new Uint8Array(player.length + assets.length)
      visual.set(player, 0)
      visual.set(assets, player.length)
      this.emitBatch(visual, 'visual', skipCompression, player.length)
    } else if (player) {
      this.emitBatch(player, 'player', skipCompression)
    } else if (assets) {
      // Defensive: assets without player shouldn't happen — ship as plain assets.
      this.emitBatch(assets, 'assets', skipCompression)
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

  /** A batch must lead with its BatchMetadata: ingestion only learns the wire
   *  version from it, so without it every size-prefixed message after is read as
   *  unsized, the reader desyncs and the whole record is dropped. */
  private startsWithMeta(batch: Uint8Array): boolean {
    return batch.length > 0 && batch[0] === Messages.Type.BatchMetadata
  }

  /** Prepends a freshly built header to a batch that lost its leading metadata,
   *  so the content still reaches the player instead of being thrown away.
   *  Returns null only when even the header won't encode. */
  private repairHeader(batch: Uint8Array, version: number): Uint8Array | null {
    const header = new BatchBuilder(HEADER_REPAIR_BUDGET, version, 'player').headerOnly(
      this.currentCtx(),
    )
    if (!header) return null
    const fixed = new Uint8Array(header.length + batch.length)
    fixed.set(header, 0)
    fixed.set(batch, header.length)
    return fixed
  }

  /** Guarantees the invariant every consumer downstream relies on: byte 0 is a
   *  BatchMetadata. Repairs in place when it isn't (#4836). */
  private withHeader(batch: Uint8Array, dataType: DataType, version: number): Uint8Array | null {
    if (this.startsWithMeta(batch)) return batch
    const fixed = this.repairHeader(batch, version)
    console.warn(
      `OpenReplay: ${dataType} batch had no leading BatchMetadata (${batch.length}B, head ${this.headHex(batch)}) — ` +
        (fixed ? 'header rebuilt.' : 'could not rebuild the header, skipping.'),
    )
    return fixed
  }

  private versionOf(dataType: DataType): number {
    switch (dataType) {
      case 'assets':
        return ASSETS_VERSION
      case 'devtools':
        return DEVTOOLS_VERSION
      case 'analytics':
        return ANALYTICS_VERSION
      default:
        return this.playerVersion()
    }
  }

  private emitBatch(batch: Uint8Array, dataType: DataType, skipCompression: boolean, split?: number): void {
    // Ingestion answers 200 for a body it cannot parse, so a malformed batch is
    // lost silently along with everything the reader hasn't reached yet.
    const checked = split === undefined ? this.withHeader(batch, dataType, this.versionOf(dataType)) : batch
    if (!checked) return

    let offset = split
    // A megabatch's split has to land exactly on the asset half's own metadata.
    // finalizeVisual only ever pairs verified halves, so this is a backstop: if
    // it trips, walk the body for the real boundary instead of guessing.
    if (offset !== undefined && !this.isBoundary(checked, offset)) {
      const found = this.findBoundary(checked)
      console.warn(
        `OpenReplay: ${dataType} batch split ${String(offset)} is not a batch boundary (${checked.length}B) — ` +
          (found > 0 ? `corrected to ${found}.` : 'no boundary found, skipping.'),
      )
      if (found <= 0) return
      offset = found
    }

    if (this.localDebug) {
      this.verifyBody(checked, dataType, offset)
    }
    if (this.localDebug && this.onLocalSave) {
      this.onLocalSave(`${dataType}-${Date.now()}`, checked.slice())
    }
    this.onBatch(checked, skipCompression, dataType, offset)
  }

  private isBoundary(batch: Uint8Array, offset: number): boolean {
    return offset > 0 && offset < batch.length && batch[offset] === Messages.Type.BatchMetadata
  }

  private headHex(batch: Uint8Array): string {
    return Array.from(batch.subarray(0, 8), (b) => b.toString(16).padStart(2, '0')).join(' ')
  }

  /** Walks a body the way the ingest reader does: [type varint][3-byte size]
   *  [payload] per message, BatchMetadata excepted (no size prefix). Returns the
   *  offset of a second BatchMetadata — the real seam when two batches ended up
   *  concatenated — or -1, plus the first framing fault seen. O(size). */
  private scanBatch(batch: Uint8Array): { boundary: number; fault: string | null } {
    let p = 0
    let n = 0
    const readUint = (): number => {
      let val = 0
      let shift = 0
      while (p < batch.length) {
        const b = batch[p++]
        val += (b & 0x7f) * Math.pow(2, shift)
        if ((b & 0x80) === 0) return val
        shift += 7
      }
      return -1
    }
    while (p < batch.length) {
      const at = p
      const type = readUint()
      n++
      if (type < 0) return { boundary: -1, fault: `message ${n}: truncated type` }
      if (type === Messages.Type.BatchMetadata) {
        if (n > 1) return { boundary: at, fault: null }
        // version, pageNo, firstIndex, timestamp, then a length-prefixed url
        for (let i = 0; i < 4; i++) {
          if (readUint() < 0) return { boundary: -1, fault: 'truncated BatchMetadata' }
        }
        const urlLen = readUint()
        if (urlLen < 0 || p + urlLen > batch.length) {
          return { boundary: -1, fault: 'truncated BatchMetadata url' }
        }
        p += urlLen
        continue
      }
      if (n === 1) return { boundary: -1, fault: `leading message is type ${type}, not BatchMetadata` }
      if (p + 3 > batch.length) return { boundary: -1, fault: `message ${n}: truncated size prefix` }
      const size = batch[p] | (batch[p + 1] << 8) | (batch[p + 2] << 16)
      p += 3
      if (p + size > batch.length) return { boundary: -1, fault: `message ${n}: size ${size} overruns the batch` }
      p += size
    }
    return { boundary: -1, fault: null }
  }

  private findBoundary(batch: Uint8Array): number {
    return this.scanBatch(batch).boundary
  }

  /** localDebug only: report anything ingestion would choke on. */
  private verifyBody(batch: Uint8Array, dataType: DataType, split?: number): void {
    if (split !== undefined) {
      this.verifyBody(batch.subarray(0, split), `${dataType}:player` as DataType)
      this.verifyBody(batch.subarray(split), `${dataType}:assets` as DataType)
      return
    }
    const { boundary, fault } = this.scanBatch(batch)
    const why = fault ?? (boundary >= 0 ? `BatchMetadata at byte ${boundary} is not the first message` : null)
    if (why !== null) {
      console.warn(`OpenReplay: malformed ${dataType} batch — ${why} (${batch.length}B, head ${this.headHex(batch)}).`)
    }
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
