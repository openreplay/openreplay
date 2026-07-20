import Message, {
  Type,
  PerformanceTrack,
  SetPageLocation,
} from '../../common/messages.gen.js'
import type { Detector, DetectorLogger } from './types.js'

/**
 * Port of backend/pkg/handlers/web/memoryIssue.go.
 *
 * Keeps a running average of used JS heap size and fires when the current
 * usage climbs to >= MEM_RATE_THRESHOLD % of that average. The running average
 * (sum/count) is intentionally NOT reset between issues.
 */

const MIN_COUNT = 3
const MEM_RATE_THRESHOLD = 300 // % of the running average

export default class MemoryIssueDetector implements Detector {
  private startTimestamp = 0
  private rate = 0
  private count = 0
  private sum = 0
  private contextString = ''

  constructor(private readonly log: DetectorLogger) {}

  private reset(): void {
    this.startTimestamp = 0
    this.rate = 0
  }

  private build(): void {
    if (this.startTimestamp === 0) {
      return
    }
    this.log('memory', {
      rate: this.rate - 100,
      context: this.contextString,
      timestamp: this.startTimestamp,
    })
    this.reset()
  }

  handle(message: Message, timestamp: number): void {
    const type = message[0]
    if (type === Type.SetPageLocation) {
      this.contextString = (message as SetPageLocation)[1]
      return
    }
    if (type !== Type.PerformanceTrack) {
      return
    }
    const usedJSHeapSize = (message as PerformanceTrack)[4]

    if (this.count < MIN_COUNT) {
      this.sum += usedJSHeapSize
      this.count++
      return
    }

    const average = this.sum / this.count
    const rate = Math.round((usedJSHeapSize / average) * 100)

    this.sum += usedJSHeapSize
    this.count++

    if (rate >= MEM_RATE_THRESHOLD) {
      if (this.startTimestamp === 0) {
        this.startTimestamp = timestamp
      }
      if (this.rate < rate) {
        this.rate = rate
      }
    } else {
      this.build()
    }
  }
}
