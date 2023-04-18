// Do strong type WebWorker as soon as it is possible:
// https://github.com/microsoft/TypeScript/issues/14877
// At the moment "webworker" lib conflicts with  jest-environment-jsdom that uses "dom" lib
import { Type as MType } from '../common/messages.gen.js'
import { ToWorkerData, FromWorkerData } from '../common/interaction.js'

import QueueSender from './QueueSender.js'
import BatchWriter from './BatchWriter.js'

declare function postMessage(message: FromWorkerData, transfer?: any[]): void

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
// let afterSleepRestarts = 0
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

// @ts-ignore
self.onmessage = ({ data }: any): any => {
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
    if (writer !== null) {
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
    }
    if (!writer) {
      postMessage('not_init')
      initiateRestart()
    }
    return
  }

  if (data.type === 'compressed') {
    if (!sender) {
      console.debug('WebWorker: sender not initialised. Received auth.')
      initiateRestart()
      return
    }
    sender.sendCompressed(data.batch)
  }
  if (data.type === 'uncompressed') {
    if (!sender) {
      console.debug('WebWorker: sender not initialised. Received auth.')
      initiateRestart()
      return
    }
    sender.sendUncompressed(data.batch)
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
      (batch) => {
        postMessage({ type: 'compress', batch }, [batch.buffer])
      },
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
      console.debug('WebWorker: sender not initialised. Received auth.')
      initiateRestart()
      return
    }

    if (!writer) {
      console.debug('WebWorker: writer not initialised. Received auth.')
      initiateRestart()
      return
    }

    sender.authorise(data.token)
    data.beaconSizeLimit && writer.setBeaconSizeLimit(data.beaconSizeLimit)
    return
  }
}
