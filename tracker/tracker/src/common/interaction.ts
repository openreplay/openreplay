import Message from './messages.gen.js'

export interface Options {
  connAttemptCount?: number
  connAttemptGap?: number
}

export type ToWorkerData =
  | null
  | Stop
  | Batch
  | WorkerStart
  | BeaconSizeLimit
  | ToWriterData
  | ForceFlushBatch
  | CheckQueue
  | ResetWriter
  | WriterFinalize

export type FromWorkerData = Restart | Failure | NotInit | Compress | QEmpty | Status | BatchReady

type BatchReady = { type: 'batch_ready'; data: Uint8Array }
type Status = { type: 'status'; data: number }
type Compress = { type: 'compress'; batch: Uint8Array }
type Restart = { type: 'restart' }
type NotInit = { type: 'not_init' }
type Stop = { type: 'stop' }
type Batch = { type: 'batch'; data: Array<Message> }
type ForceFlushBatch = { type: 'forceFlushBatch' }
type CheckQueue = { type: 'check_queue' }
type WriterFinalize = { type: 'writer_finalize' }
type ResetWriter = { type: 'reset_writer' }

type BeaconSizeLimit = {
  type: 'beacon_size_limit'
  data: number
}
type ToWriterData = {
  type: 'to_writer'
  data: Array<Message>
}
type Failure = {
  type: 'failure'
  reason: string
}
type QEmpty = {
  type: 'queue_empty'
}
export type WorkerStart = {
  type: 'start'
  ingestPoint: string
  pageNo: number
  timestamp: number
  url: string
  tabId: string
} & Options
export type WorkerAuth = {
  token: string
  beaconSizeLimit?: number
}
