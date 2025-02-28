import { Type as MType } from '../common/messages.gen.js'
import { FromWorkerData } from '../common/interaction.js'

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

export default class NetworkWorker {
  sender: QueueSender | null = null
  writer: BatchWriter | null = null
  status: WorkerStatus = WorkerStatus.NotActive
  sendIntervalID: ReturnType<typeof setInterval> | null = null
  restartTimeoutID: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly app: any) {}

  processEvent(data: any): void {
    if (data === null) {
      this.finalize()
      return
    }
    if (data.type === 'start') {
      this.status = WorkerStatus.Starting
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
          this.sendEvent({ type: 'compress', batch })
        },
        data.pageNo,
      )
      this.writer = new BatchWriter(
        data.pageNo,
        data.timestamp,
        data.url,
        (batch) => {
          this.sender && this.sender.push(batch)
        },
        data.tabId,
        () => this.sendEvent({ type: 'queue_empty' }),
      )
      if (this.sendIntervalID === null) {
        this.sendIntervalID = setInterval(this.finalize, AUTO_SEND_INTERVAL)
      }
      this.status = WorkerStatus.Active
      return
    }
    if (data === 'stop') {
      this.finalize()
      // eslint-disable-next-line
      this.reset().then(() => {
        this.status = WorkerStatus.Stopped
      })
      return
    }
    if (data === 'forceFlushBatch') {
      this.finalize()
      return
    }
    if (Array.isArray(data)) {
      if (this.writer) {
        const w = this.writer
        data.forEach((message) => {
          if (message[0] === MType.SetPageVisibility) {
            if (message[1]) {
              // .hidden
              this.restartTimeoutID = setTimeout(() => this.initiateRestart(), 30 * 60 * 1000)
            } else if (this.restartTimeoutID) {
              clearTimeout(this.restartTimeoutID)
            }
          }
          w.writeMessage(message)
        })
      } else {
        this.sendEvent('not_init')
        this.initiateRestart()
      }
      return
    }
    if (data.type === 'compressed') {
      if (!this.sender) {
        console.debug('OR WebWorker: sender not initialised. Compressed batch.')
        this.initiateRestart()
        return
      }
      data.batch && this.sender.sendCompressed(data.batch)
    }
    if (data.type === 'uncompressed') {
      if (!this.sender) {
        console.debug('OR WebWorker: sender not initialised. Uncompressed batch.')
        this.initiateRestart()
        return
      }
      data.batch && this.sender.sendUncompressed(data.batch)
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

  finalize(): void {
    if (!this.writer) {
      return
    }
    this.writer.finaliseBatch()
  }

  resetWriter(): void {
    if (this.writer) {
      this.writer.clean()
      // we don't need to wait for anything here since its sync
      this.writer = null
    }
  }

  resetSender(): void {
    if (this.sender) {
      this.sender.clean()
      // allowing some time to send last batch
      setTimeout(() => {
        this.sender = null
      }, 20)
    }
  }

  reset(): Promise<any> {
    return new Promise((res) => {
      this.status = WorkerStatus.Stopping
      if (this.sendIntervalID !== null) {
        clearInterval(this.sendIntervalID)
        this.sendIntervalID = null
      }
      this.resetWriter()
      this.resetSender()
      setTimeout(() => {
        this.status = WorkerStatus.NotActive
        res(null)
      }, 100)
    })
  }

  initiateRestart(): void {
    if ([WorkerStatus.Stopped, WorkerStatus.Stopping].includes(this.status)) return
    this.sendEvent('a_stop')
    // eslint-disable-next-line
    this.reset().then(() => {
      this.sendEvent('a_start')
    })
  }

  initiateFailure(reason: string): void {
    this.sendEvent({ type: 'failure', reason })
    void this.reset()
  }

  sendEvent(data: any): void {
    this.app.processEvent(data)
  }
}
