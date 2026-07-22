import Message, {
  Type,
  MouseClick,
} from '../../common/messages.gen.js'
import type { Detector, ReportIssue } from './types.js'

/**
 * Port of backend/pkg/handlers/web/clickRage.go.
 *
 * Fires when the same element is clicked >= MIN_CLICKS_IN_A_ROW times, each
 * within MAX_TIME_DIFF ms of the previous one.
 *
 * URL is stamped centrally by the Detectors layer (latest SetPageLocation), so
 * this detector doesn't track it.
 */

const MAX_TIME_DIFF = 300
const MIN_CLICKS_IN_A_ROW = 3

export default class ClickRageDetector implements Detector {
  private lastTimestamp = 0
  private lastLabel = ''
  private lastSelector = ''
  private firstInARowTimestamp = 0
  private firstInARowMessageId = 0
  private countsInARow = 0

  constructor(private readonly report: ReportIssue) {}

  private reset(): void {
    this.lastTimestamp = 0
    this.lastLabel = ''
    this.lastSelector = ''
    this.firstInARowTimestamp = 0
    this.firstInARowMessageId = 0
    this.countsInARow = 0
  }

  private build(): void {
    const count = this.countsInARow
    const label = this.lastLabel
    const selector = this.lastSelector
    const firstTs = this.firstInARowTimestamp
    const messageId = this.firstInARowMessageId
    // matches Go `defer crd.reset()`
    this.reset()
    if (count < MIN_CLICKS_IN_A_ROW) {
      return
    }
    this.report({
      type: 'click_rage',
      contextString: label,
      context: selector, // used by the tags filter
      payload: JSON.stringify({ Count: count }),
      timestamp: firstTs,
      messageId,
    })
  }

  handle(message: Message, index: number, timestamp: number): void {
    const type = message[0]
    if (type !== Type.MouseClick) {
      return
    }
    const msg = message as MouseClick
    const label = msg[3]
    const selector = msg[4]
    if (label === '') {
      this.build()
      return
    }
    if (this.lastLabel === label && timestamp - this.lastTimestamp < MAX_TIME_DIFF) {
      this.lastTimestamp = timestamp
      this.countsInARow += 1
      return
    }
    this.build()
    this.lastTimestamp = timestamp
    this.lastLabel = label
    this.lastSelector = selector
    this.firstInARowTimestamp = timestamp
    this.firstInARowMessageId = index
    this.countsInARow = 1
  }
}
