import type Message from '../../common/messages.gen.js'

/**
 * A detected issue, mirroring the fields of the backend IssueEvent message
 * (backend/pkg/handlers/web/*.go -> messages.IssueEvent). The setup layer turns
 * this into an IssueEvent message and sends it.
 */
export interface IssueReport {
  /** IssueEvent.Type, e.g. "dead_click" | "click_rage" | "cpu" | "memory" */
  type: string
  timestamp: number
  contextString?: string
  context?: string
  /** IssueEvent.Payload — JSON string, same shape as the Go detector's payload */
  payload?: string
  url?: string
  /** IssueEvent.MessageID — backend derives the real index; tracker has none, so 0 */
  messageId?: number
}

export type ReportIssue = (issue: IssueReport) => void

/**
 * Tracker-side port of the backend heuristic detectors
 * (backend/pkg/handlers/web/*.go). Each detector inspects the stream of
 * outgoing messages and reports issues via ReportIssue, which the setup layer
 * turns into IssueEvent messages — the same messages the Go handlers emit.
 */
export interface Detector {
  /**
   * Called for every outgoing message once recording is active.
   * `timestamp` is the send-time timestamp, matching the backend
   * Handle(message, timestamp) signature.
   */
  handle(message: Message, timestamp: number): void
}
