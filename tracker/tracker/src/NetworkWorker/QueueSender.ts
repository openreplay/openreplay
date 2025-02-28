const INGEST_PATH = '/v1/web/i'
const KEEPALIVE_SIZE_LIMIT = 64 << 10 // 64 kB

export default class QueueSender {
  private attemptsCount = 0
  private busy = false
  private readonly queue: Array<Uint8Array> = []
  private readonly ingestURL
  private token: string | null = null
  // its actually on #24
  // eslint-disable-next-line
  private isCompressing
  private lastBatchNum = 0

  constructor(
    ingestBaseURL: string,
    private readonly onUnauthorised: () => any,
    private readonly onFailure: (reason: string) => any,
    private readonly MAX_ATTEMPTS_COUNT = 10,
    private readonly ATTEMPT_TIMEOUT = 250,
    private readonly onCompress?: (batch: Uint8Array) => any,
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

  push(batch: Uint8Array): void {
    if (this.busy || !this.token) {
      this.queue.push(batch)
    } else {
      this.busy = true
      if (this.isCompressing && this.onCompress) {
        this.onCompress(batch)
      } else {
        const batchNum = ++this.lastBatchNum
        this.sendBatch(batch, false, batchNum)
      }
    }
  }

  private sendNext() {
    const nextBatch = this.queue.shift()
    if (nextBatch) {
      this.busy = true
      if (this.isCompressing && this.onCompress) {
        this.onCompress(nextBatch)
      } else {
        const batchNum = ++this.lastBatchNum
        this.sendBatch(nextBatch, false, batchNum)
      }
    } else {
      this.busy = false
    }
  }

  private retry(batch: Uint8Array, isCompressed?: boolean, batchNum?: string | number): void {
    if (this.attemptsCount >= this.MAX_ATTEMPTS_COUNT) {
      this.onFailure(`Failed to send batch after ${this.attemptsCount} attempts.`)
      // remains this.busy === true
      return
    }
    this.attemptsCount++
    setTimeout(
      () => this.sendBatch(batch, isCompressed, batchNum),
      this.ATTEMPT_TIMEOUT * this.attemptsCount,
    )
  }

  // would be nice to use Beacon API, but it is not available in WebWorker
  private sendBatch(batch: Uint8Array, isCompressed?: boolean, batchNum?: string | number): void {
    const batchNumStr = batchNum?.toString().replace(/^([^_]+)_([^_]+).*/, '$1_$2_$3')
    this.busy = true

    const headers = {
      Authorization: `Bearer ${this.token as string}`,
    } as Record<string, string>

    if (isCompressed) {
      headers['Content-Encoding'] = 'gzip'
    }

    /**
     * sometimes happen during assist connects for some reason
     * */
    if (this.token === null) {
      setTimeout(() => {
        this.sendBatch(batch, isCompressed, `${batchNum ?? 'noBatchNum'}_newToken`)
      }, 500)
      return
    }

    fetch(`${this.ingestURL}?batch=${this.pageNo ?? 'noPageNum'}_${batchNumStr ?? 'noBatchNum'}`, {
      body: batch,
      method: 'POST',
      headers,
      keepalive: batch.length < KEEPALIVE_SIZE_LIMIT,
    })
      .then((r: Record<string, any>) => {
        if (r.status === 401) {
          // TODO: continuous session ?
          this.busy = false
          this.onUnauthorised()
          return
        } else if (r.status >= 400) {
          this.retry(batch, isCompressed, `${batchNum ?? 'noBatchNum'}_network:${r.status}`)
          return
        }

        // Success
        this.attemptsCount = 0
        this.sendNext()
      })
      .catch((e: Error) => {
        console.warn('OpenReplay:', e)
        this.retry(batch, isCompressed, `${batchNum ?? 'noBatchNum'}_reject:${e.message}`)
      })
  }

  sendCompressed(batch: Uint8Array) {
    const batchNum = ++this.lastBatchNum
    this.sendBatch(batch, true, batchNum)
  }

  sendUncompressed(batch: Uint8Array) {
    const batchNum = ++this.lastBatchNum
    this.sendBatch(batch, false, batchNum)
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
