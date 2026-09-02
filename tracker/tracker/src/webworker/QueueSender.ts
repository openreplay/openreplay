import type { DataType } from '../common/interaction.js'

const INGEST_PATH = '/v1/web/i'
const KEEPALIVE_SIZE_LIMIT = 64 << 10 // 64 kB
const DEFAULT_COMPRESSION_THRESHOLD = 24 * 1000

/** gzip is available in DedicatedWorkerGlobalScope wherever it exists at all. */
const CAN_COMPRESS = typeof CompressionStream !== 'undefined'

interface QueueEntry {
  /** Position in the session's batch order — also the `batch=` number on the wire. */
  seq: number
  batch: Uint8Array
  dataType: DataType
  split?: number
  /** Closing/unload: send the bytes as they are, don't spend time on gzip. */
  raw: boolean
}

/**
 * Strictly FIFO. One batch is in flight at a time and the next one only starts
 * once it lands, so the order batches are handed to push() is the order they hit
 * the network.
 *
 * That ordering used to be breakable: compression happened on the main thread via
 * a postMessage round-trip, and the return leg (plus every `skipCompression`
 * batch) called sendBatch() directly, bypassing the queue. A big batch waiting on
 * gzip could therefore be overtaken by smaller ones behind it — the ingest sink
 * appends batches in arrival order, so a late DOM snapshot lands after the
 * mutations that depend on it and the replay is broken. Compressing here removes
 * both the round-trip and the bypass.
 */
export default class QueueSender {
  private attemptsCount = 0
  private readonly queue: Array<QueueEntry> = []
  /** Entry currently being compressed or fetched; nothing else may start. */
  private inFlight: QueueEntry | null = null
  /** True once the in-flight entry's fetch has actually been started. */
  private inFlightDispatched = false
  /** Bumped whenever an in-flight compression is abandoned, so a late gzip result
   *  from a superseded attempt is ignored instead of sent out of turn. */
  private compressionEpoch = 0
  private readonly ingestURL
  private token: string | null = null
  private stopped = false
  private lastSeq = 0
  private compressionThreshold = DEFAULT_COMPRESSION_THRESHOLD
  // Running total of bytes held by in-flight fetches that set keepalive: true.
  // Browsers cap this at 64 KB per fetch group; exceeding it makes fetch() throw
  // synchronously, so we track it here and fall back to keepalive: false.
  private inflightKeepaliveBytes = 0

  constructor(
    ingestBaseURL: string,
    private readonly onUnauthorised: () => any,
    private readonly onFailure: (reason: string) => any,
    private readonly MAX_ATTEMPTS_COUNT = 10,
    private readonly ATTEMPT_TIMEOUT = 250,
    private readonly pageNo?: number,
    compressionThreshold?: number,
  ) {
    this.ingestURL = ingestBaseURL + INGEST_PATH
    if (typeof compressionThreshold === 'number') {
      this.compressionThreshold = compressionThreshold
    }
  }

  public getQueueStatus() {
    return this.queue.length === 0 && this.inFlight === null
  }

  setCompressionThreshold(threshold: number) {
    this.compressionThreshold = threshold
  }

  authorise(token: string): void {
    this.token = token
    this.pump()
  }

  push(batch: Uint8Array, dataType: DataType = 'player', split?: number, raw = false): void {
    if (this.stopped) return
    this.queue.push({ seq: ++this.lastSeq, batch, dataType, split, raw })
    this.pump()
  }

  /** Starts the next batch, if the line is free. */
  private pump(): void {
    if (this.stopped || this.inFlight !== null || this.token === null || this.queue.length === 0) return
    const entry = this.queue.shift() as QueueEntry
    this.inFlight = entry
    this.inFlightDispatched = false

    if (entry.raw || !CAN_COMPRESS || entry.batch.length <= this.compressionThreshold) {
      this.dispatch(entry, entry.batch, false)
      return
    }
    const epoch = ++this.compressionEpoch
    void this.gzip(entry.batch)
      .then((compressed) => {
        // Superseded by an urgent drain (or a reset) while we were compressing.
        if (this.compressionEpoch !== epoch || this.inFlight !== entry) return
        this.dispatch(entry, compressed, true)
      })
      .catch(() => {
        if (this.compressionEpoch !== epoch || this.inFlight !== entry) return
        this.dispatch(entry, entry.batch, false)
      })
  }

  private async gzip(batch: Uint8Array): Promise<Uint8Array> {
    const stream = new Blob([batch as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }

  /** Called once the in-flight batch is done with (sent, or given up on). */
  private finish(): void {
    this.inFlight = null
    this.inFlightDispatched = false
    this.pump()
  }

  private retry(entry: QueueEntry, body: Uint8Array, isCompressed: boolean, reason: string): void {
    if (this.attemptsCount >= this.MAX_ATTEMPTS_COUNT) {
      this.onFailure(`Failed to send batch after ${this.attemptsCount} attempts.`)
      // The line stays blocked on purpose: dropping this batch would let later
      // ones through out of order.
      return
    }
    this.attemptsCount++
    const bodyCopy = new Uint8Array(body)
    setTimeout(
      () => this.dispatch(entry, bodyCopy, isCompressed, reason),
      this.ATTEMPT_TIMEOUT * this.attemptsCount,
    )
  }

  // would be nice to use Beacon API, but it is not available in WebWorker
  private dispatch(entry: QueueEntry, body: Uint8Array, isCompressed: boolean, retrySuffix = ''): void {
    if (body.length === 0) {
      console.error('OpenReplay: refusing to send 0-byte batch.', {
        seq: entry.seq,
        dataType: entry.dataType,
        isCompressed,
      })
      this.attemptsCount = 0
      this.finish()
      return
    }

    if (this.inFlight === entry) {
      this.inFlightDispatched = true
    }

    const headers = {
      Authorization: `Bearer ${this.token as string}`,
      DataType: entry.dataType,
    } as Record<string, string>

    if (isCompressed) {
      headers['Content-Encoding'] = 'gzip'
    }

    /**
     * sometimes happen during assist connects for some reason
     * */
    if (this.token === null) {
      setTimeout(() => this.dispatch(entry, body, isCompressed, 'newToken'), 500)
      return
    }

    const useKeepalive =
      body.length < KEEPALIVE_SIZE_LIMIT &&
      this.inflightKeepaliveBytes + body.length <= KEEPALIVE_SIZE_LIMIT
    if (useKeepalive) {
      this.inflightKeepaliveBytes += body.length
    }
    let released = false
    const releaseKeepalive = () => {
      if (useKeepalive && !released) {
        released = true
        this.inflightKeepaliveBytes -= body.length
      }
    }

    // its simply more human readable even if this looks like boilerplate code
    let url = this.ingestURL
    url += `?batch=${this.pageNo ?? 0}`
    url += `_${entry.seq}`
    url += `_${body.byteLength}`
    url += `_${useKeepalive ? 'kyes' : 'kno'}`
    if (retrySuffix) {
      url += `_${retrySuffix}`
    }
    // Visual megabatch: backend slices [0,split)=player, [split,end)=assets.
    if (entry.split !== undefined) {
      url += `&split=${entry.split}`
    }

    fetch(url, {
      // @ts-ignore
      body,
      method: 'POST',
      headers,
      keepalive: useKeepalive,
    })
      .then((r: Record<string, any>) => {
        releaseKeepalive()
        r.body?.cancel().catch(() => {})
        if (r.status === 401) {
          // TODO: continuous session ?
          this.inFlight = null
          this.inFlightDispatched = false
          this.onUnauthorised()
          return
        }
        if (r.status >= 400) {
          this.retry(entry, body, isCompressed, `network:${r.status}`)
          return
        }
        // Success
        this.attemptsCount = 0
        this.finish()
      })
      .catch((e: Error) => {
        releaseKeepalive()
        console.warn('OpenReplay:', e)
        this.retry(entry, body, isCompressed, `reject:${e.message}`)
      })
  }

  /**
   * Unload path: get everything out now, uncompressed, still oldest-first. The
   * in-flight batch goes first — if it was mid-gzip its compression is abandoned
   * and the raw bytes are sent instead, so it can't end up behind the queue.
   */
  flushAll(): void {
    if (this.token === null) return
    const pending = this.queue.splice(0)
    const stuck = this.inFlight
    if (stuck !== null && !this.inFlightDispatched) {
      // Still compressing: abandon that and send the raw bytes, ahead of the rest.
      this.compressionEpoch++
      this.inFlight = null
      pending.unshift(stuck)
    }
    for (const entry of pending) {
      entry.raw = true
      this.dispatch(entry, entry.batch, false)
    }
  }

  clean() {
    // sending last batch and closing the shop
    this.flushAll()
    this.stopped = true
    setTimeout(() => {
      this.token = null
      this.queue.length = 0
      this.inFlight = null
      this.inFlightDispatched = false
    }, 10)
  }
}
