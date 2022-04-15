const INGEST_PATH = "/v1/web/i"

export default class QueueSender {
  private attemptsCount = 0
  private busy = false
  private readonly queue: Array<Uint8Array> = []
  private readonly ingestURL
  private token: string | null = null
  constructor(
    ingestBaseURL: string, 
    private readonly onUnauthorised: Function,
    private readonly onFailure: Function,
    private readonly MAX_ATTEMPTS_COUNT = 10,
    private readonly ATTEMPT_TIMEOUT = 1000,
  ) {
    this.ingestURL = ingestBaseURL + INGEST_PATH
  }

  authorise(token: string) {
    this.token = token
  }

  push(batch: Uint8Array) {
    if (this.busy || !this.token) {
      this.queue.push(batch)
    } else {
      this.busy = true
      this.sendBatch(batch)
    }
  }

  private retry(batch: Uint8Array) {
    if (this.attemptsCount >= this.MAX_ATTEMPTS_COUNT) {
      this.onFailure()
      return
    }
    this.attemptsCount++
    setTimeout(() => this.sendBatch(batch), this.ATTEMPT_TIMEOUT * this.attemptsCount)
  }

  // would be nice to use Beacon API, but it is not available in WebWorker
  private sendBatch(batch: Uint8Array):void {
    fetch(this.ingestURL, {
      body: batch,
      method: 'POST',
      headers: {
        "Authorization": "Bearer " + this.token,
        //"Content-Type": "",
      },
      keepalive: true,
    })
    .then(r => {
      if (r.status === 401) { // TODO: continuous session ?
        this.busy = false
        this.onUnauthorised()
        return
      } else if (r.status >= 400) {
        this.retry(batch)
        return
      }

      // Success
      this.attemptsCount = 0
      const nextBatch = this.queue.shift()
      if (nextBatch) {
        this.sendBatch(nextBatch)
      } else {
        this.busy = false
      }
    })
    .catch(e => {
      this.retry(batch)
    })     // Does it handle offline exceptions (?)

  }

  clean() {
    this.queue.length = 0
  }

}



