const INGEST_PATH = '/v1/web/i'

const KEEPALIVE_SIZE_LIMIT = 64 << 10 // 64 kB

// function sendXHR(url: string, token: string, batch: Uint8Array): Promise<XMLHttpRequest> {
//   const req = new XMLHttpRequest()
//   req.open("POST", url)
//   req.setRequestHeader("Authorization", "Bearer " + token)
//   return new Promise((res, rej) => {
//     req.onreadystatechange = function() {
//       if (this.readyState === 4) {
//         if (this.status == 0) {
//           return; // happens simultaneously with onerror
//         }
//         res(this)
//       }
//     }
//     req.onerror = rej
//     req.send(batch.buffer)
//   })
// }

export default class QueueSender {
  private attemptsCount = 0
  private busy = false
  private readonly queue: Array<Uint8Array> = []
  private readonly ingestURL
  private token: string | null = null
  constructor(
    ingestBaseURL: string,
    private readonly onUnauthorised: () => any,
    private readonly onFailure: () => any,
    private readonly MAX_ATTEMPTS_COUNT = 10,
    private readonly ATTEMPT_TIMEOUT = 1000,
  ) {
    this.ingestURL = ingestBaseURL + INGEST_PATH
  }

  authorise(token: string): void {
    this.token = token
  }

  push(batch: Uint8Array): void {
    if (this.busy || !this.token) {
      this.queue.push(batch)
    } else {
      this.sendBatch(batch)
    }
  }

  private retry(batch: Uint8Array): void {
    if (this.attemptsCount >= this.MAX_ATTEMPTS_COUNT) {
      this.onFailure()
      return
    }
    this.attemptsCount++
    setTimeout(() => this.sendBatch(batch), this.ATTEMPT_TIMEOUT * this.attemptsCount)
  }

  // would be nice to use Beacon API, but it is not available in WebWorker
  private sendBatch(batch: Uint8Array): void {
    this.busy = true

    fetch(this.ingestURL, {
      body: batch,
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.token,
        //"Content-Type": "",
      },
      keepalive: batch.length < KEEPALIVE_SIZE_LIMIT,
    })
      .then((r) => {
        if (r.status === 401) {
          // TODO: continuous session ?
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
      .catch((e) => {
        console.warn('OpenReplay:', e)
        this.retry(batch)
      })
  }

  clean() {
    this.queue.length = 0
  }
}
