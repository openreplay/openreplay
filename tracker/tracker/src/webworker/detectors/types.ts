import type Message from '../../common/messages.gen.js'

/**
 * A detected issue, mirroring the fields of the backend IssueEvent message
 * (backend/pkg/handlers/web/*.go -> messages.IssueEvent). The Detectors layer
 * turns this into an IssueEvent message and writes it to the batch.
 */
export interface IssueReport {
  /** IssueEvent.Type, e.g. "dead_click" | "click_rage" | "cpu" | "memory" */
  type: string
  timestamp: number
  contextString?: string
  context?: string
  /** IssueEvent.Payload — JSON string, same shape as the Go detector's payload */
  payload?: string
  /** IssueEvent.MessageID — index of the source message that triggered the issue */
  messageId?: number
}

export type ReportIssue = (issue: IssueReport) => void

/**
 * Tracker-side port of the backend heuristic detectors
 * (backend/pkg/handlers/web/*.go). Runs inside the web worker, where each
 * message already has its final stream index — so the emitted IssueEvent can
 * carry a real MessageID, exactly like the Go handlers.
 */
export interface Detector {
  /**
   * Message types this detector wants, mirroring the Go MessageTypes(). The
   * Detectors layer indexes on these so an unrelated message costs one map
   * lookup instead of a call into every detector.
   */
  readonly types: readonly number[]
  /**
   * Called for every written message of one of `types` once recording is active.
   * @param message   the message
   * @param index     the message's stream index (its MessageID / MsgID)
   * @param timestamp the running batch timestamp
   */
  handle(message: Message, index: number, timestamp: number): void
  /**
   * Emit whatever is still pending. Mirrors the Go handlers' external Build()
   * call on SessionEnd — without it, an issue whose stretch is still open when
   * the session ends is never reported.
   */
  flush(): void
}
