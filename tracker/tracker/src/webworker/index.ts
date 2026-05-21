// Do strong type WebWorker as soon as it is possible:
// https://github.com/microsoft/TypeScript/issues/14877
// At the moment "webworker" lib conflicts with  jest-environment-jsdom that uses "dom" lib
import { Type as MType } from '../common/messages.gen.js'
import { FromWorkerData } from '../common/interaction.js'

import QueueSender from './QueueSender.js'
import BatchWriter from './BatchWriter.js'

declare function postMessage(message: FromWorkerData, transfer?: any[]): void

enum WorkerStatus {
  NotActive,
  Starting,
  Stopping,
  Active,
  Stopped,
}

const AUTO_SEND_INTERVAL = 30 * 1000

/** Read varint-encoded message types from a raw batch for debug logging. */
function debugReadBatchTypes(batch: Uint8Array): number[] {
  const types: number[] = []
  let p = 0

  const readUint = (): number | null => {
    let val = 0, shift = 0
    while (p < batch.length) {
      const b = batch[p++]
      val |= (b & 0x7f) << shift
      if ((b & 0x80) === 0) return val
      shift += 7
    }
    return null
  }

  const readSize = (): number | null => {
    if (p + 3 > batch.length) return null
    const s = batch[p] | (batch[p + 1] << 8) | (batch[p + 2] << 16)
    p += 3
    return s
  }

  // BatchMetadata (type 81) and PartitionedMessage (type 82) have no size prefix
  const NO_SIZE = new Set([80, 81, 82])

  while (p < batch.length) {
    const tp = readUint()
    if (tp === null) break
    types.push(tp)

    if (NO_SIZE.has(tp)) {
      // skip fields by reading until we hit the next valid message
      // BatchMetadata: uint, uint, uint, int, string — just read them
      if (tp === 81) {
        readUint(); readUint(); readUint(); readUint() // version, pageNo, firstIndex, timestamp(zigzag)
        // string: length-prefixed
        const len = readUint()
        if (len !== null) p += len
      } else if (tp === 82) {
        readUint(); readUint() // partNo, partTotal
      }
      continue
    }

    // Regular message: 3-byte size prefix, skip body
    const size = readSize()
    if (size === null) break
    p += size
  }

  return types
}
const KEEPALIVE_SAFE_RANGE = Math.floor((64 << 10) * 0.8)

let sender: QueueSender | null = null
let writer: BatchWriter | null = null
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let workerStatus: WorkerStatus = WorkerStatus.NotActive

function finalize(skipCompression?: boolean): void {
  if (!writer) {
    return
  }
  writer.finaliseBatch(skipCompression) // TODO: force sendAll?
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
    finalize()
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
    finalize(true)
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
        w.writeMessage(message)
      })
    } else {
      postMessage('not_init')
      initiateRestart()
    }
    return
  }

  if (data.type === 'compressed') {
    if (!sender) {
      console.debug('OR WebWorker: sender not initialised. Compressed batch.')
      initiateRestart()
      return
    }
    data.batch && sender.sendCompressed(data.batch, data.dataType)
  }
  if (data.type === 'uncompressed') {
    if (!sender) {
      console.debug('OR WebWorker: sender not initialised. Uncompressed batch.')
      initiateRestart()
      return
    }
    data.batch && sender.sendUncompressed(data.batch, data.dataType)
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
      (batch, dataType) => {
          postMessage({ type: 'compress', batch, dataType }, [batch.buffer])
      },
      data.pageNo,
    )
    writer = new BatchWriter(
      data.pageNo,
      data.timestamp,
      data.url,
      (batch, skipCompression, dataType = 'player') => {
        if (!sender) return;
        if (skipCompression) {
          sender.sendUncompressed(batch, dataType)
        } else {
          sender.push(batch, dataType)
        }
      },
      data.tabId,
      () => postMessage({ type: 'queue_empty' }),
      data.localDebug ?? false,
      (name, batch) => {
        postMessage({ type: 'local_save', name, batch }, [batch.buffer])
      },
    )
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

    sender.authorise(data.token)
    data.beaconSizeLimit && writer.setBeaconSizeLimit(data.beaconSizeLimit)
    data.protocolVersion && writer.setProtocolVersion(data.protocolVersion)
    return
  }
}
