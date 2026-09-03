// Do strong type WebWorker as soon as it is possible:
// https://github.com/microsoft/TypeScript/issues/14877
// At the moment "webworker" lib conflicts with  jest-environment-jsdom that uses "dom" lib
import { Type as MType } from '../common/messages.gen.js'
import { FromWorkerData } from '../common/interaction.js'

import QueueSender from './QueueSender.js'
import BatchWriter from './BatchWriter.js'
import Detectors from './detectors/index.js'

declare function postMessage(message: FromWorkerData, transfer?: any[]): void

enum WorkerStatus {
  NotActive,
  Starting,
  Stopping,
  Active,
  Stopped,
}

const AUTO_SEND_INTERVAL = 30 * 1000

let sender: QueueSender | null = null
let writer: BatchWriter | null = null
let detectors: Detectors | null = null
// Running batch timestamp, tracked from Timestamp messages and fed to detectors.
let detectorsTimestamp = 0
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let workerStatus: WorkerStatus = WorkerStatus.NotActive

function finalize(skipCompression?: boolean): void {
  if (!writer) {
    return
  }
  writer.finaliseBatch(skipCompression) // TODO: force sendAll?
}

/** End of session (stop / unload). Detectors flush first so an issue whose
 *  stretch is still open — a rage row, a high-CPU window — lands in the batch
 *  that's about to go instead of being dropped. Not done on the auto-send tick:
 *  that would cut every open stretch at a 30s boundary. */
function finalizeSession(skipCompression?: boolean): void {
  detectors?.flush(detectorsTimestamp)
  finalize(skipCompression)
}

function resetWriter(): void {
  if (writer) {
    writer.clean()
    // we don't need to wait for anything here since its sync
    writer = null
  }
}

function resetSender(): void {
  if (sender) {
    sender.clean()
    // allowing some time to send last batch
    setTimeout(() => {
      sender = null
    }, 20)
  }
}

function reset(): Promise<any> {
  return new Promise((res) => {
    workerStatus = WorkerStatus.Stopping
    if (sendIntervalID !== null) {
      clearInterval(sendIntervalID)
      sendIntervalID = null
    }
    resetWriter()
    resetSender()
    detectors = null
    detectorsTimestamp = 0
    setTimeout(() => {
      workerStatus = WorkerStatus.NotActive
      res(null)
    }, 100)
  })
}

function initiateRestart(): void {
  if ([WorkerStatus.Stopped, WorkerStatus.Stopping].includes(workerStatus)) return
  postMessage('a_stop')
  // eslint-disable-next-line
  reset().then(() => {
    postMessage('a_start')
  })
}

function initiateFailure(reason: string): void {
  postMessage({ type: 'failure', reason })
  void reset()
}

let sendIntervalID: ReturnType<typeof setInterval> | null = null
let restartTimeoutID: ReturnType<typeof setTimeout>

// @ts-ignore
self.onmessage = ({ data }: { data: ToWorkerData }): any => {
  if (data === 'stop') {
    finalizeSession()
    // eslint-disable-next-line
    reset().then(() => {
      workerStatus = WorkerStatus.Stopped
    })
    return
  }
  if (data === 'forceFlushBatch') {
    finalize()
    return
  }
  if (data === 'closing') {
    finalizeSession(true)
    // Unload: get the queued batches out now, oldest first.
    sender?.flushAll()
    return
  }
  if (Array.isArray(data)) {
    if (writer) {
      const w = writer
      data.forEach((message) => {
        if (message[0] === MType.SetPageVisibility) {
          if (message[1]) {
            // .hidden
            restartTimeoutID = setTimeout(() => initiateRestart(), 30 * 60 * 1000)
          } else {
            clearTimeout(restartTimeoutID)
          }
        }
        // Highest timestamp seen, not the last one: mirrors the Go dispatcher,
        // which fed detectors max(seen) so a backwards jump can't rewind them.
        if (message[0] === MType.Timestamp && message[1] > detectorsTimestamp) {
          detectorsTimestamp = message[1]
        }
        // Feed the just-written message (with its assigned stream index) to the
        // heuristic detectors. Index advances only when the message is actually
        // written, so control signals that don't push are skipped.
        const messageIndex = w.currentIndex
        w.writeMessage(message)
        if (detectors && w.currentIndex > messageIndex) {
          detectors.handle(message, messageIndex, detectorsTimestamp)
        }
      })
    } else {
      postMessage('not_init')
      initiateRestart()
    }
    return
  }

  if (data.type === 'start') {
    workerStatus = WorkerStatus.Starting
    sender = new QueueSender(
      data.ingestPoint,
      () => {
        // onUnauthorised
        initiateRestart()
      },
      (reason) => {
        // onFailure
        initiateFailure(reason)
      },
      data.connAttemptCount,
      data.connAttemptGap,
      data.pageNo,
      data.compressionThreshold,
    )
    writer = new BatchWriter(
      data.pageNo,
      data.timestamp,
      data.url,
      (batch, skipCompression, dataType = 'player', split) => {
        if (!sender) return
        // Always queued: skipCompression means "don't spend time on gzip", never
        // "jump the line" — batches must reach ingestion in order (#4836).
        sender.push(batch, dataType, split, skipCompression)
      },
      data.tabId,
      () => postMessage({ type: 'queue_empty' }),
      data.localDebug ?? false,
      (name, batch) => {
        postMessage({ type: 'local_save', name, batch }, [batch.buffer])
      },
    )
    // Tracker-side heuristics. Emitted IssueEvents are written back to the batch
    // so they get a real stream index and are routed via the analytics pipeline.
    detectors = new Detectors((msg) => writer?.writeMessage(msg), data.localDebug ?? false)
    detectorsTimestamp = 0
    if (sendIntervalID === null) {
      sendIntervalID = setInterval(finalize, AUTO_SEND_INTERVAL)
    }
    return (workerStatus = WorkerStatus.Active)
  }

  if (data.type === 'auth') {
    if (!sender) {
      console.debug('OR WebWorker: sender not initialised. Received auth.')
      initiateRestart()
      return
    }

    if (!writer) {
      console.debug('OR WebWorker: writer not initialised. Received auth.')
      initiateRestart()
      return
    }

    if (typeof data.compressionThreshold === 'number') {
      sender.setCompressionThreshold(data.compressionThreshold)
    }
    sender.authorise(data.token)
    data.beaconSizeLimit && writer.setBeaconSizeLimit(data.beaconSizeLimit)
    data.protocolVersion && writer.setProtocolVersion(data.protocolVersion)
    return
  }
}
