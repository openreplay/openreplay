import { categories } from "./types"

/**
 * Creates batches of events, then sends them at intervals.
 */
class Batcher {
  private readonly autosendInterval = 5 * 1000
  private readonly retryTimeout = 3 * 1000
  private readonly retryLimit = 3
  private readonly apiEdp = '/v1/sdk/i'

  private batch = {
    [categories.people]: [] as any[],
    [categories.events]: [] as any[],
  }
  private intervalId: any = null

  constructor(
    private readonly backendUrl: string,
    private readonly getToken: () => string | null,
    private readonly init: () => Promise<void>,
  ) {}

  getBatches() {
    return JSON.stringify({ data: this.batch, token: this.getToken(), deviceId: '1a2b3-1a2b3-1a2b3' })
  }

  addEvent(event: any) {
    this.batch[event.category].push(event)
    // if (!this.intervalId) {
    //   this.startAutosend()
    // }
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
      return fetch(`${this.backendUrl}${this.apiEdp}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ events: batch, token, deviceId: '1a2b3-1a2b3-1a2b3' }),
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
