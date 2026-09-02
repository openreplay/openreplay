import Message from './messages.gen.js'

export type DataType = 'player' | 'assets' | 'devtools' | 'analytics' | 'visual'

export interface Options {
  connAttemptCount?: number
  connAttemptGap?: number
}

type Start = {
  type: 'start'
  ingestPoint: string
  pageNo: number
  timestamp: number
  url: string
  tabId: string
  localDebug?: boolean
  compressionThreshold?: number
} & Options

type Auth = {
  type: 'auth'
  token: string
  beaconSizeLimit?: number
  protocolVersion?: number
  compressionThreshold?: number
}

export type ToWorkerData =
  | null
  | 'stop'
  | Start
  | Auth
  | Array<Message>
  | 'forceFlushBatch'
  | 'closing'
  | 'check_queue'

type Failure = {
  type: 'failure'
  reason: string
}

type QEmpty = {
  type: 'queue_empty'
}

type LocalSave = {
  type: 'local_save'
  name: string
  batch: Uint8Array
}

export type FromWorkerData =
  | 'a_stop'
  | 'a_start'
  | Failure
  | 'not_init'
  | QEmpty
  | LocalSave
