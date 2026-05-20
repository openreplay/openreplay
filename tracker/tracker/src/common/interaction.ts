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
} & Options

type Auth = {
  type: 'auth'
  token: string
  beaconSizeLimit?: number
  protocolVersion?: number
}

export type ToWorkerData =
  | null
  | 'stop'
  | Start
  | Auth
  | Array<Message>
  | { type: 'compressed'; batch: Uint8Array; dataType: DataType; split?: number }
  | { type: 'uncompressed'; batch: Uint8Array; dataType: DataType; split?: number }
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
  | { type: 'compress'; batch: Uint8Array; dataType: DataType; split?: number }
  | QEmpty
  | LocalSave
