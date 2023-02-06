import type Message from '../common/messages.gen.js'
import { Type as MType } from '../common/messages.gen.js'
import { ToWorkerData, FromWorkerData } from '../common/interaction.js'

import QueueSender from './QueueSender.js'
import BatchWriter from './BatchWriter.js'

declare function postMessage(message: FromWorkerData): void

enum WorkerStatus {
  NotActive,
  Starting,
  Stopping,
  Active,
}

const AUTO_SEND_INTERVAL = 10 * 1000

let sender: QueueSender | null = null
let writer: BatchWriter | null = null
let workerStatus: WorkerStatus = WorkerStatus.NotActive

function finalize(): void {
  if (!writer) {
    return
  }
  writer.finaliseBatch() // TODO: force sendAll?
}

function resetWriter(): void {
  if (writer) {
    writer.clean()
    writer = null
  }
}

function resetSender(): void {
  if (sender) {
    sender.clean()
    sender = null
  }
}

function reset(): void {
  workerStatus = WorkerStatus.Stopping
  if (sendIntervalID !== null) {
    clearInterval(sendIntervalID)
    sendIntervalID = null
  }
  resetWriter()
  resetSender()
  workerStatus = WorkerStatus.NotActive
}

function initiateRestart(): void {
  postMessage('restart')
  reset()
}
function initiateFailure(reason: string): void {
  postMessage({ type: 'failure', reason })
  reset()
}

let sendIntervalID: ReturnType<typeof setInterval> | null = null
let restartTimeoutID: ReturnType<typeof setTimeout>

self.onmessage = ({ data }: MessageEvent<ToWorkerData>): any => {
  if (data == null) {
    finalize()
    return
  }
  if (data === 'stop') {
    finalize()
    reset()
    return
  }

  if (Array.isArray(data)) {
    // Message[]
    if (!writer) {
      throw new Error('WebWorker: writer not initialised. Service Should be Started.')
    }
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
      w.writeMessage(message)
    })
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
    )
    writer = new BatchWriter(
      data.pageNo,
      data.timestamp,
      data.url,
      // onBatch
      (batch) => sender && sender.push(batch),
    )
    if (sendIntervalID === null) {
      sendIntervalID = setInterval(finalize, AUTO_SEND_INTERVAL)
    }
    return (workerStatus = WorkerStatus.Active)
  }

  if (data.type === 'auth') {
    if (!sender) {
      throw new Error('WebWorker: sender not initialised. Received auth.')
    }
    if (!writer) {
      throw new Error('WebWorker: writer not initialised. Received auth.')
    }
    sender.authorise(data.token)
    data.beaconSizeLimit && writer.setBeaconSizeLimit(data.beaconSizeLimit)
    return
  }
}
