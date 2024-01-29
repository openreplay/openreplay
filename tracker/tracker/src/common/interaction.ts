import Message from './messages.gen.js'

export interface Options {
  connAttemptCount?: number
  connAttemptGap?: number
}

export type ToWorkerData =
  | null
  | Stop
  | Start
  | Auth
  | Batch
  | BeaconSizeLimit
  | ToWriterData
  | Compressed
  | Uncompressed
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
type Compressed = { type: 'compressed'; batch: Uint8Array }
type Uncompressed = { type: 'uncompressed'; batch: Uint8Array }
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
type Start = {
  type: 'start'
  ingestPoint: string
  pageNo: number
  timestamp: number
  url: string
  tabId: string
} & Options
type Auth = {
  type: 'auth'
  token: string
  beaconSizeLimit?: number
}
