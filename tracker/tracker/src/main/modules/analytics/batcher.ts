/**
 * Creates batches of events, then sends them at intervals.
 */
class Batcher {
  private readonly autosendInterval = 5 * 1000
  private readonly retryTimeout = 3 * 1000
  private readonly retryLimit = 3
  private readonly apiEdp = 'https://api.openreplay.com/track/batch'

  private batch: any[] = []
  private intervalId: any = null

  constructor(
    private readonly getToken: () => string | null,
    private readonly init: () => Promise<void>,
  ) {}

  addEvent(event: any) {
    this.batch.push(event)
    if (!this.intervalId) {
      this.startAutosend()
    }
  }

  sendImmediately(event: any) {
    this.sendBatch([event])
  }

  private sendBatch(batch: any[]) {
    let attempts = 0
    const send = () => {
      const token = this.getToken()
      if (!token) {
        return
      }
      attempts++
      return fetch(this.apiEdp, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ events: batch }),
      })
        .then((response) => {
          if (response.status === 403) {
            this.init().then(() => {
              send()
            })
          }
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
        })
        .catch(() => {
          if (attempts < this.retryLimit) {
            setTimeout(send, this.retryTimeout)
          }
        })
    }
    void send()
  }

  private startAutosend() {
    this.intervalId = setInterval(() => {
      this.flush()
    }, this.autosendInterval)
  }

  flush() {
    if (this.batch.length > 0) {
      this.sendBatch(this.batch)
      this.batch = []
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.flush()
  }
}

export default Batcher
