import type Message from '../common/messages.gen.js'
import * as Messages from '../common/messages.gen.js'
import type { DataType } from '../common/interaction.js'
import MessageEncoder from './MessageEncoder.gen.js'

const SIZE_BYTES = 3
const MAX_M_SIZE = (1 << (SIZE_BYTES * 8)) - 1

/**
 * BatchMessageOffsets (type 82), show absolute (from batch start) offset or
 * from table message end
*/
const absoluteOffsets = false

function uintByteSize(value: number): number {
  let n = 1
  while (value >= 0x80) {
    value = Math.floor(value / 128)
    n++
  }
  return n
}

function pushUint(out: number[], value: number): void {
  if (value < 0 || value > Number.MAX_SAFE_INTEGER) value = 0
  while (value >= 0x80) {
    out.push((value % 0x100) | 0x80)
    value = Math.floor(value / 128)
  }
  out.push(value)
}

function collectOffsets(batch: Uint8Array, bodyStart: number): Map<number, number[]> {
  const offsets = new Map<number, number[]>()
  let p = bodyStart
  while (p < batch.length) {
    const start = p - bodyStart
    // message type (varint)
    let type = 0
    let shift = 0
    let b = 0
    do {
      b = batch[p++]
      type += (b & 0x7f) * Math.pow(2, shift)
      shift += 7
    } while (b & 0x80)
    // message size (SIZE_BYTES, little-endian)
    let size = 0
    for (let i = 0; i < SIZE_BYTES; i++) size += batch[p++] * Math.pow(2, i * 8)
    p += size
    const arr = offsets.get(type)
    if (arr) arr.push(start)
    else offsets.set(type, [start])
  }
  return offsets
}

/**
 * Encode the BatchMessageOffsets message as [type varint][body] — a batch-level message
 * with NO size prefix (like BatchMetadata). Its byte length is recorded in
 * BatchMetadata.batchMessageOffsetsSize, which is how readers skip it.
 * Body: uint mapSize, then per type: uint messageType, uint offsetCount, offsetCount x uint
 * offset. `base` is added to every (relative) position: 0 for relative offsets, or the byte
 * position at which the body starts in the final batch for absolute offsets (resolved by the
 * fixed-point loop in flush()).
 */
function encodeOffsetsMessage(offsets: Map<number, number[]>, base: number): Uint8Array {
  const body: number[] = []
  pushUint(body, offsets.size)
  offsets.forEach((positions, type) => {
    pushUint(body, type)
    pushUint(body, positions.length)
    for (let i = 0; i < positions.length; i++) pushUint(body, base + positions[i])
  })

  const typeLen = uintByteSize(Messages.Type.BatchMessageOffsets)
  const out = new Uint8Array(typeLen + body.length)
  let p = 0
  let t = Messages.Type.BatchMessageOffsets
  while (t >= 0x80) {
    out[p++] = (t % 0x100) | 0x80
    t = Math.floor(t / 128)
  }
  out[p++] = t
  out.set(body, p)
  return out
}

export interface BatchContext {
  pageNo: number
  index: number
  timestamp: number
  url: string
  tabId: string
}

interface Snapshot {
  pageNo: number
  firstIndex: number
  timestamp: number
  url: string
  tabId: string
}

export default class BatchBuilder {
  private readonly encoder: MessageEncoder
  private readonly sizeBuffer = new Uint8Array(SIZE_BYTES)
  private snap: Snapshot | null = null
  private hasNonTimestamp = false
  private lastPushedTs = 0
  // Byte length of the BatchMetadata placeholder written in writeHeader — i.e. where the
  // message body begins in the encoder buffer. At flush the placeholder is dropped and the
  // real BatchMetadata (+ BatchMessageOffsets) is re-encoded and spliced in front of the body.
  private bodyStart = 0

  constructor(
    private readonly bufferSize: number,
    public readonly version: number,
    public readonly dataType: DataType,
  ) {
    this.encoder = new MessageEncoder(bufferSize)
  }

  push(msg: Message, ctx: BatchContext): boolean {
    const e = this.encoder
    const wasFresh = this.snap === null
    const savedOffset = e.getCurrentOffset()
    const savedCp = e.getCurrentCheckpoint()

    if (wasFresh) {
      const snap: Snapshot = {
        pageNo: ctx.pageNo,
        firstIndex: ctx.index,
        timestamp: ctx.timestamp,
        url: ctx.url,
        tabId: ctx.tabId,
      }
      if (!this.writeHeader(snap)) {
        e.rewind(savedOffset, savedCp)
        return false
      }
      this.snap = snap
      this.lastPushedTs = ctx.timestamp
    }

    // Auto-synth a Timestamp before non-Timestamp messages whose ctx.timestamp
    // moved forward since the last push. Skipped on fresh pushes — writeHeader
    // already wrote a Timestamp(snap.timestamp) — and skipped when msg is itself
    // a Timestamp, so explicit caller-driven Timestamps don't get duplicated.
    if (msg[0] !== Messages.Type.Timestamp && ctx.timestamp !== this.lastPushedTs) {
      if (!this.writeMessageWithSize([Messages.Type.Timestamp, ctx.timestamp] as Message)) {
        e.rewind(savedOffset, savedCp)
        return false
      }
    }

    if (!this.writeMessageWithSize(msg)) {
      e.rewind(savedOffset, savedCp)
      if (wasFresh) this.snap = null
      return false
    }

    this.lastPushedTs = ctx.timestamp
    if (msg[0] !== Messages.Type.Timestamp) this.hasNonTimestamp = true
    return true
  }

  hasContent(): boolean {
    return this.snap !== null && this.hasNonTimestamp
  }

  /** Current encoded byte size (0 when fresh). */
  size(): number {
    return this.snap === null ? 0 : this.encoder.getCurrentOffset()
  }

  /*
   * Returns wire bytes, or null if no real (non-Timestamp) message was pushed.
   *  Either way, the builder is reset and ready for a new batch.
   *
   *  Wire layout: [BatchMetadata][body][BatchMessageOffsets?]. The placeholder metadata
   *  written by writeHeader is dropped; metadata is re-encoded with the real LastTimestamp
   *  and BatchMessageOffsetsSize, and (except for asset batches) the offsets table is
   *  appended at the very end so an append-only backend can locate it via EOF - size.
   */
  flush(): Uint8Array | null {
    if (!this.hasContent()) {
      this.reset()
      return null
    }
    const snap = this.snap as Snapshot
    const bodyStart = this.bodyStart
    const lastTimestamp = this.lastPushedTs
    const batch = this.encoder.flush()
    this.snap = null
    this.hasNonTimestamp = false
    this.lastPushedTs = 0
    this.bodyStart = 0

    const body = batch.subarray(bodyStart)

    // Asset batches are re-parsed in full on the backend, so the index buys nothing —
    // skip it and leave BatchMessageOffsetsSize at 0 (the "no map" signal).
    let offsetsMsg: Uint8Array | null = null
    let offsets: Map<number, number[]> | null = null
    if (this.dataType !== 'assets') {
      offsets = collectOffsets(batch, bodyStart)
      if (!absoluteOffsets) {
        offsetsMsg = encodeOffsetsMessage(offsets, 0)
      } else {
        // Absolute positions count from byte 0 of the batch. The table is appended at the
        // very end, so the body starts right after the metadata — the base is just the
        // metadata length, which itself depends on the table size it records. Resolve with
        // a short fixed-point loop (monotonic and bounded, converges in a couple of steps).
        let metaLen = this.encodeMetadata(snap, lastTimestamp, 0).length
        for (let i = 0; i < 8; i++) {
          const om = encodeOffsetsMessage(offsets, metaLen)
          const meta = this.encodeMetadata(snap, lastTimestamp, om.length)
          offsetsMsg = om
          if (meta.length === metaLen) break
          metaLen = meta.length
        }
      }
    }

    const offsetsSize = offsetsMsg ? offsetsMsg.length : 0
    const metadata = this.encodeMetadata(snap, lastTimestamp, offsetsSize)

    // Layout: [BatchMetadata][body][BatchMessageOffsets?]. The table is appended at the end
    // so the backend, which writes files append-only, can find it via EOF - offsetsSize
    // (the size it read from BatchMetadata). Relative offsets are measured from body start
    // (i.e. right after the metadata).
    const out = new Uint8Array(metadata.length + body.length + offsetsSize)
    out.set(metadata, 0)
    out.set(body, metadata.length)
    if (offsetsMsg) out.set(offsetsMsg, metadata.length + body.length)

    // TODO(debug): temporary — measure how much the offsets map costs per batch.
    if (offsetsMsg && offsets) {
      const pct = ((offsetsSize / out.length) * 100).toFixed(2)
      // type -> offsets[] (positions are relative to body start; absolute mode adds the
      // body's byte position as a base when encoding).
      const map: Record<number, number[]> = {}
      offsets.forEach((positions, type) => {
        map[type] = positions
      })
      console.debug(
        `[OpenReplay] BatchMessageOffsets (${this.dataType}): map ${offsetsSize}B / batch ${out.length}B = ${pct}%`,
        map,
      )
    }

    return out
  }

  /** Wipe state without emitting anything. */
  reset(): void {
    this.encoder.reset()
    this.snap = null
    this.hasNonTimestamp = false
    this.lastPushedTs = 0
    this.bodyStart = 0
  }

  private writeHeader(snap: Snapshot): boolean {
    const e = this.encoder
    // Placeholder metadata: LastTimestamp / BatchMessageOffsetsSize are 0 here and filled
    // in at flush
    if (!this.encodeMetadataInto(e, snap, 0, 0)) return false
    if (e.getCurrentOffset() > this.bufferSize) return false
    e.checkpoint()
    this.bodyStart = e.getCurrentOffset()

    if (!this.writeMessageWithSize([Messages.Type.Timestamp, snap.timestamp] as Message)) return false
    if (!this.writeMessageWithSize([Messages.Type.TabData, snap.tabId] as Message)) return false

    return true
  }

  private encodeMetadataInto(
    e: MessageEncoder,
    snap: Snapshot,
    lastTimestamp: number,
    offsetsSize: number,
  ): boolean {
    const batchMetadata: Messages.BatchMetadata = [
      Messages.Type.BatchMetadata,
      this.version,
      snap.pageNo,
      snap.firstIndex,
      snap.timestamp,
      snap.url,
      lastTimestamp,
      offsetsSize,
    ]
    return e.uint(batchMetadata[0]) && e.encode(batchMetadata as Message)
  }

  /** Standalone BatchMetadata bytes, re-encoded at flush with the final LastTimestamp
   *  and BatchMessageOffsetsSize. Unlike writeHeader (which writes into the shared, fixed-size
   *  encoder and must handle overflow), this uses a fresh encoder sized for the worst case:
   *  UTF-8 is <= 3 bytes per UTF-16 code unit, plus a fixed ceiling for the numeric fields,
   *  so encodeMetadataInto cannot overflow and its result need not be checked. */
  private encodeMetadata(snap: Snapshot, lastTimestamp: number, offsetsSize: number): Uint8Array {
    const enc = new MessageEncoder(snap.url.length * 3 + 64)
    this.encodeMetadataInto(enc, snap, lastTimestamp, offsetsSize)
    enc.checkpoint()
    return enc.flush()
  }

  /** [type varint][SIZE_BYTES size LE][fields]. Sets checkpoint on success.
   *  Caller is responsible for rewinding on failure. */
  private writeMessageWithSize(msg: Message): boolean {
    const e = this.encoder
    if (!e.uint(msg[0]) || !e.skip(SIZE_BYTES)) return false
    const startOffset = e.getCurrentOffset()
    if (!e.encode(msg)) return false
    const endOffset = e.getCurrentOffset()
    const size = endOffset - startOffset
    if (size > MAX_M_SIZE) {
      console.warn('OpenReplay: max message size overflow.')
      return false
    }
    if (endOffset > this.bufferSize) return false
    this.writeSizeAt(size, startOffset - SIZE_BYTES)
    e.checkpoint()
    return true
  }

  private writeSizeAt(size: number, offset: number): void {
    for (let i = 0; i < SIZE_BYTES; i++) {
      this.sizeBuffer[i] = size >> (i * 8)
    }
    this.encoder.set(this.sizeBuffer, offset)
  }
}
