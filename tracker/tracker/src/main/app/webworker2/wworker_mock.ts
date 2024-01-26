import { Type as MType } from '../../../common/messages.gen.js'
import { FromWorkerData, ToWorkerData } from '../../../common/interaction.js'
import App from '../index.js'

import QueueSender from './QueueSender.js'
import BatchWriter from './BatchWriter.js'

enum WorkerStatus {
  NotActive,
  Starting,
  Stopping,
  Active,
  Stopped,
}

const AUTO_SEND_INTERVAL = 10 * 1000

class WorkerMock {
  sendIntervalID: ReturnType<typeof setInterval> | null = null
  restartTimeoutID: ReturnType<typeof setTimeout> | null = null
  workerStatus: WorkerStatus = WorkerStatus.NotActive

  sender: QueueSender | null = null
  writer: BatchWriter | null = null

  constructor(private readonly app: App) {}

  finalize(): void {
    if (!this.writer) {
      return
    }
    this.writer.finaliseBatch()
  }

  resetWriter() {
    if (!this.writer) {
      return
    }
    this.writer.clean()
    this.writer = null
  }

  resetSender() {
    if (!this.sender) {
      return
    }
    this.sender.clean()
    setTimeout(() => {
      this.sender = null
    }, 20)
  }

  reset() {
    this.workerStatus = WorkerStatus.Stopping
    if (this.sendIntervalID !== null) {
      clearInterval(this.sendIntervalID)
      this.sendIntervalID = null
    }
    this.resetSender()
    this.resetWriter()
    setTimeout(() => {
      this.workerStatus = WorkerStatus.NotActive
    }, 100)
  }

  initiateRestart(): void {
    if (this.workerStatus === WorkerStatus.Stopped) {
      return
    }
    this.postMessage('restart')
    this.reset()
  }

  initiateFailure(reason: string): void {
    if (
      [WorkerStatus.Stopped, WorkerStatus.Stopping, WorkerStatus.NotActive].includes(
        this.workerStatus,
      )
    ) {
      return
    }
    this.postMessage({ type: 'failure', reason })
    this.reset()
  }

  processMessage(data: ToWorkerData) {
    if (data === null) {
      this.finalize()
      return
    }

    if (data === 'stop') {
      this.finalize()
      this.reset()
      return
    }

    if (Array.isArray(data)) {
      if (!this.writer) {
        this.postMessage('not_init')
        return this.initiateRestart()
      }
      data.forEach((message) => {
        if (message[0] === MType.SetPageVisibility) {
          if (message[1]) {
            // .hidden
            this.restartTimeoutID = setTimeout(() => this.initiateRestart(), 30 * 60 * 1000)
          } else {
            if (this.restartTimeoutID) {
              clearTimeout(this.restartTimeoutID)
            }
          }
        }
        this.writer?.writeMessage(message)
      })
    }

    // @ts-ignore
    if ('type' in data) {
      if (data.type === 'compressed') {
        if (!this.sender) {
          console.debug('OR Worker: sender not init. Compressed batch')
          return this.initiateRestart()
        }
        data.batch && this.sender?.sendCompressed(data.batch)
      }
      if (data.type === 'uncompressed') {
        if (!this.sender) {
          console.debug('OR Worker: sender not init. Compressed batch.')
          this.initiateRestart()
          return
        }
        data.batch && this.sender.sendUncompressed(data.batch)
      }

      if (data.type === 'start') {
        this.workerStatus = WorkerStatus.Starting
        this.sender = new QueueSender(
          data.ingestPoint,
          () => {
            // onUnauthorised
            this.initiateRestart()
          },
          (reason) => {
            // onFailure
            this.initiateFailure(reason)
          },
          data.connAttemptCount,
          data.connAttemptGap,
          (batch) => {
            postMessage({ type: 'compress', batch })
          },
        )
        this.writer = new BatchWriter(
          data.pageNo,
          data.timestamp,
          data.url,
          (batch) => {
            this.sender?.push(batch)
          },
          data.tabId,
          () => postMessage({ type: 'queue_empty' }),
        )
        if (this.sendIntervalID === null) {
          this.sendIntervalID = setInterval(this.finalize, AUTO_SEND_INTERVAL)
        }
        return (this.workerStatus = WorkerStatus.Active)
      }

      if (data.type === 'auth') {
        if (!this.sender) {
          console.debug('OR WebWorker: sender not initialised. Received auth.')
          this.initiateRestart()
          return
        }

        if (!this.writer) {
          console.debug('OR WebWorker: writer not initialised. Received auth.')
          this.initiateRestart()
          return
        }

        this.sender.authorise(data.token)
        data.beaconSizeLimit && this.writer.setBeaconSizeLimit(data.beaconSizeLimit)
        return
      }
    }
  }

  postMessage(data: FromWorkerData) {
    this.app.handleWorkerMsg(data)
  }
}

export default WorkerMock
