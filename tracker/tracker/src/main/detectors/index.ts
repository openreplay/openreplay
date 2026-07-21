import type App from '../app/index.js'
import Message, { Type, Timestamp } from '../../common/messages.gen.js'
import { IssueEvent } from '../app/messages.gen.js'
import type { Detector, ReportIssue } from './types.js'
import DeadClickDetector from './deadClick.js'
import ClickRageDetector from './clickRage.js'
import CpuIssueDetector from './cpuIssue.js'
import MemoryIssueDetector from './memoryIssue.js'

export type { Detector, ReportIssue, IssueReport } from './types.js'

/**
 * Wires the tracker-side heuristic detectors (ported from
 * backend/pkg/handlers/web/*.go) onto the app's message stream.
 *
 * Reuses the existing commit hook: every committed batch is prefixed with a
 * Timestamp message, so we track the running timestamp exactly like the backend
 * does and feed each message through in order. Batches commit ~every 30ms —
 * plenty granular (smallest detector window is click rage at 300ms).
 *
 * When a detector fires it produces an IssueEvent message (via ReportIssue),
 * the same message the Go handlers emit, routed through the analytics pipeline.
 */
export default function setupDetectors(app: App): void {
  const report: ReportIssue = (issue) => {
    app.debug.log('[OR Heuristics]', issue.type, issue)
    app.send(
      IssueEvent(
        issue.messageId ?? 0,
        issue.timestamp,
        issue.type,
        issue.contextString ?? '',
        issue.context ?? '',
        issue.payload ?? '',
        issue.url ?? '',
      ),
    )
  }

  const detectors: Detector[] = [
    new DeadClickDetector(report),
    new ClickRageDetector(report),
    new CpuIssueDetector(report),
    new MemoryIssueDetector(report),
  ]

  // Running timestamp, updated from Timestamp messages, persisted across batches.
  let lastTimestamp = 0

  app.attachCommitCallback((messages: Array<Message>) => {
    for (const message of messages) {
      if (message[0] === Type.Timestamp) {
        lastTimestamp = (message as Timestamp)[1]
      }
      for (const detector of detectors) {
        detector.handle(message, lastTimestamp)
      }
    }
  })
}
