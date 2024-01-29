import { Type as MType } from '../../../common/messages.gen.js'
import { FromWorkerData, ToWorkerData } from '../../../common/interaction.js'
import App from '../index.js'
import QueueSender from './QueueSender.js'

enum WorkerStatus {
  NotActive,
  Starting,
  Stopping,
  Active,
  Stopped,
}

const AUTO_SEND_INTERVAL = 10 * 1000

interface TypedWorker extends Omit<Worker, 'postMessage'> {
  postMessage(data: ToWorkerData): void
}

const rebroadcastEvents = ['queue_empty', 'not_init', 'restart']

class WebWorkerManager {
  sendIntervalID: ReturnType<typeof setInterval> | null = null
  restartTimeoutID: ReturnType<typeof setTimeout> | null = null
  workerStatus: WorkerStatus = WorkerStatus.NotActive

  sender: QueueSender | null = null

  constructor(
    private readonly app: App,
    private readonly worker: TypedWorker,
    private readonly onError: (ctx: string, e: any) => any,
  ) {
    this.worker.onerror = (e) => {
      this.onError('webworker_error', e)
    }
    this.worker.onmessage = ({ data }: MessageEvent<FromWorkerData>) => {
      if (rebroadcastEvents.includes(data.type)) {
        this.postMessage(data)
        return
      }
      switch (data.type) {
        case 'status':
          this.workerStatus = data.data
          return
        case 'batch_ready':
          if (this.sender) {
            this.app.debug.log('Openreplay: msg batch to sender: ', data.data)
            this.sender.push(data.data)
          }
      }
    }
  }

  finalize = (): void => {
    this.worker.postMessage({ type: 'writer_finalize' })
  }

  resetWebWorker = (): void => {
    this.worker.postMessage({ type: 'reset_writer' })
  }

  resetSender = (): void => {
    if (!this.sender) {
      return
    }
    this.sender.clean()
    setTimeout(() => {
      this.sender = null
    }, 20)
  }

  reset = (): void => {
    this.workerStatus = WorkerStatus.Stopping
    if (this.sendIntervalID !== null) {
      clearInterval(this.sendIntervalID)
      this.sendIntervalID = null
    }
    this.resetSender()
    this.resetWebWorker()
    setTimeout(() => {
      this.workerStatus = WorkerStatus.NotActive
    }, 100)
  }

  initiateRestart = (): void => {
    if (this.workerStatus === WorkerStatus.Stopped) {
      return
    }
    this.postMessage({ type: 'restart' })
    this.reset()
  }

  initiateFailure = (reason: string): void => {
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

  processMessage = (data: ToWorkerData | null): void => {
    if (data === null) {
      this.finalize()
      return
    }

    if (data.type === 'stop') {
      this.finalize()
      this.reset()
      return
    }

    if (data.type === 'batch' && Array.isArray(data.data)) {
      data.data.forEach((message) => {
        if (message[0] === MType.SetPageVisibility) {
          // document is hidden
          if (message[1]) {
            this.restartTimeoutID = setTimeout(() => this.initiateRestart(), 30 * 60 * 1000)
          } else {
            if (this.restartTimeoutID) {
              clearTimeout(this.restartTimeoutID)
            }
          }
        }
      })
      this.worker.postMessage({ type: 'to_writer', data: data.data })
    }

    // @ts-ignore
    if (data.type === 'compressed') {
      if (!this.sender) {
        console.debug('OR Worker: sender not init. Compressed batch')
        return this.initiateRestart()
      }
      if (data.batch) {
        this.sender?.sendCompressed(data.batch)
      }
    }
    if (data.type === 'uncompressed') {
      if (!this.sender) {
        console.debug('OR Worker: sender not init. Compressed batch.')
        this.initiateRestart()
        return
      }
      if (data.batch) {
        this.sender.sendUncompressed(data.batch)
      }
    }

    if (data.type === 'start') {
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
          this.postMessage({ type: 'compress', batch })
        },
      )
      if (this.sendIntervalID === null) {
        this.sendIntervalID = setInterval(this.finalize, AUTO_SEND_INTERVAL)
      }
      this.worker.postMessage(data)
      return
    }

    if (data.type === 'auth') {
      if (!this.sender) {
        console.debug('OR WebWorker: sender not initialised. Received auth.')
        this.initiateRestart()
        return
      }

      this.sender.authorise(data.token)
      if (data.beaconSizeLimit) {
        this.worker.postMessage({ type: 'beacon_size_limit', data: data.beaconSizeLimit })
      }
      return
    }
  }

  postMessage = (data: FromWorkerData) => {
    this.app.handleWorkerMsg(data)
  }
}

export default WebWorkerManager
