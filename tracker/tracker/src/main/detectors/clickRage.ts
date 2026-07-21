import Message, {
  Type,
  MouseClick,
  SetPageLocation,
} from '../../common/messages.gen.js'
import type { Detector, ReportIssue } from './types.js'

/**
 * Port of backend/pkg/handlers/web/clickRage.go.
 *
 * Fires when the same element is clicked >= MIN_CLICKS_IN_A_ROW times, each
 * within MAX_TIME_DIFF ms of the previous one.
 *
 * The backend reads the URL off the MouseClick message; the tracker's
 * MouseClick has no URL field, so we track the current page URL from
 * SetPageLocation instead (kept across resets, unlike the Go `url` field).
 */

const MAX_TIME_DIFF = 300
const MIN_CLICKS_IN_A_ROW = 3

export default class ClickRageDetector implements Detector {
  private lastTimestamp = 0
  private lastLabel = ''
  private lastSelector = ''
  private firstInARowTimestamp = 0
  private countsInARow = 0
  private currentUrl = ''

  constructor(private readonly report: ReportIssue) {}

  private reset(): void {
    this.lastTimestamp = 0
    this.lastLabel = ''
    this.lastSelector = ''
    this.firstInARowTimestamp = 0
    this.countsInARow = 0
  }

  private build(): void {
    const count = this.countsInARow
    const label = this.lastLabel
    const selector = this.lastSelector
    const firstTs = this.firstInARowTimestamp
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
      url: this.currentUrl,
      timestamp: firstTs,
    })
  }

  handle(message: Message, timestamp: number): void {
    const type = message[0]
    if (type === Type.SetPageLocation) {
      this.currentUrl = (message as SetPageLocation)[1]
      return
    }
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
    this.countsInARow = 1
  }
}
