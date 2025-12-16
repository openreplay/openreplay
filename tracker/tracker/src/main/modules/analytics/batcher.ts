import { categories } from './types'

interface PeopleEvent {
  type: string
  timestamp: number
  payload: Record<string, any>
}

interface Event {
  name: string
  payload: Record<string, any>
  timestamp: number
}

/**
 * Creates batches of events, then sends them at intervals.
 */
class Batcher {
  private readonly autosendInterval = 5 * 1000
  private readonly retryTimeout = 3 * 1000
  private readonly retryLimit = 3
  private readonly apiEdp = '/v1/sdk/i'

  private batch = {
    [categories.people]: [] as PeopleEvent[],
    [categories.events]: [] as Event[],
  }
  private intervalId: any = null

  constructor(
    private readonly backendUrl: string,
    private readonly getToken: () => string | null,
    private readonly init: () => Promise<void>,
  ) {}

  getBatches() {
    this.batch[categories.people] = this.dedupePeopleEvents()
    const finalData = { data: this.batch }
    return finalData
  }

  addEvent(event: any) {
    this.batch[event.category].push(event.data)
  }

  sendImmediately(event: any) {
    this.sendBatch({ [event.category]: [event.data] })
  }

  /**
   *
   * Essentially we're dividing the batch by identify events and squash all same category events into one in each part,
   * taking priority to the last one
   */
  dedupePeopleEvents() {
    const peopleEvents = this.batch[categories.people] as PeopleEvent[]
    const finalEvents = [] as PeopleEvent[]
    const currentPart = [] as PeopleEvent[]
    for (let event of peopleEvents) {
      if (event.type === 'identity') {
        if (currentPart.length > 0) {
          finalEvents.push(...this.squashPeopleEvents(currentPart), event)
          currentPart.length = 0
        } else {
          finalEvents.push(event)
        }
      } else {
        currentPart.push(event)
      }
    }
    if (currentPart.length > 0) {
      finalEvents.push(...this.squashPeopleEvents(currentPart))
    }

    return finalEvents
  }

  private squashPeopleEvents(events: PeopleEvent[]) {
    if (!events || events.length === 0) {
      return []
    }
    const uniqueEventsByType = new Map<string, PeopleEvent>()

    for (let event of events) {
      const prev = uniqueEventsByType.get(event.type)
      if (prev) {
        if (event.type === 'increment_property') {
          const previousValues = Object.entries(prev.payload)
          const currentValues = Object.entries(event.payload)
          const uniqueKeys = new Set<string>([...previousValues.map(([key]) => key), ...currentValues.map(([key]) => key)])
          const mergedPayload: Record<string, number> = {}
          uniqueKeys.forEach((key) => {
            const prevValue = typeof prev.payload[key] === 'number' ? prev.payload[key] : 0
            const currValue = typeof event.payload[key] === 'number' ? event.payload[key] : 0
            mergedPayload[key] = prevValue + currValue
          })
          uniqueEventsByType.set(event.type, {
            type: event.type,
            timestamp: event.timestamp,
            payload: mergedPayload,
          })
          continue
        }
        // merge payloads, taking priority to the latest one
        uniqueEventsByType.set(event.type, {
          type: event.type,
          timestamp: event.timestamp,
          payload: { ...(prev.payload ?? {}), ...(event.payload ?? {}) },
        })
      } else {
        uniqueEventsByType.set(event.type, event)
      }
    }

    return Array.from(uniqueEventsByType.values())
  }

  private sendBatch(batch: Record<string, any>) {
    const sentBatch = batch
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
        body: JSON.stringify(sentBatch),
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
            setTimeout(() => void send(), this.retryTimeout)
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
    const categories = Object.keys(this.batch)
    const isEmpty = categories.every((batch) => batch.length === 0)
    if (isEmpty) {
      return
    }
    this.sendBatch(this.getBatches())
    categories.forEach((key) => {
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
