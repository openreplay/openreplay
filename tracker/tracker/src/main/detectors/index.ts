import type App from '../app/index.js'
import Message, { Type, Timestamp } from '../../common/messages.gen.js'
import type { Detector } from './types.js'
import DeadClickDetector from './deadClick.js'
import ClickRageDetector from './clickRage.js'
import CpuIssueDetector from './cpuIssue.js'
import MemoryIssueDetector from './memoryIssue.js'

export type { Detector, DetectorLogger } from './types.js'

/**
 * Wires the tracker-side heuristic detectors (ported from
 * backend/pkg/handlers/web/*.go) onto the app's message stream.
 *
 * Reuses the existing commit hook instead of a bespoke per-message hook: every
 * committed batch is prefixed with a Timestamp message, so we track the running
 * timestamp exactly like the backend does and feed each message through in
 * order. Batches are committed ~every 30ms — plenty granular for these
 * detectors (smallest window is click rage at 300ms).
 *
 * For now they only LOG when they would fire (via app.debug.log, gated by the
 * `__debug__` option) — nothing is sent to the backend yet. Set
 * `__debug__: 4` (LogLevel.Log) or higher to see the output.
 */
export default function setupDetectors(app: App): void {
  const log = (...args: any[]) => app.debug.log('[OR Heuristics]', ...args)

  const detectors: Detector[] = [
    new DeadClickDetector(log),
    new ClickRageDetector(log),
    new CpuIssueDetector(log),
    new MemoryIssueDetector(log),
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
