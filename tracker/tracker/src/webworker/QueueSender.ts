import type { DataType } from '../common/interaction.js'

const INGEST_PATH = '/v1/web/i'
const KEEPALIVE_SIZE_LIMIT = 64 << 10 // 64 kB

interface QueueEntry {
  batch: Uint8Array
  dataType: DataType
  split?: number
}

export default class QueueSender {
  private attemptsCount = 0
  private busy = false
  private readonly queue: Array<QueueEntry> = []
  private readonly ingestURL
  private token: string | null = null
  // its actually on #24
  // eslint-disable-next-line
  private isCompressing
  private lastBatchNum = 0
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
    private readonly onCompress?: (batch: Uint8Array, dataType: DataType, split?: number) => any,
    private readonly pageNo?: number,
  ) {
    this.ingestURL = ingestBaseURL + INGEST_PATH
    if (onCompress !== undefined) {
      this.isCompressing = true
    } else {
      this.isCompressing = false
    }
  }

  public getQueueStatus() {
    return this.queue.length === 0 && !this.busy
  }

  authorise(token: string): void {
    this.token = token
    if (!this.busy) {
      // TODO: transparent busy/send logic
      this.sendNext()
    }
  }

  push(batch: Uint8Array, dataType: DataType = 'player', split?: number): void {
    if (this.busy || !this.token) {
      this.queue.push({ batch, dataType, split })
    } else {
      this.busy = true
      if (this.isCompressing && this.onCompress) {
        this.onCompress(batch, dataType, split)
      } else {
        const batchNum = ++this.lastBatchNum
        this.sendBatch(batch, false, batchNum, dataType, split)
      }
    }
  }

  private sendNext() {
    const next = this.queue.shift()
    if (next) {
      this.busy = true
      if (this.isCompressing && this.onCompress) {
        this.onCompress(next.batch, next.dataType, next.split)
      } else {
        const batchNum = ++this.lastBatchNum
        this.sendBatch(next.batch, false, batchNum, next.dataType, next.split)
      }
    } else {
      this.busy = false
    }
  }

  private retry(batch: Uint8Array, isCompressed?: boolean, batchNum?: string | number, dataType: DataType = 'player', split?: number): void {
    if (this.attemptsCount >= this.MAX_ATTEMPTS_COUNT) {
      this.onFailure(`Failed to send batch after ${this.attemptsCount} attempts.`)
      // remains this.busy === true
      return
    }
    this.attemptsCount++
    const batchCopy = new Uint8Array(batch)
    setTimeout(
      () => this.sendBatch(batchCopy, isCompressed, batchNum, dataType, split),
      this.ATTEMPT_TIMEOUT * this.attemptsCount,
    )
  }

  // would be nice to use Beacon API, but it is not available in WebWorker
  private sendBatch(batch: Uint8Array, isCompressed?: boolean, batchNum?: string | number, dataType: DataType = 'player', split?: number): void {
    if (batch.length === 0) {
      console.error('OpenReplay: refusing to send 0-byte batch.', { batchNum, dataType, isCompressed, batch })
      this.attemptsCount = 0
      this.sendNext()
      return
    }

    const batchNumRaw = batchNum?.toString() ?? '0'
    const numMatch = batchNumRaw.match(/^([^_]+)(?:_([^_]+))?/)
    const mainBatchNum = numMatch?.[1] ?? '0'
    const retrySuffix = numMatch?.[2] ? numMatch[2] : ''
    this.busy = true

    const headers = {
      Authorization: `Bearer ${this.token as string}`,
      'DataType': dataType,
    } as Record<string, string>

    if (isCompressed) {
      headers['Content-Encoding'] = 'gzip'
    }

    /**
     * sometimes happen during assist connects for some reason
     * */
    if (this.token === null) {
      setTimeout(() => {
        this.sendBatch(batch, isCompressed, `${batchNum ?? 'noBatchNum'}_newToken`, dataType, split)
      }, 500)
      return
    }

    const useKeepalive =
      batch.length < KEEPALIVE_SIZE_LIMIT &&
      this.inflightKeepaliveBytes + batch.length <= KEEPALIVE_SIZE_LIMIT
    if (useKeepalive) {
      this.inflightKeepaliveBytes += batch.length
    }
    const releaseKeepalive = () => {
      if (useKeepalive) {
        this.inflightKeepaliveBytes -= batch.length
      }
    }

    const batchSize = batch.byteLength
    // its simply more human readable even if this looks like boilerplate code
    let url = this.ingestURL;
    url += `?batch=${this.pageNo ?? 0}`
    url += `_${mainBatchNum}`
    url += `_${batchSize}`
    url += `_${useKeepalive ? 'kyes' : 'kno'}`
    if (retrySuffix) {
      url += `_${retrySuffix}`
    }
    // Visual megabatch: backend slices [0,split)=player, [split,end)=assets.
    if (split !== undefined) {
      url += `&split=${split}`
    }

    fetch(
      url,
      {
        // @ts-ignore
        body: batch,
        method: 'POST',
        headers,
        keepalive: useKeepalive,
      }
    )
      .then((r: Record<string, any>) => {
        releaseKeepalive()
        r.body?.cancel().catch(() => {})
        if (r.status === 401) {
          // TODO: continuous session ?
          this.busy = false
          this.onUnauthorised()
          return
        } else if (r.status >= 400) {
          this.retry(batch, isCompressed, `${batchNum ?? 'noBatchNum'}_network:${r.status}`, dataType, split)
          return
        }

        // Success
        this.attemptsCount = 0
        this.sendNext()
      })
      .catch((e: Error) => {
        releaseKeepalive()
        console.warn('OpenReplay:', e)
        this.retry(batch, isCompressed, `${batchNum ?? 'noBatchNum'}_reject:${e.message}`, dataType, split)
      })
  }

  sendCompressed(batch: Uint8Array, dataType: DataType = 'player', split?: number) {
    const batchNum = ++this.lastBatchNum
    this.sendBatch(batch, true, batchNum, dataType, split)
  }

  sendUncompressed(batch: Uint8Array, dataType: DataType = 'player', split?: number) {
    const batchNum = ++this.lastBatchNum
    this.sendBatch(batch, false, batchNum, dataType, split)
  }

  clean() {
    // sending last batch and closing the shop
    this.sendNext()
    setTimeout(() => {
      this.token = null
      this.queue.length = 0
    }, 10)
  }
}
