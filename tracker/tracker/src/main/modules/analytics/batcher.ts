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
    return JSON.stringify({ data: this.batch, token: this.getToken() })
  }

  addEvent(event: any) {
    this.batch[event.category].push(event.data)
  }

  sendImmediately(event: any) {
    this.sendBatch({ [event.category]: [event.data] })
  }

  private sendBatch(batch: Record<string, any[]>) {
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

  startAutosend() {
    this.intervalId = setInterval(() => {
      this.flush()
    }, this.autosendInterval)
  }

  flush() {
    const isEmpty = Object.values(this.batch).every((batch => batch.length === 0))
    if (isEmpty) {
      return
    }
    this.sendBatch(this.batch)
    Object.keys(this.batch).forEach((key) => {
      this.batch[key] = []
    })
  }

  stop() {
    this.flush()
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}

export default Batcher
