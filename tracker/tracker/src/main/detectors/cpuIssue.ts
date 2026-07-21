import Message, {
  Type,
  PerformanceTrack,
  SetPageLocation,
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
 * dt against the previous sample so the rate is meaningful for debugging.
 */

const CPU_THRESHOLD = 70 // % out of 100
const CPU_MIN_DURATION_TRIGGER = 6 * 1000

export default class CpuIssueDetector implements Detector {
  private startTimestamp = 0
  private lastTimestamp = 0
  private maxRate = 0
  private contextString = ''

  constructor(private readonly report: ReportIssue) {}

  private duration(): number {
    return this.lastTimestamp - this.startTimestamp
  }

  private reset(): void {
    this.startTimestamp = 0
    this.maxRate = 0
  }

  private build(): void {
    const start = this.startTimestamp
    const rate = this.maxRate
    const duration = this.duration()
    // matches Go `defer f.reset()`
    this.reset()
    if (start === 0 || duration < CPU_MIN_DURATION_TRIGGER) {
      return
    }
    this.report({
      type: 'cpu',
      contextString: this.contextString,
      payload: JSON.stringify({ Duration: duration, Rate: rate }),
      timestamp: start,
    })
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
    }
    if (this.maxRate < rate) {
      this.maxRate = rate
    }
  }
}
