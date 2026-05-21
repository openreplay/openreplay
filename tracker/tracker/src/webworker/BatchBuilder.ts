import type Message from '../common/messages.gen.js'
import * as Messages from '../common/messages.gen.js'
import type { DataType } from '../common/interaction.js'
import MessageEncoder from './MessageEncoder.gen.js'

const SIZE_BYTES = 3
const MAX_M_SIZE = (1 << (SIZE_BYTES * 8)) - 1

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

  /** Returns wire bytes, or null if no real (non-Timestamp) message was pushed.
   *  Either way, the builder is reset and ready for a new batch. */
  flush(): Uint8Array | null {
    if (!this.hasContent()) {
      this.reset()
      return null
    }
    const out = this.encoder.flush()
    this.snap = null
    this.hasNonTimestamp = false
    this.lastPushedTs = 0
    return out
  }

  /** Wipe state without emitting anything. */
  reset(): void {
    this.encoder.reset()
    this.snap = null
    this.hasNonTimestamp = false
    this.lastPushedTs = 0
  }

  private writeHeader(snap: Snapshot): boolean {
    const e = this.encoder
    const batchMetadata: Messages.BatchMetadata = [
      Messages.Type.BatchMetadata,
      this.version,
      snap.pageNo,
      snap.firstIndex,
      snap.timestamp,
      snap.url,
    ]
    // BatchMetadata: type varint + fields (no size prefix — legacy wire format).
    if (!e.uint(batchMetadata[0])) return false
    if (!e.encode(batchMetadata as Message)) return false
    if (e.getCurrentOffset() > this.bufferSize) return false
    e.checkpoint()

    if (!this.writeMessageWithSize([Messages.Type.Timestamp, snap.timestamp] as Message)) return false
    if (!this.writeMessageWithSize([Messages.Type.TabData, snap.tabId] as Message)) return false

    return true
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
