import Message, { Type } from '../../common/messages.gen.js'
import type { IssueEvent, SetPageLocation } from '../../common/messages.gen.js'
import type { Detector, IssueReport } from './types.js'
import DeadClickDetector from './deadClick.js'
import ClickRageDetector from './clickRage.js'
import CpuIssueDetector from './cpuIssue.js'
import MemoryIssueDetector from './memoryIssue.js'

export type { Detector, ReportIssue, IssueReport } from './types.js'

/**
 * Runs the tracker-side heuristic detectors (ported from
 * backend/pkg/handlers/web/*.go) inside the web worker, over the indexed
 * message stream. Because it runs after BatchWriter has assigned each message
 * its stream index, the emitted IssueEvent carries a real MessageID.
 *
 * When a detector fires it builds an IssueEvent message (the same one the Go
 * handlers emit) and hands it to `onIssue`, which writes it back to the batch
 * (routed through the analytics pipeline).
 */
export default class Detectors {
  private readonly detectors: Detector[]
  /** type -> detectors wanting it, so a DOM flood costs one lookup per message. */
  private readonly dispatch = new Map<number, Detector[]>()
  /** Latest page URL (from SetPageLocation); stamped on every emitted IssueEvent. */
  private currentUrl = ''

  constructor(
    private readonly onIssue: (msg: IssueEvent) => void,
    private readonly debug = false,
  ) {
    const report = (issue: IssueReport) => {
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log('[OR Heuristics]', issue.type, issue)
      }
      this.onIssue([
        Type.IssueEvent,
        issue.messageId ?? 0,
        issue.timestamp,
        issue.type,
        issue.contextString ?? '',
        issue.context ?? '',
        issue.payload ?? '',
        this.currentUrl,
      ])
    }
    // cpu/memory report the page as their contextString; they read it from here
    // at build time instead of each tracking SetPageLocation separately.
    const url = () => this.currentUrl

    this.detectors = [
      new DeadClickDetector(report),
      new ClickRageDetector(report),
      new CpuIssueDetector(report, url),
      new MemoryIssueDetector(report, url),
    ]
    for (const detector of this.detectors) {
      for (const type of detector.types) {
        const existing = this.dispatch.get(type)
        if (existing) {
          existing.push(detector)
        } else {
          this.dispatch.set(type, [detector])
        }
      }
    }
  }

  handle(message: Message, index: number, timestamp: number): void {
    if (message[0] === Type.SetPageLocation) {
      this.currentUrl = (message as SetPageLocation)[1]
    }
    const targets = this.dispatch.get(message[0])
    if (targets === undefined) {
      return
    }
    for (const detector of targets) {
      detector.handle(message, index, timestamp)
    }
  }

  /** Session end / unload: emit every still-open issue before the last batch goes. */
  flush(): void {
    for (const detector of this.detectors) {
      detector.flush()
    }
  }
}
