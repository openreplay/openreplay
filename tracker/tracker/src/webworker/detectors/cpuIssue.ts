import Message, {
  Type,
  PerformanceTrack,
} from '../../common/messages.gen.js'
import type { Detector, ReportIssue } from './types.js'
import { cpuRate, timeDiff } from './performance.js'

/**
 * Port of backend/pkg/handlers/web/cpuIssue.go.
 *
 * Tracks stretches where CPU load (derived from PerformanceTrack ticks) stays
 * above CPU_THRESHOLD for at least CPU_MIN_DURATION_TRIGGER ms.
 *
 * NOTE: the Go version overwrites lastTimestamp *before* computing the interval,
 * so its dt is always 0 (cpuRate always 0 -> effectively disabled). We compute
 * dt against the previous sample so the rate is meaningful.
 */

const CPU_THRESHOLD = 70 // % out of 100
const CPU_MIN_DURATION_TRIGGER = 6 * 1000

export default class CpuIssueDetector implements Detector {
  readonly types: readonly number[] = [Type.PerformanceTrack]

  private startTimestamp = 0
  private startMessageId = 0
  private lastTimestamp = 0
  private maxRate = 0

  constructor(
    private readonly report: ReportIssue,
    private readonly url: () => string,
  ) {}

  private duration(): number {
    return this.lastTimestamp - this.startTimestamp
  }

  private reset(): void {
    this.startTimestamp = 0
    this.startMessageId = 0
    this.maxRate = 0
  }

  private build(): void {
    const start = this.startTimestamp
    const messageId = this.startMessageId
    const rate = this.maxRate
    const duration = this.duration()
    // matches Go `defer f.reset()`
    this.reset()
    if (start === 0 || duration < CPU_MIN_DURATION_TRIGGER) {
      return
    }
    this.report({
      type: 'cpu',
      contextString: this.url(),
      payload: JSON.stringify({ Duration: duration, Rate: rate }),
      timestamp: start,
      messageId,
    })
  }

  flush(_timestamp: number): void {
    this.build()
  }

  handle(message: Message, index: number, timestamp: number): void {
    const msg = message as PerformanceTrack
    const frames = msg[1]
    const ticks = msg[2]
    if (timestamp < this.lastTimestamp) {
      return
    }
    const prevTimestamp = this.lastTimestamp
    this.lastTimestamp = timestamp
    if (prevTimestamp === 0) {
      // first sample: no interval to measure the rate against yet
      return
    }
    const rate = cpuRate(ticks, timeDiff(timestamp, prevTimestamp))
    if (frames === -1 || ticks === -1 || rate < CPU_THRESHOLD) {
      this.build()
      return
    }
    if (this.startTimestamp === 0) {
      this.startTimestamp = timestamp
      this.startMessageId = index
    }
    if (this.maxRate < rate) {
      this.maxRate = rate
    }
  }
}
