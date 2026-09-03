import Message, {
  Type,
  PerformanceTrack,
} from '../../common/messages.gen.js'
import type { Detector, ReportIssue } from './types.js'

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
  readonly types: readonly number[] = [Type.PerformanceTrack]

  private startTimestamp = 0
  private startMessageId = 0
  private rate = 0
  private count = 0
  private sum = 0

  constructor(
    private readonly report: ReportIssue,
    private readonly url: () => string,
  ) {}

  private reset(): void {
    this.startTimestamp = 0
    this.startMessageId = 0
    this.rate = 0
  }

  private build(): void {
    if (this.startTimestamp === 0) {
      return
    }
    this.report({
      type: 'memory',
      contextString: this.url(),
      payload: JSON.stringify({ Rate: this.rate - 100 }),
      timestamp: this.startTimestamp,
      messageId: this.startMessageId,
    })
    this.reset()
  }

  flush(): void {
    this.build()
  }

  handle(message: Message, index: number, timestamp: number): void {
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
        this.startMessageId = index
      }
      if (this.rate < rate) {
        this.rate = rate
      }
    } else {
      this.build()
    }
  }
}
