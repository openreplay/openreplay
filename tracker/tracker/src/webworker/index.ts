// Do strong type WebWorker as soon as it is possible:
// https://github.com/microsoft/TypeScript/issues/14877
// At the moment "webworker" lib conflicts with  jest-environment-jsdom that uses "dom" lib
import Message from '../common/messages.gen.js'
import { FromWorkerData } from '../common/interaction.js'

import BatchWriter from './BatchWriter.js'

declare function postMessage(message: FromWorkerData, transfer?: any[]): void

enum WorkerStatus {
  NotActive,
  Starting,
  Stopping,
  Active,
  Stopped,
}

const AUTO_SEND_INTERVAL = 10 * 1000

let writer: BatchWriter | null = null
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let workerStatus: WorkerStatus = WorkerStatus.NotActive

function updateStatus(status: WorkerStatus) {
  postMessage({ type: 'status', data: status })
  workerStatus = status
}

function finalize(): void {
  if (!writer) {
    return
  }
  writer.finaliseBatch() // TODO: force sendAll?
}

function resetWriter(): void {
  if (writer) {
    writer.clean()
    // we don't need to wait for anything here since its sync
    writer = null
  }
}

function reset(): void {
  updateStatus(WorkerStatus.Stopping)
  if (sendIntervalID !== null) {
    clearInterval(sendIntervalID)
    sendIntervalID = null
  }
  resetWriter()
  setTimeout(() => {
    updateStatus(WorkerStatus.NotActive)
  }, 100)
}

function initiateRestart(): void {
  if (workerStatus === WorkerStatus.Stopped) return
  postMessage({ type: 'restart' })
  reset()
}

let sendIntervalID: ReturnType<typeof setInterval> | null = null

// @ts-ignore
self.onmessage = ({ data }: { data: ToWorkerData }): any => {
  if (data == null) {
    finalize()
    return
  }
  if (data.type === 'writer_finalize') {
    finalize()
    return (workerStatus = WorkerStatus.Stopped)
  }
  if (data.type === 'reset_writer') {
    reset()
    return
  }
  if (data.type === 'forceFlushBatch') {
    finalize()
    return
  }
  if (data.type === 'to_writer') {
    let failed = false
    data.data.forEach((message: Message) => {
      if (writer) {
        writer.writeMessage(message)
      } else {
        if (!failed) {
          failed = true
          postMessage({ type: 'not_init' })
          initiateRestart()
        }
      }
    })
  }

  if (data.type === 'start') {
    workerStatus = WorkerStatus.Starting
    writer = new BatchWriter(
      data.pageNo,
      data.timestamp,
      data.url,
      (batch) => {
        postMessage({ type: 'batch_ready', data: batch }, [batch.buffer])
      },
      data.tabId,
      () => postMessage({ type: 'queue_empty' }),
    )
    if (sendIntervalID === null) {
      sendIntervalID = setInterval(finalize, AUTO_SEND_INTERVAL)
    }
    return (workerStatus = WorkerStatus.Active)
  }

  if (data.type === 'beacon_size_limit') {
    if (!writer) {
      console.debug('OR WebWorker: writer not initialised. Received auth.')
      initiateRestart()
      return
    }

    if (data.beaconSizeLimit) {
      writer.setBeaconSizeLimit(data.beaconSizeLimit)
    }
    return
  }

  if (data.type === 'restart') {
    initiateRestart()
  }
}
