import type Message from '../../common/messages.gen.js'

export type DetectorLogger = (...args: any[]) => void

/**
 * Tracker-side port of the backend heuristic detectors
 * (backend/pkg/handlers/web/*.go). Each detector inspects the stream of
 * outgoing messages and, instead of emitting an IssueEvent, logs when it would
 * have fired — so we can validate the behaviour client-side before wiring up
 * any real event emission.
 */
export interface Detector {
  /**
   * Called for every outgoing message once recording is active.
   * `timestamp` is the send-time timestamp (app.timestamp()), matching the
   * backend Handle(message, timestamp) signature.
   */
  handle(message: Message, timestamp: number): void
}
